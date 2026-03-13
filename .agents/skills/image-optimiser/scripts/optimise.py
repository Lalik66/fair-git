#!/usr/bin/env python3
"""Optimise an image for web hero sections: resize to max 1024px width, convert to WebP."""

import argparse
import sys
from pathlib import Path

try:
    from PIL import Image
except ImportError:
    print("Error: Pillow is required. Install with: pip install Pillow")
    sys.exit(1)


def optimise_image(input_path: str, output_dir: str, max_width: int = 1024, quality: int = 85) -> str:
    src = Path(input_path)
    if not src.exists():
        print(f"Error: File not found: {src}")
        sys.exit(1)

    out_dir = Path(output_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    output_path = out_dir / f"{src.stem}.webp"

    with Image.open(src) as img:
        # Convert to RGB if necessary (e.g. RGBA PNGs, palette images)
        if img.mode in ("RGBA", "LA"):
            # Preserve transparency for WebP
            pass
        elif img.mode != "RGB":
            img = img.convert("RGB")

        # Resize maintaining aspect ratio if wider than max_width
        if img.width > max_width:
            ratio = max_width / img.width
            new_height = int(img.height * ratio)
            img = img.resize((max_width, new_height), Image.LANCZOS)

        img.save(output_path, "WEBP", quality=quality, method=6)

    print(f"Saved: {output_path} ({output_path.stat().st_size // 1024}KB)")
    return str(output_path)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Optimise image for web hero sections")
    parser.add_argument("input", help="Path to the source image")
    parser.add_argument("--output-dir", default="public/assets", help="Output directory (default: public/assets)")
    parser.add_argument("--max-width", type=int, default=1024, help="Max width in pixels (default: 1024)")
    parser.add_argument("--quality", type=int, default=85, help="WebP quality 1-100 (default: 85)")
    args = parser.parse_args()

    optimise_image(args.input, args.output_dir, args.max_width, args.quality)
