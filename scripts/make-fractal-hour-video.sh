#!/usr/bin/env bash
# Generate a 2-minute Mandelbrot zoom, loop to 1 hour, mux WAV audio.
#
# Usage:
#   ./scripts/make-fractal-hour-video.sh --audio /path/to/track.wav
#   ./scripts/make-fractal-hour-video.sh --audio https://example.com/track.wav
#
# Options:
#   --audio PATH|URL   Required. WAV (or any ffmpeg-supported audio).
#   --output-dir DIR   Default: video/output
#   --width N          Default: 1280
#   --height N         Default: 720
#   --fps N            Default: 24
#   --clip-seconds N   Fractal clip length (default: 120)
#   --total-seconds N  Final length (default: 3600)
#   --skip-fractal     Reuse existing fractal-2min.mp4 in output dir

set -euo pipefail

AUDIO=""
OUTPUT_DIR="video/output"
WIDTH=1280
HEIGHT=720
FPS=24
CLIP_SECONDS=120
TOTAL_SECONDS=3600
SKIP_FRACTAL=0
USE_FFMPEG_FRACTAL=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --audio)
      AUDIO="${2:?--audio requires a path or URL}"
      shift 2
      ;;
    --output-dir)
      OUTPUT_DIR="${2:?}"
      shift 2
      ;;
    --width)
      WIDTH="${2:?}"
      shift 2
      ;;
    --height)
      HEIGHT="${2:?}"
      shift 2
      ;;
    --fps)
      FPS="${2:?}"
      shift 2
      ;;
    --clip-seconds)
      CLIP_SECONDS="${2:?}"
      shift 2
      ;;
    --total-seconds)
      TOTAL_SECONDS="${2:?}"
      shift 2
      ;;
    --skip-fractal)
      SKIP_FRACTAL=1
      shift
      ;;
    --use-ffmpeg-fractal)
      USE_FFMPEG_FRACTAL=1
      shift
      ;;
    -h|--help)
      sed -n '2,14p' "$0"
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      exit 1
      ;;
  esac
done

if [[ -z "$AUDIO" ]]; then
  echo "Error: --audio is required (path or URL to a WAV file)." >&2
  exit 1
fi

if ! command -v ffmpeg >/dev/null 2>&1; then
  echo "Error: ffmpeg not found. Install with: brew install ffmpeg" >&2
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$ROOT"
mkdir -p "$OUTPUT_DIR"
PYTHON="${ROOT}/.venv-video/bin/python"

FRACTAL_CLIP="$OUTPUT_DIR/fractal-2min.mp4"
LOOPED_SILENT="$OUTPUT_DIR/fractal-1hr-silent.mp4"
FINAL="$OUTPUT_DIR/fractal-1hr-with-audio.mp4"
AUDIO_LOCAL="$OUTPUT_DIR/audio-source.wav"

resolve_audio() {
  if [[ "$AUDIO" =~ ^https?:// ]]; then
    echo "Downloading audio..."
    curl -fsSL "$AUDIO" -o "$AUDIO_LOCAL"
  elif [[ -f "$AUDIO" ]]; then
    cp "$AUDIO" "$AUDIO_LOCAL"
  else
    echo "Error: audio not found: $AUDIO" >&2
    exit 1
  fi
}

if [[ "$SKIP_FRACTAL" -eq 0 ]]; then
  echo "==> Rendering ${CLIP_SECONDS}s Mandelbrot fractal (${WIDTH}x${HEIGHT} @ ${FPS}fps)..."
  if [[ "$USE_FFMPEG_FRACTAL" -eq 1 ]]; then
    ffmpeg -y -hide_banner -loglevel warning -stats \
      -f lavfi -i "mandelbrot=size=${WIDTH}x${HEIGHT}:rate=${FPS}:maxiter=128:start_x=-0.743643887037151:start_y=0.13182590420531175:start_scale=3.5:end_scale=0.000015:end_pts=${CLIP_SECONDS}" \
      -t "$CLIP_SECONDS" \
      -c:v libx264 -preset medium -crf 20 -pix_fmt yuv420p \
      "$FRACTAL_CLIP"
  else
    [[ -x "$PYTHON" ]] || { echo "Run: python3 -m venv .venv-video && .venv-video/bin/pip install numpy imageio imageio-ffmpeg pillow"; exit 1; }
    "$PYTHON" "$SCRIPT_DIR/render_fractal_clip.py" \
      --output "$FRACTAL_CLIP" \
      --width "$WIDTH" --height "$HEIGHT" \
      --fps "$FPS" --seconds "$CLIP_SECONDS"
  fi
else
  echo "==> Skipping fractal render (using $FRACTAL_CLIP)"
  [[ -f "$FRACTAL_CLIP" ]] || { echo "Missing $FRACTAL_CLIP"; exit 1; }
fi

LOOPS=$(( (TOTAL_SECONDS + CLIP_SECONDS - 1) / CLIP_SECONDS - 1 ))
echo "==> Looping clip ${LOOPS} extra times (${CLIP_SECONDS}s x $((LOOPS + 1)) ≈ ${TOTAL_SECONDS}s)..."
ffmpeg -y -hide_banner -loglevel warning -stats \
  -stream_loop "$LOOPS" -i "$FRACTAL_CLIP" \
  -t "$TOTAL_SECONDS" \
  -c:v copy \
  "$LOOPED_SILENT"

resolve_audio

echo "==> Muxing audio (loops audio if shorter than ${TOTAL_SECONDS}s)..."
ffmpeg -y -hide_banner -loglevel warning -stats \
  -i "$LOOPED_SILENT" \
  -stream_loop -1 -i "$AUDIO_LOCAL" \
  -map 0:v:0 -map 1:a:0 \
  -t "$TOTAL_SECONDS" \
  -c:v copy -c:a aac -b:a 192k \
  "$FINAL"

echo ""
echo "Done."
echo "  Fractal clip:  $FRACTAL_CLIP"
echo "  Silent hour:   $LOOPED_SILENT"
echo "  Final video:   $FINAL"
ffprobe -hide_banner "$FINAL" 2>&1 | grep -E 'Duration|Video|Audio' || true
