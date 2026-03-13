# Requirements: pip install diffusers torch transformers accelerate

import argparse
import sys


def check_dependencies():
    missing = []
    for package in ["diffusers", "torch", "transformers", "accelerate"]:
        try:
            __import__(package)
        except ImportError:
            missing.append(package)
    if missing:
        print(f"Error: Missing required packages: {', '.join(missing)}", file=sys.stderr)
        print("Install them with:", file=sys.stderr)
        print("  pip install diffusers torch transformers accelerate", file=sys.stderr)
        sys.exit(1)


def get_device_and_dtype():
    import torch

    if torch.cuda.is_available():
        return "cuda", torch.float16
    elif hasattr(torch.backends, "mps") and torch.backends.mps.is_available():
        return "mps", torch.float16
    else:
        return "cpu", torch.float32


def generate(prompt, output_path, width=512, height=512, steps=4, guidance_scale=1.0, seed=None):
    import torch
    from diffusers import StableDiffusionPipeline, LCMScheduler

    device, dtype = get_device_and_dtype()
    print(f"Using device: {device}")

    if device == "cpu":
        print("Note: CPU inference is slow (~30-60s). A CUDA GPU is much faster (~2-5s).")

    print("Loading model (first run downloads ~2GB base + ~100MB LoRA)...")
    pipe = StableDiffusionPipeline.from_pretrained(
        "stable-diffusion-v1-5/stable-diffusion-v1-5",
        torch_dtype=dtype,
        safety_checker=None,
        requires_safety_checker=False,
    )
    pipe.scheduler = LCMScheduler.from_config(pipe.scheduler.config)
    pipe.load_lora_weights("latent-consistency/lcm-lora-sdv1-5")
    pipe = pipe.to(device)

    generator = None
    if seed is not None:
        gen_device = "cpu" if device == "mps" else device
        generator = torch.Generator(device=gen_device).manual_seed(seed)

    print(f"Generating image: \"{prompt}\" ({width}x{height}, {steps} steps)...")
    result = pipe(
        prompt,
        width=width,
        height=height,
        num_inference_steps=steps,
        guidance_scale=guidance_scale,
        generator=generator,
    )

    image = result.images[0]
    image.save(output_path)
    print(f"File saved to: {output_path}")


if __name__ == "__main__":
    check_dependencies()

    parser = argparse.ArgumentParser(description="Generate images locally with Stable Diffusion")
    parser.add_argument("prompt", help="Text prompt for image generation")
    parser.add_argument("--output", "-o", default="generated_image.png", help="Output file path (default: generated_image.png)")
    parser.add_argument("--width", type=int, default=512, help="Image width, must be multiple of 8 (default: 512)")
    parser.add_argument("--height", type=int, default=512, help="Image height, must be multiple of 8 (default: 512)")
    parser.add_argument("--steps", type=int, default=4, help="Inference steps (default: 4)")
    parser.add_argument("--guidance-scale", type=float, default=1.0, help="Guidance scale (default: 1.0, LCM works best with 1.0)")
    parser.add_argument("--seed", type=int, default=None, help="Random seed for reproducibility")
    args = parser.parse_args()

    if args.width <= 0 or args.height <= 0 or args.width % 8 != 0 or args.height % 8 != 0:
        print("Error: Width and height must be positive multiples of 8.", file=sys.stderr)
        sys.exit(1)

    if args.steps <= 0:
        print("Error: Steps must be a positive integer.", file=sys.stderr)
        sys.exit(1)

    generate(args.prompt, args.output, args.width, args.height, args.steps, args.guidance_scale, args.seed)
