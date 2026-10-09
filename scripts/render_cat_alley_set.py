#!/usr/bin/env python3
"""Seamless set-video loop: the cat head in the lamp-lit alley, watching mice run by.

The cat stays black as drawn, lit on the lamp side, and pulses on a steady beat.
Mice cross the wet ground in front of its chin and the cat's pupils track the
lead mouse, easing back to centre whenever that mouse is off frame. RGB glitch
bursts land every 1.25s with a two-frame peak and a short decay, the cadence
measured off public/linturo-glitch-preview.mp4.
"""

from __future__ import annotations

import argparse
import subprocess
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

HERE = Path(__file__).resolve().parent
DEFAULT_CAT = HERE / "assets" / "cathead.jpeg"
DEFAULT_ALLEY = HERE / "assets" / "alley-clean.jpg"

# The alley plates are painted very dark; lift so they read on video.
PLATE_LIFT = 1.35

LAMP = np.array([0.80, 0.62, 1.0], np.float32)
MOUSE = np.array([0.045, 0.035, 0.065], np.float32)
IRIS = np.array([1.0, 0.68, 0.24], np.float32)

# Lamp sits high and right of the cat in the alley plate.
LIGHT_DIR = np.array([0.63, -0.78], np.float32)

GLITCH_PERIOD = 1.25
GLITCH_HOLD = 0.08
GLITCH_TAU = 0.117

# The cat takes an extra hit between the main ones.
CAT_HALF_BEAT = 0.75

GLITCH_RED = np.array([1.0, 0.18, 0.18], np.float32)
GLITCH_BLUE = np.array([0.22, 0.34, 1.0], np.float32)
GLITCH_WHITE = np.array([0.95, 0.96, 1.0], np.float32)

BREATHE_PERIOD = 5.0
BREATHE_AMP = 0.075

# The cat never settles completely between hits.
CAT_FLOOR = 0.30

CAT_CY = 0.575
GROUND_Y = 0.875

# size, ground offset, crossings per loop, leg cycles per loop, start phase, right-to-left
MICE = (
    (0.120, 0.000, 2, 46, 0.00, False),
    (0.088, -0.034, 3, 58, 0.37, False),
    (0.132, 0.024, 2, 40, 0.68, False),
    (0.078, -0.055, 4, 64, 0.15, True),
    (0.104, 0.012, 3, 52, 0.84, False),
)


def _to_img(a):
    return Image.fromarray((np.clip(a, 0, 1) * 255).astype(np.uint8))


def blur(a, radius):
    if radius <= 0:
        return a
    return np.asarray(_to_img(a).filter(ImageFilter.GaussianBlur(radius)), np.float32) / 255.0


