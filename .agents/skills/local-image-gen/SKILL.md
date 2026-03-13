---
name: local-image-gen
description: >
  Generate images locally using a free, open-source Stable Diffusion model.
  No API key, no account, no cost. Use this skill when the user asks to
  generate, create, or produce an image locally without an API key,
  or when they want a free alternative to cloud-based image generation.
  Triggers on requests like "generate an image locally", "create a free image",
  or any local image generation task.
---

# Local Image Generation

## Setup

Requires `diffusers`, `torch`, `transformers`, and `accelerate` packages:
```
pip install diffusers torch transformers accelerate
```

No API key or account is needed. The model (SD 1.5 + LCM-LoRA, ~2GB) is downloaded automatically on first run from Hugging Face.

## Usage

Run the bundled script to generate images:

```bash
python <skill-path>/scripts/generate_image_local.py "your prompt here" --output path/to/output.png
```

### Parameters

| Flag | Default | Description |
|------|---------|-------------|
| `prompt` (positional) | required | Text description of the image to generate |
| `--output`, `-o` | `generated_image.png` | Output file path (always PNG) |
| `--width` | `512` | Image width in pixels (must be a multiple of 8) |
| `--height` | `512` | Image height in pixels (must be a multiple of 8) |
| `--steps` | `4` | Number of inference steps (more = better quality but slower) |
| `--guidance-scale` | `1.0` | Guidance scale (LCM works best at 1.0) |
| `--seed` | random | Optional seed for reproducible results |

### Key Rules

- The first run downloads the model (~2GB base + ~100MB LoRA) which may take a few minutes.
- On CPU, expect ~30-60 seconds per image. On a CUDA GPU, expect ~2-5 seconds.
- Image quality is lower than cloud APIs but fully adequate for demonstrations.
- Always use the default 512x512 unless the user explicitly requests a different size.
- Output is always PNG format.
