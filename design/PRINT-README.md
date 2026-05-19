# linturo business card — print upload guide

## Files to upload (`print-ready/`)

| File | Use when |
|------|----------|
| `linturo-business-card-front.pdf` | Site asks for **front** artwork (PDF) |
| `linturo-business-card-back.pdf` | Site asks for **back** artwork (PDF) |
| `linturo-business-card-2page.pdf` | Site accepts one PDF with **both sides** (page 1 = front) |
| `linturo-business-card-front.png` | Site asks for **front** image |
| `linturo-business-card-back.png` | Site asks for **back** image |

## Specs (matches most US print shops)

- **Finished size:** 3.5″ × 2″
- **Bleed:** 0.125″ on all sides (files are **3.75″ × 2.25″**)
- **Resolution:** PNGs are 1125 × 675 px (300 DPI at bleed size)
- **Format:** PDF preferred; PNG accepted by many sites

## Common print sites

**Moo / VistaPrint / PrintPlace**
1. Choose standard US business card (3.5″ × 2″).
2. Upload **front** → `linturo-business-card-front.pdf`
3. Upload **back** → `linturo-business-card-back.pdf`
4. If asked for bleed: files already include 0.125″ bleed—select “artwork includes bleed” if offered.

## Regenerate files

```bash
cd design
chmod +x export-business-card.sh
./export-business-card.sh
```

Requires Google Chrome. Re-run after any design change in `business-card-print.html`.
