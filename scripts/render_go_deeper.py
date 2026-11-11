#!/usr/bin/env python3
"""Computer-room set video. The room loop glitches. The neon sign does not.

The sign reads "Go Deeper" and is composited after the glitch, so it stays
put while the footage tears. The loop is then repeated under the set audio.

  .venv-video/bin/python scripts/render_go_deeper.py --stills
  .venv-video/bin/python scripts/render_go_deeper.py \\
      --audio /path/to/nevertoodeep2dubstep.WAV
"""

from __future__ import annotations

import argparse
import subprocess
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

WIDTH = 1920
HEIGHT = 1080
FPS = 30

FONT_PATH = "/System/Library/Fonts/Avenir Next.ttc"
FONT_INDEX = 10  # Ultra Light, so the letters read as neon tubes

# Hung in the rainy window, left of the monitors.
SIGN_CENTER = (0.30, 0.27)
SIGN_WIDTH = 0.46  # "GO DEEPER" as a fraction of the frame width
SIGN_TEXT = "GO DEEPER"

# Vacancy-board neon: white-hot tube, red bloom, black panel.
HOT = np.array([1.00, 0.86, 0.82], np.float32)
TIGHT_COLOR = np.array([1.00, 0.28, 0.22], np.float32)
MID_COLOR = np.array([1.00, 0.03, 0.025], np.float32)
OUTER_COLOR = np.array([0.62, 0.0, 0.015], np.float32)
BOARD_COLOR = np.array([0.012, 0.0, 0.004], np.float32)

# Room glitches. Quiet at both ends so the loop seam stays clean.
# start seconds, duration, amount 0..1. Tuned for a 21.1s plate.
GLITCHES = [
    (1.15, 0.18, 0.62),
    (3.35, 0.14, 0.42),
    (5.02, 0.40, 1.0),
    (7.65, 0.14, 0.38),
    (9.30, 0.30, 0.78),
    (12.05, 0.16, 0.5),
    (14.35, 0.44, 1.0),
    (16.80, 0.16, 0.48),
    (18.50, 0.32, 0.82),
]


def overlaps(frame, fps, start, dur):
    t0 = frame / fps
    return t0 < start + dur and (t0 + 1.0 / fps) > start


def glitch_amount(frame, fps):
    amount = 0.0
    for start, dur, amp in GLITCHES:
        if overlaps(frame, fps, start, dur):
            amount = max(amount, amp)
    return amount


def load_font(size):
    return ImageFont.truetype(FONT_PATH, size, index=FONT_INDEX)


def text_width(font, text, tracking):
    widths = [font.getlength(ch) for ch in text]
    return widths, sum(widths) + tracking * (len(text) - 1)


def fit_font(target_width):
    lo, hi = 40, 500
    best = 120
    while lo <= hi:
        mid = (lo + hi) // 2
        font = load_font(mid)
        tracking = mid * 0.08
        _, total = text_width(font, SIGN_TEXT, tracking)
        if total <= target_width:
            best = mid
            lo = mid + 1
        else:
            hi = mid - 1
    return best


