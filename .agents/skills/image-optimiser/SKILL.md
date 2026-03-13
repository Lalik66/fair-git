---
name: image-optimiser
description: >
  Optimise images for website hero sections. Use this skill when the user wants to
  optimise, resize, compress, or convert an image for use on a website, especially
  hero sections. Triggers on requests like "optimise this image", "resize for hero",
  "convert to webp", "make this image web-ready", or when given a local image path
  to prepare for web use.
---

# Image Optimiser

Optimise local images for website hero sections by resizing and converting to WebP.

## Workflow

1. User provides a local file path to an image
2. Run the optimise script to resize (max 1024px width, aspect ratio preserved) and convert to WebP
3. Output is saved to `public/assets/`

## Usage

Run the bundled script from the project root:

```bash
python .claude/skills/image-optimiser/scripts/optimise.py <image-path>
```

Optional flags:
- `--output-dir <dir>` - Change output directory (default: `public/assets`)
- `--max-width <px>` - Change max width (default: 1024)
- `--quality <1-100>` - Change WebP quality (default: 85)

## Requirements

- Python 3
- Pillow (`pip install Pillow`)
