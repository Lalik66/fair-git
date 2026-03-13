---
name: image-generator
description: Generate images using Google's Gemini Nano Pro model (gemini-3-pro-image-preview). Use this skill when the user asks to generate, create, or produce an image, illustration, picture, photo, artwork, graphic, icon, or visual. Triggers on requests like "generate an image of...", "create a picture of...", "make me an illustration of...", or any image creation task.
---

# Image Generator

Generate images via the Gemini Nano Pro model (`gemini-3-pro-image-preview`) using `scripts/generate_image.py`.

## Prerequisites

Install the Google GenAI SDK if not already installed:

```bash
pip install google-genai
```

The `GEMINI_API_KEY` environment variable must be set (already configured in `.env`).

## Usage

Run the script from the project root:

```bash
python <skill-path>/scripts/generate_image.py --prompt "DESCRIPTION" [--size SIZE] [--aspect RATIO] [--filename NAME] [--output-dir DIR]
```

### Parameters

| Parameter      | Default                    | Options                            |
|----------------|----------------------------|------------------------------------|
| `--prompt`     | *(required)*               | Text description of the image      |
| `--size`       | `1K`                       | `1K`, `2K`, `4K`                   |
| `--aspect`     | `1:1`                      | `1:1`, `3:4`, `4:3`, `9:16`, `16:9`|
| `--filename`   | auto-generated from prompt | Custom filename (no extension)     |
| `--output-dir` | `public/generated-images`  | Custom output directory            |

### Defaults

- **Size**: Always use `1K` unless the user explicitly requests higher resolution.
- **Aspect ratio**: Always use `1:1` (square) unless the user specifies otherwise.
- **Output directory**: Always save to `public/generated-images`.

### Examples

Basic generation (square, 1K):
```bash
python <skill-path>/scripts/generate_image.py --prompt "A golden retriever playing in autumn leaves"
```

Custom resolution and aspect ratio:
```bash
python <skill-path>/scripts/generate_image.py --prompt "A futuristic cityscape at night" --size 4K --aspect 16:9
```

Custom filename:
```bash
python <skill-path>/scripts/generate_image.py --prompt "Company logo with abstract shapes" --filename company-logo
```

Portrait orientation:
```bash
python <skill-path>/scripts/generate_image.py --prompt "A tall lighthouse on a cliff" --aspect 9:16
```

## After Generation

- The saved file path is printed to stdout.
- Images are saved in `public/generated-images/` and accessible at `/generated-images/<filename>` in the Next.js app.
- If no image is returned by the model, a warning is printed to stderr.