def blur_l(img, radius, wide=False):
    if radius <= 0:
        return np.asarray(img, np.float32) / 255.0
    if wide:
        small = img.resize((max(1, img.width // 2), max(1, img.height // 2)), Image.Resampling.BOX)
        blurred = small.filter(ImageFilter.GaussianBlur(radius=radius / 2.0))
        blurred = blurred.resize(img.size, Image.Resampling.BILINEAR)
    else:
        blurred = img.filter(ImageFilter.GaussianBlur(radius=radius))
    return np.asarray(blurred, np.float32) / 255.0


def build_sign(width, height):
    """Tube neon on a black board, like a vacancy sign. Constant every frame."""
    scale = 2
    size = fit_font(int(width * SIGN_WIDTH))
    font = load_font(size * scale)
    tracking = size * scale * 0.08
    widths, total = text_width(font, SIGN_TEXT, tracking)
    ascent, descent = font.getmetrics()
    cx = SIGN_CENTER[0] * width * scale
    cy = SIGN_CENTER[1] * height * scale
    x = cx - total / 2.0
    baseline = cy + (ascent - descent) / 2.0

    mask = Image.new("L", (width * scale, height * scale), 0)
    draw = ImageDraw.Draw(mask)
    for ch, ch_w in zip(SIGN_TEXT, widths):
        draw.text((x, baseline), ch, font=font, fill=255, anchor="ls")
        x += ch_w + tracking
    # Ultra Light is a hairline. Thicken it into a glass tube.
    mask = mask.filter(ImageFilter.MaxFilter(7))
    mask = mask.resize((width, height), Image.Resampling.LANCZOS)

    core = blur_l(mask, 0.4)
    tight = blur_l(mask, 1.8)
    mid = blur_l(mask, 7.0)
    wide = blur_l(mask, 32.0, wide=True)
    glow = (
        wide[..., None] * OUTER_COLOR * 1.15
        + mid[..., None] * MID_COLOR * 0.72
        + tight[..., None] * TIGHT_COLOR * 0.42
    ).astype(np.float32)
    hot = np.clip((core - 0.22) / 0.78, 0.0, 1.0).astype(np.float32)

    ys, xs = np.where(core > 0.12)
    board = np.zeros((height, width), np.float32)
    if len(xs):
        pad_x = int(width * 0.028)
        pad_y = int((ys.max() - ys.min()) * 0.42)
        x0 = max(0, int(xs.min()) - pad_x)
        x1 = min(width, int(xs.max()) + pad_x)
        y0 = max(0, int(ys.min()) - pad_y)
        y1 = min(height, int(ys.max()) + pad_y)
        board[y0:y1, x0:x1] = 1.0
        print(f"sign font {size}px  board {x0},{y0} {x1}x{y1}", flush=True)
    return glow, hot, board


def glitch_frame(frame, amount, frame_i):
    if amount < 0.04:
        return frame
    rng = np.random.default_rng(frame_i * 17 + 3)
    dx = max(1, int(round(amount * 14)))
    out = frame.copy()
    out[..., 0] = np.roll(frame[..., 0], dx, axis=1)
    out[..., 1] = np.roll(frame[..., 1], -dx // 2, axis=1)
    out[..., 2] = np.roll(frame[..., 2], -dx, axis=1)
    h = out.shape[0]
    n = int(3 + amount * 10)
    for _ in range(n):
        bh = int(rng.integers(2, max(3, int(6 + amount * 36))))
        y0 = int(rng.integers(0, max(1, h - bh)))
        shift = int(rng.integers(-int(12 + amount * 110), int(12 + amount * 110) + 1))
        if shift == 0:
            continue
        y1 = min(h, y0 + bh)
        out[y0:y1] = np.roll(out[y0:y1], shift, axis=1)
    if amount > 0.8 and frame_i % 2 == 0:
        kick = int(28 * amount) * (1 if (frame_i // 2) % 2 == 0 else -1)
        out = np.roll(out, kick, axis=1)
    if amount > 0.7:
        out[::4] = out[::4] * 0.72 + np.array([0.08, 0.02, 0.03], np.float32) * 0.28
    return out


def composite(plate, glow, hot, board):
    cover = board[..., None]
    out = plate * (1.0 - cover) + BOARD_COLOR * cover
    # The panel catches the tube light, the way a vacancy sign's board does.
    out += glow * (0.55 + 0.9 * cover)
    out += hot[..., None] * HOT
    np.clip(out, 0.0, 1.0, out=out)
    return out


def plate_vf():
    # Corner credit sits on the dark floor. Cover it before the glitch.
    return "scale=1920:1080:flags=lanczos,delogo=x=1664:y=1036:w=246:h=42"


def decode_cmd(path):
    return [
        "ffmpeg", "-v", "error", "-i", str(path),
        "-vf", plate_vf(),
        "-f", "rawvideo", "-pix_fmt", "rgb24", "pipe:1",
    ]


def encode_cmd(path, fps):
    return [
        "ffmpeg", "-y", "-hide_banner", "-loglevel", "error",
        "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{WIDTH}x{HEIGHT}", "-r", str(fps),
        "-i", "pipe:0", "-an",
        "-c:v", "libx264", "-preset", "slow", "-crf", "18",
        "-pix_fmt", "yuv420p", "-tune", "film",
        "-g", str(fps), "-keyint_min", str(fps),
        "-movflags", "+faststart",
        str(path),
    ]


def render_loop(plate, loop_path, glow, hot, board, fps):
    loop_path = Path(loop_path)
    loop_path.parent.mkdir(parents=True, exist_ok=True)
    print("glitching the room loop...", flush=True)
    dec = subprocess.Popen(decode_cmd(plate), stdout=subprocess.PIPE)
    enc = subprocess.Popen(encode_cmd(loop_path, fps), stdin=subprocess.PIPE)
    nbytes = WIDTH * HEIGHT * 3
    i = 0
    try:
        while True:
            raw = dec.stdout.read(nbytes)
            if len(raw) < nbytes:
                break
            frame = np.frombuffer(raw, np.uint8).reshape(HEIGHT, WIDTH, 3).astype(np.float32) / 255.0
            amount = glitch_amount(i, fps)
            frame = glitch_frame(frame, amount, i)
            image = composite(frame, glow, hot, board)
            enc.stdin.write((image * 255.0).astype(np.uint8).tobytes())
            if i % fps == 0:
                print(f"frame {i + 1}", flush=True)
            i += 1
        print(f"frame {i}/{i}", flush=True)
    finally:
        dec.stdout.close()
        dec.wait()
        enc.stdin.close()
        code = enc.wait()
    if code != 0 or dec.returncode not in (0, None) or i < 600:
        raise SystemExit(f"render failed (frames={i}, decode={dec.returncode}, encode={code})")
    return loop_path


def grab_frame(plate, frame_i, fps):
    t = frame_i / fps
    proc = subprocess.run(
        [
            "ffmpeg", "-v", "error", "-ss", f"{t:.4f}", "-i", str(plate),
            "-vf", plate_vf(), "-frames:v", "1",
            "-f", "rawvideo", "-pix_fmt", "rgb24", "pipe:1",
        ],
        check=True, capture_output=True,
    )
    raw = proc.stdout
    if len(raw) < WIDTH * HEIGHT * 3:
        raise SystemExit(f"could not read frame at {t:.2f}s")
    return np.frombuffer(raw, np.uint8).reshape(HEIGHT, WIDTH, 3).astype(np.float32) / 255.0


def write_stills(directory, plate, glow, hot, board, fps):
    directory = Path(directory)
    directory.mkdir(parents=True, exist_ok=True)
    samples = [("steady", 12), ("glitch", 154), ("tear", 436)]
    thumbs = []
    for name, frame_i in samples:
        plate_frame = grab_frame(plate, frame_i, fps)
        amount = glitch_amount(frame_i, fps)
        image = composite(glitch_frame(plate_frame, amount, frame_i), glow, hot, board)
        dest = directory / f"{name}.png"
        Image.fromarray((image * 255.0).astype(np.uint8)).save(dest)
        print(f"{dest}  glitch={amount:.2f}", flush=True)
        thumb = Image.fromarray((image * 255.0).astype(np.uint8)).resize((640, 360), Image.Resampling.LANCZOS)
        thumbs.append((f"{name} {amount:.2f}", thumb))
    sheet = Image.new("RGB", (640, 360 * len(thumbs)), (0, 0, 0))
    for i, (label, thumb) in enumerate(thumbs):
        sheet.paste(thumb, (0, i * 360))
    sheet_path = directory / "sheet.png"
    sheet.save(sheet_path)
    print(sheet_path, flush=True)


def probe_duration(path):
    out = subprocess.check_output(
        [
            "ffprobe", "-v", "error", "-show_entries", "format=duration",
            "-of", "default=nw=1:nk=1", str(path),
        ],
        text=True,
    )
    return float(out.strip())


def mux(loop_path, audio, output):
    output = Path(output)
    output.parent.mkdir(parents=True, exist_ok=True)
    poster = output.with_suffix(".jpg")
    duration = probe_duration(audio)
    print(f"muxing {duration:.1f}s of audio...", flush=True)
    subprocess.check_call(
        [
            "ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-stats",
            "-stream_loop", "-1", "-i", str(loop_path),
            "-i", str(audio),
            "-map", "0:v:0", "-map", "1:a:0",
            "-t", f"{duration:.3f}",
            "-c:v", "copy",
            "-c:a", "aac", "-b:a", "320k",
            "-movflags", "+faststart",
            str(output),
        ]
    )
    subprocess.check_call(
        [
            "ffmpeg", "-y", "-hide_banner", "-loglevel", "error",
            "-ss", "0.5", "-i", str(loop_path),
            "-frames:v", "1", "-q:v", "2", str(poster),
        ]
    )
    print(output)
    print(poster)


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--plate", default="/Users/jpittman/Downloads/150883-799711528.mp4")
    p.add_argument("--audio", help="Set audio to mux under the loop")
    p.add_argument("--output", default="video/output/go-deeper.mp4")
    p.add_argument("--loop", default="video/output/go-deeper-loop.mp4")
    p.add_argument("--stills", action="store_true")
    p.add_argument("--still-dir", default="video/output/go-deeper-stills")
    p.add_argument("--skip-render", action="store_true")
    p.add_argument("--fps", type=int, default=FPS)
    args = p.parse_args()

    if args.skip_render:
        if not args.audio:
            raise SystemExit("--audio is required to mux")
        mux(args.loop, args.audio, args.output)
        return

    glow, hot, board = build_sign(WIDTH, HEIGHT)
    if args.stills:
        write_stills(args.still_dir, args.plate, glow, hot, board, args.fps)
        return

    render_loop(args.plate, args.loop, glow, hot, board, args.fps)
    print(args.loop)
    if args.audio:
        mux(args.loop, args.audio, args.output)


if __name__ == "__main__":
    main()
