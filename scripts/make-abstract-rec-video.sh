#!/usr/bin/env bash
# Build a soft ink/paper abstract spiral loop, stretch it to the audio length, mux.
#
# Usage:
#   ./scripts/make-abstract-rec-video.sh --audio "/path/to/REC002.WAV"
#   ./scripts/make-abstract-rec-video.sh --audio "/path/to/REC002.WAV" --output video/output/rec002-abstract.mp4
#
set -euo pipefail

AUDIO=""
OUTPUT="video/output/rec002-abstract.mp4"
WIDTH=1280
HEIGHT=720
FPS=30
CLIP_SECONDS=16
SKIP_CLIP=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --audio) AUDIO="${2:?}"; shift 2 ;;
    --output) OUTPUT="${2:?}"; shift 2 ;;
    --width) WIDTH="${2:?}"; shift 2 ;;
    --height) HEIGHT="${2:?}"; shift 2 ;;
    --fps) FPS="${2:?}"; shift 2 ;;
    --clip-seconds) CLIP_SECONDS="${2:?}"; shift 2 ;;
    --skip-clip) SKIP_CLIP=1; shift ;;
    -h|--help)
      sed -n '2,8p' "$0"
      exit 0
      ;;
    *) echo "Unknown option: $1" >&2; exit 1 ;;
  esac
done

if [[ -z "$AUDIO" || ! -f "$AUDIO" ]]; then
  echo "Error: --audio PATH is required and must exist." >&2
  exit 1
fi
command -v ffmpeg >/dev/null || { echo "ffmpeg required" >&2; exit 1; }
command -v ffprobe >/dev/null || { echo "ffprobe required" >&2; exit 1; }

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$ROOT"

OUT_DIR="$(dirname "$OUTPUT")"
mkdir -p "$OUT_DIR"
CLIP="$OUT_DIR/abstract-ink-clip.mp4"
POSTER="${OUTPUT%.mp4}.jpg"

DURATION="$(ffprobe -v error -show_entries format=duration -of default=nw=1:nk=1 "$AUDIO")"
DURATION_INT="$(python3 - <<PY
import math
print(max(1, int(math.ceil(float("$DURATION"))))
)
PY
)"

echo "==> Audio duration: ${DURATION}s (render ${DURATION_INT}s)"

if [[ "$SKIP_CLIP" -eq 0 ]]; then
  echo "==> Rendering ${CLIP_SECONDS}s ink spiral (${WIDTH}x${HEIGHT} @ ${FPS}fps)..."
  ffmpeg -y -hide_banner -loglevel warning -stats \
    -f lavfi -i "gradients=s=${WIDTH}x${HEIGHT}:r=${FPS}:t=spiral:n=5:c0=0x0a0a0c:c1=0x243832:c2=0xe6ddd0:c3=0x5a7a68:c4=0x121614:speed=0.018:d=${CLIP_SECONDS}" \
    -vf "gblur=sigma=14,eq=contrast=1.08:saturation=0.9,format=yuv420p" \
    -t "$CLIP_SECONDS" \
    -c:v libx264 -preset medium -crf 20 -pix_fmt yuv420p \
    "$CLIP"
else
  [[ -f "$CLIP" ]] || { echo "Missing $CLIP"; exit 1; }
fi

LOOPS=$(( (DURATION_INT + CLIP_SECONDS - 1) / CLIP_SECONDS ))
echo "==> Looping clip ~${LOOPS} times to cover audio..."
ffmpeg -y -hide_banner -loglevel warning -stats \
  -stream_loop "$((LOOPS))" -i "$CLIP" \
  -i "$AUDIO" \
  -map 0:v:0 -map 1:a:0 \
  -t "$DURATION" \
  -c:v libx264 -preset medium -crf 20 -pix_fmt yuv420p \
  -c:a aac -b:a 256k \
  "$OUTPUT"

ffmpeg -y -hide_banner -loglevel error -ss 8 -i "$OUTPUT" -frames:v 1 -q:v 3 "$POSTER"

echo ""
echo "Done."
echo "  Clip:   $CLIP"
echo "  Video:  $OUTPUT"
echo "  Poster: $POSTER"
ffprobe -hide_banner "$OUTPUT" 2>&1 | grep -E 'Duration|Video|Audio' || true
