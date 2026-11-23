# Linturo Video Branding Script

## Overview
This script creates a branded video with Linturo graphics for social media sharing.

## Usage
```bash
./scripts/video/create-linturo-branded-video.sh
```

## Output
- Creates a 5-minute branded video at `output/linturo-5min-branded.mp4`
- Resolution: 1024x1024 (optimized for social media)
- Includes:
  - Opening fade-in Linturo card (2 seconds)
  - Main content with logo watermark in top right (5 minutes)
  - Closing fade-out Linturo card (2 seconds)

## Requirements
- FFmpeg must be installed
- Input video: `design/street-runner.mp4`
- Logo: `design/linturo-logo-glitch.png`

## Customization
Edit the script variables to customize:
- `DURATION` - Length of main content (default: 300 seconds / 5 minutes)
- Logo size and position
- Fade durations
- Output quality (CRF value)
