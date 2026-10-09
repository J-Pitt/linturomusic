#!/usr/bin/env python3
"""Seamless RGB-glitch loop of the cat head, timed like the linturo logo glitch.

Keeps the art as drawn — black cat on a near-white field — and sits clean
between hits. Bursts land every 1.25s with a two-frame peak and a ~0.3s decay,
the cadence measured off public/linturo-glitch-preview.mp4.
"""

from __future__ import annotations

import argparse
import subprocess
from pathlib import Path

import numpy as np
from PIL import Image

HERE = Path(__file__).resolve().parent
DEFAULT_IMAGE = HERE / "assets" / "cathead.jpeg"

FIELD = np.array([0.957, 0.953, 0.965], np.float32)

# Measured off the logo preview: hits 1.25s apart, saturation peaking for two
# frames then decaying back to baseline over roughly a third of a second.
GLITCH_PERIOD = 1.25
GLITCH_HOLD = 0.08
GLITCH_TAU = 0.117


def _to_img(a):
    return Image.fromarray((np.clip(a, 0, 1) * 255).astype(np.uint8))


def smoothstep(e0, e1, x):
    t = np.clip((x - e0) / (e1 - e0), 0.0, 1.0)
    return t * t * (3.0 - 2.0 * t)


def build_subject(path, height):
    """Key the cat off its white background, leaving the drawn colors alone."""
    src = Image.open(path).convert("RGB")
    scale = height / src.height
    src = src.resize((int(round(src.width * scale)), height), Image.LANCZOS)
    rgb = np.asarray(src, np.float32) / 255.0

    # White background has all channels near 1, so distance from white keys the
    # art cleanly and keeps the antialiased whiskers.
    dist = 1.0 - rgb.min(axis=2)
    alpha = smoothstep(0.07, 0.20, dist)
    return rgb, alpha.astype(np.float32)


def paste(canvas_shape, rgb, alpha, cx, cy, scale):
    """Resize the subject and drop it centred at (cx, cy) in canvas space."""
    h, w = rgb.shape[:2]
    nw, nh = max(2, int(round(w * scale))), max(2, int(round(h * scale)))
    rgb_s = np.asarray(_to_img(rgb).resize((nw, nh), Image.LANCZOS), np.float32) / 255.0
    a_s = np.asarray(_to_img(alpha).resize((nw, nh), Image.LANCZOS), np.float32) / 255.0

    H, W = canvas_shape
    out_rgb = np.zeros((H, W, 3), np.float32)
    out_a = np.zeros((H, W), np.float32)
    x0, y0 = int(round(cx - nw / 2)), int(round(cy - nh / 2))
    sx0, sy0 = max(0, -x0), max(0, -y0)
    sx1, sy1 = nw - max(0, x0 + nw - W), nh - max(0, y0 + nh - H)
    if sx1 <= sx0 or sy1 <= sy0:
        return out_rgb, out_a
    out_rgb[y0 + sy0 : y0 + sy1, x0 + sx0 : x0 + sx1] = rgb_s[sy0:sy1, sx0:sx1]
    out_a[y0 + sy0 : y0 + sy1, x0 + sx0 : x0 + sx1] = a_s[sy0:sy1, sx0:sx1]
    return out_rgb, out_a


def field(w, h):
    yy = np.linspace(-1.0, 1.0, h, dtype=np.float32)[:, None]
    xx = np.linspace(-1.0, 1.0, w, dtype=np.float32)[None, :]
    r = np.sqrt(xx * xx + yy * yy)
    shade = 1.0 - 0.055 * np.clip(r - 0.45, 0.0, 1.0)
    return (FIELD * shade[..., None]).astype(np.float32)


def envelope(frame_i, fps):
    """Sharp hit then a short decay, repeating on the logo's 1.25s cadence."""
    period = max(1, int(round(GLITCH_PERIOD * fps)))
    hold = max(1, int(round(GLITCH_HOLD * fps)))
    phase = frame_i % period
    if phase < hold:
        return 1.0, frame_i // period
    env = float(np.exp(-(phase - hold) / (GLITCH_TAU * fps)))
    return (env if env > 0.02 else 0.0), frame_i // period


def channel_split(frame, px):
    """Red one way, green and blue together the other, for red/cyan fringes."""
    if px < 1:
        return frame
    out = frame.copy()
    out[..., 0] = np.roll(frame[..., 0], px, axis=1)
    out[..., 1] = np.roll(frame[..., 1], -px, axis=1)
    out[..., 2] = np.roll(frame[..., 2], -px, axis=1)
    return out