def blur_fast(a, radius, step=4):
    """Wide blurs are indistinguishable at quarter scale and far cheaper there."""
    if radius < 8:
        return blur(a, radius)
    h, w = a.shape
    sw, sh = max(1, w // step), max(1, h // step)
    small = _to_img(a).resize((sw, sh), Image.BILINEAR)
    small = small.filter(ImageFilter.GaussianBlur(radius / step))
    return np.asarray(small.resize((w, h), Image.BILINEAR), np.float32) / 255.0


def erode(a, size):
    return np.asarray(_to_img(a).filter(ImageFilter.MinFilter(size)), np.float32) / 255.0


def smoothstep(e0, e1, x):
    t = np.clip((x - e0) / (e1 - e0), 0.0, 1.0)
    return t * t * (3.0 - 2.0 * t)


# ---------------------------------------------------------------- cat


def build_cat(path, height):
    """Key the cat off white, then split out the eyeballs so the pupils can move."""
    src = Image.open(path).convert("RGB")
    scale = height / src.height
    src = src.resize((int(round(src.width * scale)), height), Image.LANCZOS)
    rgb = np.asarray(src, np.float32) / 255.0

    dist = 1.0 - rgb.min(axis=2)
    alpha = smoothstep(0.07, 0.20, dist).astype(np.float32)
    lum = rgb @ np.array([0.299, 0.587, 0.114], np.float32)

    warm = (rgb[..., 0] - rgb[..., 2] > 0.12) & (alpha > 0.4)
    ys, xs = np.where(warm)
    mid = (xs.min() + xs.max()) / 2.0
    h, w = lum.shape
    yy, xx = np.arange(h)[:, None], np.arange(w)[None, :]

    # The iris is an open crescent, so closing won't fill it. Fit an ellipse to
    # each iris instead and treat that disc as the eyeball.
    disc = np.zeros((h, w), bool)
    radii = []
    for sel in (xs < mid, xs >= mid):
        x0, x1 = xs[sel].min(), xs[sel].max()
        y0, y1 = ys[sel].min(), ys[sel].max()
        cx, cy = (x0 + x1) / 2.0, (y0 + y1) / 2.0
        rx, ry = (x1 - x0) / 2.0, (y1 - y0) / 2.0
        disc |= ((xx - cx) / rx) ** 2 + ((yy - cy) / ry) ** 2 <= 1.0
        radii.append(rx)
    pupil = disc & (lum < 0.32) & ~warm

    # Base has the eyeballs flooded with iris colour, so a shifted pupil never
    # leaves a hole behind it.
    base = rgb.copy()
    base[pupil] = IRIS
    pupil_rgb = rgb.copy()

    return {
        "rgb": base.astype(np.float32),
        "alpha": alpha,
        "disc": disc.astype(np.float32),
        "pupil": pupil.astype(np.float32),
        "pupil_rgb": pupil_rgb.astype(np.float32),
        "iris": (warm & ~pupil).astype(np.float32),
        "gaze_px": float(np.mean(radii)) * 0.24,
    }


def resize_to(a, nw, nh):
    return np.asarray(_to_img(a).resize((nw, nh), Image.LANCZOS), np.float32) / 255.0


def place(canvas_shape, layer, cx, cy, nw, nh):
    """Drop a resized layer centred at (cx, cy); returns the canvas-space copy."""
    H, W = canvas_shape
    out = np.zeros((H, W) + layer.shape[2:], np.float32)
    x0, y0 = int(round(cx - nw / 2)), int(round(cy - nh / 2))
    sx0, sy0 = max(0, -x0), max(0, -y0)
    sx1, sy1 = nw - max(0, x0 + nw - W), nh - max(0, y0 + nh - H)
    if sx1 <= sx0 or sy1 <= sy0:
        return out
    out[y0 + sy0 : y0 + sy1, x0 + sx0 : x0 + sx1] = layer[sy0:sy1, sx0:sx1]
    return out


def cat_layer(cat, shape, cx, cy, scale, gaze):
    """Composite the cat at scale with its pupils offset by the gaze vector."""
    h, w = cat["alpha"].shape
    nw, nh = max(2, int(round(w * scale))), max(2, int(round(h * scale)))
    gx = int(round(cat["gaze_px"] * scale * gaze[0]))
    gy = int(round(cat["gaze_px"] * scale * gaze[1] * 0.7))

    rgb = resize_to(cat["rgb"], nw, nh)
    alpha = resize_to(cat["alpha"], nw, nh)
    disc = resize_to(cat["disc"], nw, nh)
    pupil = resize_to(cat["pupil"], nw, nh)
    pupil_rgb = resize_to(cat["pupil_rgb"], nw, nh)
    iris = resize_to(cat["iris"], nw, nh)

    moved = np.roll(np.roll(pupil, gx, axis=1), gy, axis=0) * disc
    moved_rgb = np.roll(np.roll(pupil_rgb, gx, axis=1), gy, axis=0)
    m = moved[..., None]
    rgb = rgb * (1.0 - m) + moved_rgb * m

    return (
        place(shape, rgb, cx, cy, nw, nh),
        place(shape, alpha, cx, cy, nw, nh),
        place(shape, iris, cx, cy, nw, nh),
    )


# ---------------------------------------------------------------- mice


def capsule(buf, x0, y0, x1, y1, r):
    """Antialiased round-ended bar, drawn into a local alpha buffer."""
    h, w = buf.shape
    lo_x, hi_x = max(0, int(min(x0, x1) - r - 2)), min(w, int(max(x0, x1) + r + 3))
    lo_y, hi_y = max(0, int(min(y0, y1) - r - 2)), min(h, int(max(y0, y1) + r + 3))
    if hi_x <= lo_x or hi_y <= lo_y:
        return
    xx = np.arange(lo_x, hi_x, dtype=np.float32)[None, :]
    yy = np.arange(lo_y, hi_y, dtype=np.float32)[:, None]
    dx, dy = x1 - x0, y1 - y0
    L2 = dx * dx + dy * dy
    t = 0.0 if L2 < 1e-6 else np.clip(((xx - x0) * dx + (yy - y0) * dy) / L2, 0.0, 1.0)
    d = np.sqrt((xx - x0 - t * dx) ** 2 + (yy - y0 - t * dy) ** 2)
    cov = smoothstep(r + 0.8, r - 0.8, d)
    buf[lo_y:hi_y, lo_x:hi_x] = np.maximum(buf[lo_y:hi_y, lo_x:hi_x], cov)


def ellipse(buf, cx, cy, rx, ry):
    h, w = buf.shape
    lo_x, hi_x = max(0, int(cx - rx - 2)), min(w, int(cx + rx + 3))
    lo_y, hi_y = max(0, int(cy - ry - 2)), min(h, int(cy + ry + 3))
    if hi_x <= lo_x or hi_y <= lo_y:
        return
    xx = np.arange(lo_x, hi_x, dtype=np.float32)[None, :]
    yy = np.arange(lo_y, hi_y, dtype=np.float32)[:, None]
    d = np.sqrt(((xx - cx) / rx) ** 2 + ((yy - cy) / ry) ** 2)
    e = 1.2 / max(2.0, min(rx, ry))
    cov = smoothstep(1.0 + e, 1.0 - e, d)
    buf[lo_y:hi_y, lo_x:hi_x] = np.maximum(buf[lo_y:hi_y, lo_x:hi_x], cov)


def draw_mouse(buf, x, ground, size, phase, facing):
    """Side-view mouse, feet on `ground`, legs driven by `phase` (cycles)."""
    s = size
    f = facing  # +1 faces right, -1 faces left
    bob = -0.022 * s * abs(np.sin(2.0 * np.pi * phase * 2.0))
    cy = ground - 0.44 * s + bob

    hip_y = cy + 0.16 * s
    for lx, off in ((0.26, 0.0), (0.20, 0.5), (-0.18, 0.5), (-0.24, 0.0)):
        swing = 0.20 * s * np.sin(2.0 * np.pi * (phase + off))
        lift = 0.10 * s * max(0.0, np.cos(2.0 * np.pi * (phase + off)))
        capsule(buf, x + f * lx * s, hip_y,
                x + f * (lx * s + swing), ground - lift, 0.038 * s)

    # Tail trails behind, dipping before it curls up, and whips with the stride.
    tail = 0.10 * s * np.sin(2.0 * np.pi * (phase + 0.25))
    px, py = x - f * 0.42 * s, cy - 0.02 * s
    for i in range(1, 9):
        u = i / 8.0
        nx = x - f * (0.42 + 0.56 * u) * s
        ny = cy - 0.02 * s + (0.07 * np.sin(np.pi * u) - 0.24 * u**1.9) * s + tail * u
        capsule(buf, px, py, nx, ny, (0.032 - 0.019 * u) * s)
        px, py = nx, ny

    ellipse(buf, x - f * 0.20 * s, cy - 0.01 * s, 0.27 * s, 0.26 * s)
    ellipse(buf, x, cy, 0.40 * s, 0.25 * s)
    ellipse(buf, x + f * 0.42 * s, cy + 0.05 * s, 0.21 * s, 0.17 * s)
    ellipse(buf, x + f * 0.58 * s, cy + 0.09 * s, 0.10 * s, 0.075 * s)
    ellipse(buf, x + f * 0.34 * s, cy - 0.15 * s, 0.105 * s, 0.105 * s)


def mouse_x(spec, t, w, margin):
    size, _, cross, _, start, rtl = spec
    span = w + 2.0 * margin
    u = (start + cross * t) % 1.0
    return (w + margin - u * span) if rtl else (u * span - margin)


def mice_layer(t, w, h):
    """Alpha for every mouse plus their ground shadows, and the lead mouse x."""
    buf = np.zeros((h, w), np.float32)
    shade = np.zeros((h, w), np.float32)
    margin = 0.12 * w
    lead = None
    for spec in MICE:
        size_f, dy, _cross, cycles, start, rtl = spec
        size = size_f * h
        x = mouse_x(spec, t, w, margin)
        ground = (GROUND_Y + dy) * h
        phase = (start * 7.0 + cycles * t) % 1.0
        draw_mouse(buf, x, ground, size, phase, -1.0 if rtl else 1.0)
        ellipse(shade, x, ground + 0.02 * size, 0.62 * size, 0.09 * size)
        if lead is None:
            lead = x
    return buf, shade, lead


# ---------------------------------------------------------------- scene


def build_field(path, w, h):
    """Alley plate fitted to the frame; a narrower plate gets its edges extended."""
    img = Image.open(path).convert("RGB")
    s = h / img.height
    nw = int(round(img.width * s))
    base = np.asarray(img.resize((nw, h), Image.LANCZOS), np.float32) / 255.0
    if nw >= w:
        x0 = (nw - w) // 2
        return np.clip(base[:, x0 : x0 + w] * PLATE_LIFT, 0.0, 1.0) ** 0.94

    out = np.zeros((h, w, 3), np.float32)
    x0 = (w - nw) // 2
    out[:, x0 : x0 + nw] = base

    # The plate is square and the frame is wide. Mirroring would duplicate the
    # lamp, so extend with each edge's own vertical tone, smoothed and falling
    # off into shadow — the alley just runs out of light at the sides.
    def edge_tone(cols):
        col = cols.mean(axis=1)
        k = 41
        pad = np.pad(col, ((k // 2, k // 2), (0, 0)), mode="edge")
        ker = np.ones(k, np.float32) / k
        return np.stack([np.convolve(pad[:, c], ker, "valid") for c in range(3)], axis=1)

    haze = 1.0 + 0.05 * np.sin(np.linspace(0.0, 3.0, h, dtype=np.float32))
    for lo, hi, cols in ((0, x0, base[:, :48]), (x0 + nw, w, base[:, -48:])):
        n = hi - lo
        if n <= 0:
            continue
        tone = edge_tone(cols) * haze[:, None]
        d = np.arange(n, dtype=np.float32)
        near = (d + 1) / n if lo == 0 else 1.0 - d / n
        out[:, lo:hi] = tone[:, None, :] * (0.34 + 0.66 * near**1.1)[None, :, None]

    for seam in (x0, x0 + nw):
        lo, hi = max(0, seam - 40), min(w, seam + 40)
        out[:, lo:hi] = blur(out[:, lo:hi], 7)
    return np.clip(out * PLATE_LIFT, 0.0, 1.0) ** 0.94


def envelope(frame_i, fps):
    period = max(1, int(round(GLITCH_PERIOD * fps)))
    hold = max(1, int(round(GLITCH_HOLD * fps)))
    phase = frame_i % period
    if phase < hold:
        return 1.0, frame_i // period
    env = float(np.exp(-(phase - hold) / (GLITCH_TAU * fps)))
    return (env if env > 0.02 else 0.0), frame_i // period


def cat_envelope(frame_i, fps):
    """The cat also catches a lighter hit on the half-beat, so it glitches twice
    as often as the scene without moving the main cadence off the logo timing."""
    env, burst = envelope(frame_i, fps)
    offset = max(1, int(round(GLITCH_PERIOD * 0.5 * fps)))
    env_h, burst_h = envelope(frame_i + offset, fps)
    env_h *= CAT_HALF_BEAT
    if env_h > env:
        return env_h, burst_h * 2 + 1
    return env, burst * 2


def composite_3d(frame, rgb, alpha, px):
    """Lay the cat down with offset red and blue ghosts and a white core edge.

    A per-channel split would read as its complement here — the cat is black, so
    holding back red leaves cyan rather than red. The fringes are added instead.
    """
    a = alpha[..., None]
    out = frame * (1.0 - a) + rgb * a
    if px < 1:
        return out
    a_r = np.clip(np.roll(alpha, px, axis=1) - alpha, 0.0, 1.0)
    a_b = np.clip(np.roll(alpha, -px, axis=1) - alpha, 0.0, 1.0)
    out += a_r[..., None] * GLITCH_RED
    out += a_b[..., None] * GLITCH_BLUE
    # White core edge sits between the two ghosts and sells the 3D read.
    out += np.clip(alpha - erode(alpha, 5), 0.0, 1.0)[..., None] * GLITCH_WHITE * 0.45
    return out


def channel_split(frame, px):
    """Red and blue part, green holds — keeps the fringes red/blue, never green."""
    if px < 1:
        return frame
    out = frame.copy()
    out[..., 0] = np.roll(frame[..., 0], px, axis=1)
    out[..., 2] = np.roll(frame[..., 2], -px, axis=1)
    return out


def slice_tear(frame, rng, env, w, alpha=None):
    """Horizontal tears in the alley. Bands stop at the cat so they don't cut the face."""
    out = frame.copy()
    H = frame.shape[0]
    for _ in range(int(rng.integers(2, 5))):
        bh = int(rng.integers(4, 46))
        y0 = int(rng.integers(0, max(1, H - bh)))
        dx = int(rng.normal(0, 0.010 * w * env))
        if dx == 0:
            continue
        band = np.roll(frame[y0 : y0 + bh], dx, axis=1)
        torn = channel_split(band, max(1, int(abs(dx) * 0.5)))
        if alpha is not None:
            keep = alpha[y0 : y0 + bh] < 0.08
            torn = np.where(keep[..., None], torn, frame[y0 : y0 + bh])
        out[y0 : y0 + bh] = torn
    return out


def streaks(frame, alpha, rng, env, w):
    """Thin hits that run off the silhouette, not across the face."""
    out = frame
    H = frame.shape[0]
    rows = np.where(alpha.max(axis=1) > 0.4)[0]
    if rows.size == 0:
        return out
    for _ in range(int(rng.integers(1, 4))):
        y0 = int(rng.choice(rows))
        y1 = min(H, y0 + int(rng.integers(1, 4)))
        prof = alpha[y0:y1].max(axis=0)
        smear = prof.copy()
        for s in range(8, max(9, int(0.15 * w * env)), 8):
            smear = np.maximum(smear, np.roll(prof, s))
            smear = np.maximum(smear, np.roll(prof, -s))
        tint = (GLITCH_WHITE, GLITCH_RED, GLITCH_BLUE)[int(rng.integers(0, 3))]
        a = (smear * 0.4 * env)[None, :, None]
        a = a * (alpha[y0:y1] < 0.12)[..., None]
        out[y0:y1] = out[y0:y1] * (1.0 - a) + tint * a
    return out


def compose(cat, plate, frame_i, n, fps, w, h, fit):
    t = frame_i / n
    frame = plate.copy()

    # Lamp breathes gently; integer harmonics keep it loop-safe.
    flick = 1.0 + 0.035 * np.sin(2.0 * np.pi * t * 3.0) + 0.018 * np.sin(2.0 * np.pi * t * 7.0)
    frame = frame * flick

    # Slow breathe: the head swells and shrinks over BREATHE_PERIOD seconds.
    breathe = float(np.sin(2.0 * np.pi * frame_i / (BREATHE_PERIOD * fps)))
    scale_h = h * fit * (1.0 + BREATHE_AMP * breathe)
    scale = scale_h / cat["alpha"].shape[0]

    mice, shade, lead = mice_layer(t, w, h)

    # Watch the lead mouse while it is on frame, ease back to centre once it is not.
    cat_cx = w * 0.5
    presence = float(smoothstep(-0.06 * w, 0.10 * w, lead) *
                     smoothstep(1.06 * w, 0.90 * w, lead))
    gaze = (float(np.clip((lead - cat_cx) / (0.55 * w), -1.0, 1.0)) * presence,
            0.35 * presence)

    rgb_c, a_c, iris_c = cat_layer(cat, (h, w), cat_cx, h * CAT_CY, scale, gaze)

    # Seat the head in the alley with a soft occlusion halo behind it.
    halo = blur_fast(a_c, 0.035 * w)
    frame = frame * (1.0 - 0.55 * halo[..., None])

    # Chromatic fringe on the silhouette, timed with the logo cadence. The head
    # itself stays whole — no scanline bars across the face.
    cat_env, _cat_burst = cat_envelope(frame_i, fps)
    cat_env = max(cat_env, CAT_FLOOR)

    # Rim light from the lamp, read off the silhouette's own gradient. The band is
    # wide and the falloff steep so it wraps the form instead of outlining it, and
    # it is damped where the shape is thin so the whiskers don't turn into wires.
    ab = blur(a_c, 5)
    gy, gx = np.gradient(ab)
    nrm = np.sqrt(gx * gx + gy * gy) + 1e-6
    lit = np.clip((-gx / nrm) * LIGHT_DIR[0] + (-gy / nrm) * LIGHT_DIR[1], 0.0, 1.0) ** 2.6
    band = np.clip(a_c - erode(a_c, 15), 0.0, 1.0)
    thick = blur_fast(erode(a_c, 21), 25)
    rim = blur(band * lit * (0.22 + 0.78 * thick), 2)

    frame = composite_3d(frame, rgb_c, a_c, int(round(0.010 * w * cat_env)))
    frame += (rim * 1.15)[..., None] * LAMP

    # Eyes come up with the breathe.
    frame += blur_fast(iris_c, 0.012 * w)[..., None] * IRIS * (0.55 + 0.30 * (0.5 + 0.5 * breathe))

    frame *= (1.0 - 0.5 * shade[..., None])
    m = mice[..., None]
    frame = frame * (1.0 - m) + MOUSE * m
    # Lamp catches the top of each mouse so they read against the wet ground.
    mb = blur(mice, 3)
    mgy, mgx = np.gradient(mb)
    mn = np.sqrt(mgx * mgx + mgy * mgy) + 1e-6
    mlit = np.clip((-mgx / mn) * LIGHT_DIR[0] + (-mgy / mn) * LIGHT_DIR[1], 0.0, 1.0) ** 1.6
    mrim = np.clip(mice - erode(mice, 7), 0.0, 1.0) * mlit
    frame += (blur(mrim, 1) * 1.25)[..., None] * LAMP

    env, burst = envelope(frame_i, fps)
    if env > 0.0:
        rng = np.random.default_rng(1700 + burst)
        frame = channel_split(frame, int(round(0.0034 * w * env)))
        frame = slice_tear(frame, rng, env, w, a_c)
        frame = streaks(frame, a_c, rng, env, w)

    vig = np.sqrt(
        np.linspace(-1, 1, w, dtype=np.float32)[None, :] ** 2
        + np.linspace(-1, 1, h, dtype=np.float32)[:, None] ** 2
    )
    frame *= (1.0 - 0.38 * np.clip(vig - 0.50, 0, 1))[..., None]
    rng = np.random.default_rng(frame_i * 7919 % 65521)
    frame += (rng.random((h, w, 1), dtype=np.float32) - 0.5) * 0.016
    return np.clip(frame, 0.0, 1.0)


def render_video(path, cat, plate, seconds, fps, w, h, fit):
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
            rgb = compose(cat, plate, i, n, fps, w, h, fit)
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
    p.add_argument("--cat", default=str(DEFAULT_CAT))
    p.add_argument("--alley", default=str(DEFAULT_ALLEY))
    p.add_argument("--output", default="video/output/cat-alley-set.mp4")
    p.add_argument("--seconds", type=float, default=10.0)
    p.add_argument("--fps", type=int, default=24)
    p.add_argument("--width", type=int, default=1920)
    p.add_argument("--height", type=int, default=1080)
    p.add_argument("--fit", type=float, default=0.62, help="cat height as a fraction of frame")
    p.add_argument("--stills", action="store_true")
    p.add_argument("--still-frames", default="0,8,30,54,96,150")
    p.add_argument("--still-dir", default="/tmp/cat_alley")
    args = p.parse_args()

    n = int(round(args.seconds * args.fps))
    period = max(1, int(round(GLITCH_PERIOD * args.fps)))
    if n % period:
        print(f"warning: {n} frames is not a whole number of {period}-frame "
              f"glitch cycles, so the loop point will skip", flush=True)

    cat = build_cat(args.cat, int(round(args.height * 0.95)))
    plate = build_field(args.alley, args.width, args.height)

    if args.stills:
        out = Path(args.still_dir)
        out.mkdir(parents=True, exist_ok=True)
        for i in (int(v) for v in args.still_frames.split(",")):
            rgb = compose(cat, plate, i, n, args.fps, args.width, args.height, args.fit)
            dest = out / f"f{i:04d}.png"
            _to_img(rgb).save(dest)
            print(dest, flush=True)
        return

    render_video(args.output, cat, plate, args.seconds, args.fps,
                 args.width, args.height, args.fit)
    print(args.output)


if __name__ == "__main__":
    main()
