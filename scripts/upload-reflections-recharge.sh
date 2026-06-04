#!/usr/bin/env bash
# Upload Reflections and Recharge mixes to S3 and apply CORS.
# If uploads fail with RequestTimeTooSkewed, sync Mac clock:
#   System Settings → General → Date & Time → Set time automatically

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "==> Applying bucket CORS..."
aws s3api put-bucket-cors \
  --bucket linturomusic \
  --cors-configuration file://scripts/s3-cors.json

echo "==> Uploading reflections.WAV..."
aws s3 cp "$HOME/Desktop/reflections.WAV" s3://linturomusic/reflections.WAV \
  --content-type "audio/wav"

echo "==> Uploading recharge.WAV..."
aws s3 cp "$HOME/Desktop/recharge.WAV" s3://linturomusic/recharge.WAV \
  --content-type "audio/wav"

echo "==> Verifying public access..."
curl -sI -H "Origin: https://linturomusic.com" \
  "https://linturomusic.s3.us-west-2.amazonaws.com/reflections.WAV" | head -5
curl -sI -H "Origin: https://linturomusic.com" \
  "https://linturomusic.s3.us-west-2.amazonaws.com/recharge.WAV" | head -5

echo "Done."