def slice_tear(frame, rng, env, w):
    out = frame.copy()
    H = frame.shape[0]
    for _ in range(int(rng.integers(3, 7))):
        bh = int(rng.integers(4, 40))
        y0 = int(rng.integers(0, max(1, H - bh)))
        dx = int(rng.normal(0, 0.022 * w * env))
        if dx == 0:
            continue
        band = np.roll(frame[y0 : y0 + bh], dx, axis=1)
        out[y0 : y0 + bh] = channel_split(band, max(1, int(abs(dx) * 0.5)))
    return out


def streaks(frame, alpha, rng, env, w):
    """Thin cyan and red lines smeared off the mark, like the logo's hits."""
    out = frame
    H = frame.shape[0]
    rows = np.where(alpha.max(axis=1) > 0.4)[0]
    if rows.size == 0:
        return out
    for _ in range(int(rng.integers(1, 4))):
        y0 = int(rng.choice(rows))
        bh = int(rng.integers(1, 4))
        y1 = min(H, y0 + bh)
        prof = alpha[y0:y1].max(axis=0)
        # Smear the row sideways so the line runs well past the silhouette.
        reach = int(0.16 * w * env)
        smear = prof.copy()
        for s in range(8, max(9, reach), 8):
            smear = np.maximum(smear, np.roll(prof, s))
            smear = np.maximum(smear, np.roll(prof, -s))
        tint = np.array([0.1, 0.95, 1.0], np.float32) if rng.random() < 0.6 else \
            np.array([1.0, 0.25, 0.1], np.float32)
        a = (smear * 0.55 * env)[None, :, None]
        out[y0:y1] = out[y0:y1] * (1.0 - a) + tint * a
    return out


def compose(subject, frame_i, n, fps, w, h, scale_fit):
    rgb, alpha = subject
    t = frame_i / n
    frame = field(w, h)

    breathe = 1.0 + 0.015 * np.sin(2.0 * np.pi * t)
    rgb_l, a_l = paste((h, w), rgb, alpha, w * 0.5, h * 0.5, scale_fit * breathe)
    a = a_l[..., None]
    frame = frame * (1.0 - a) + rgb_l * a

    env, burst = envelope(frame_i, fps)
    if env > 0.0:
        rng = np.random.default_rng(1700 + burst)
        frame = channel_split(frame, int(round(0.013 * w * env)))
        frame = slice_tear(frame, rng, env, w)
        frame = streaks(frame, a_l, rng, env, w)
    return np.clip(frame, 0.0, 1.0)


def render_video(path, subject, seconds, fps, w, h, scale_fit):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    cmd = [
        "ffmpeg", "-y",
        "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{w}x{h}", "-r", str(fps),
        "-i", "pipe:0", "-an",
        "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "18", "-preset", "medium",
        "-movflags", "+faststart", str(path),
    ]
    proc = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    n = int(round(seconds * fps))
    try:
        for i in range(n):
            rgb = compose(subject, i, n, fps, w, h, scale_fit)
            proc.stdin.write((rgb * 255).astype(np.uint8).tobytes())
            if i % 15 == 0 or i == n - 1:
                print(f"frame {i + 1}/{n}", flush=True)
    finally:
        proc.stdin.close()
        code = proc.wait()
    if code != 0:
        raise SystemExit(f"ffmpeg exited {code}")
    return path


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--image", default=str(DEFAULT_IMAGE))
    p.add_argument("--output", default="video/output/cat-head-glitch.mp4")
    p.add_argument("--seconds", type=float, default=5.0)
    p.add_argument("--fps", type=int, default=24)
    p.add_argument("--width", type=int, default=1080)
    p.add_argument("--height", type=int, default=1080)
    p.add_argument("--fit", type=float, default=0.70, help="subject height as a fraction of frame")
    p.add_argument("--stills", action="store_true")
    p.add_argument("--still-dir", default="/tmp/cat_head_glitch")
    args = p.parse_args()

    n = int(round(args.seconds * args.fps))
    period = max(1, int(round(GLITCH_PERIOD * args.fps)))
    if n % period:
        print(f"warning: {n} frames is not a whole number of {period}-frame "
              f"glitch cycles, so the loop point will skip", flush=True)

    source_h = int(round(args.height * 0.95))
    subject = build_subject(args.image, source_h)
    scale_fit = (args.height * args.fit) / source_h

    if args.stills:
        out = Path(args.still_dir)
        out.mkdir(parents=True, exist_ok=True)
        for i in (0, 1, 3, 6, 15, 30):
            rgb = compose(subject, i, n, args.fps, args.width, args.height, scale_fit)
            dest = out / f"f{i:03d}.png"
            _to_img(rgb).save(dest)
            print(dest, flush=True)
        return

    render_video(args.output, subject, args.seconds, args.fps, args.width, args.height, scale_fit)
    print(args.output)


if __name__ == "__main__":
    main()
