#!/bin/bash
# Export linturo business card files for print sites (Moo, VistaPrint, PrintPlace, etc.)
set -euo pipefail

DIR="$(cd "$(dirname "$0")" && pwd)"
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
OUT="${DIR}/print-ready"
# 300 DPI for 3.75" x 2.25" (with bleed)
PNG_W=1125
PNG_H=675

mkdir -p "$OUT"

if [[ ! -x "$CHROME" ]]; then
  echo "Google Chrome not found at: $CHROME"
  exit 1
fi

CHROME_FLAGS=(
  --headless=new
  --disable-gpu
  --run-all-compositor-stages-before-draw
  --virtual-time-budget=5000
)

export_pdf() {
  local html="$1"
  local pdf="$2"
  "$CHROME" "${CHROME_FLAGS[@]}" --no-pdf-header-footer \
    --print-to-pdf="$pdf" "file://${html}"
}

export_png() {
  local html="$1"
  local png="$2"
  "$CHROME" "${CHROME_FLAGS[@]}" \
    --window-size="${PNG_W},${PNG_H}" \
    --screenshot="$png" \
    --default-background-color=00000000 \
    --hide-scrollbars \
    "file://${html}"
}

echo "Exporting PDFs..."
export_pdf "${DIR}/business-card-print.html" "${OUT}/linturo-business-card-2page.pdf"
export_pdf "${DIR}/business-card-front-only.html" "${OUT}/linturo-business-card-front.pdf"
export_pdf "${DIR}/business-card-back-only.html" "${OUT}/linturo-business-card-back.pdf"

echo "Exporting 300 DPI PNGs (1125×675 px, with bleed)..."
export_png "${DIR}/business-card-front-only.html" "${OUT}/linturo-business-card-front.png"
export_png "${DIR}/business-card-back-only.html" "${OUT}/linturo-business-card-back.png"

echo ""
echo "Print-ready files:"
ls -lh "$OUT"
echo ""
echo "Upload linturo-business-card-front.pdf + linturo-business-card-back.pdf"
echo "  OR the PNG versions if the site prefers images."
