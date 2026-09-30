#!/usr/bin/env python3
"""Seamless loop of sliced, spinning cat heads with neon sunglasses.

Matches the graphic idea of a mannequin-head slice spin: magenta and blue
bands, lime frames, blue field, arranged as a tight grid. The subject is a
cat instead of a human head.
"""

from __future__ import annotations

import argparse
import subprocess
from pathlib import Path

import numpy as np
from PIL import Image

Y0, Y1 = -1.05, 1.34
N_SLICES = 9
# Extra full turns per slice, plus one shared spin. Integers keep the loop seamless.
# Face, ears, and jaw stay in groups so sunglasses don't shear apart.
REL_TURNS = np.array([0, 0, 1, 1, 1, 1, 2, 2, 2], dtype=np.float64)
BASE_TURNS = 2.0

PINK = np.array([1.0, 0.16, 0.72], np.float32)
BLUE = np.array([0.12, 0.36, 1.0], np.float32)
GREEN = np.array([0.22, 1.0, 0.08], np.float32)
LENS = np.array([0.015, 0.02, 0.025], np.float32)
NOSE = np.array([0.18, 0.03, 0.08], np.float32)
INNER = np.array([1.0, 0.46, 0.64], np.float32)

LIGHT = np.array([-0.35, 0.62, 0.78], np.float32)
LIGHT /= np.linalg.norm(LIGHT)
LIGHT2 = np.array([0.75, 0.08, 0.28], np.float32)
LIGHT2 /= np.linalg.norm(LIGHT2)
VIEW = np.array([0.0, 0.08, 1.0], np.float32)
VIEW /= np.linalg.norm(VIEW)


def _ell(c, r, color, spec=1.0, power=36.0):
    return {
        "kind": "ell",
        "c": np.array(c, np.float32),
        "r": np.array(r, np.float32),
        "color": None if color is None else np.array(color, np.float32),
        "spec": spec,
        "power": power,
    }


def build_shapes():
    body = None
    shapes = [
        _ell((0.0, -0.62, 0.08), (0.38, 0.24, 0.34), body, 0.7, 28),
        _ell((0.0, -0.02, 0.0), (0.78, 0.68, 0.70), body, 1.05, 40),
        _ell((0.0, -0.08, 0.06), (0.86, 0.46, 0.58), body, 0.9, 34),
        _ell((0.0, -0.36, 0.55), (0.24, 0.16, 0.22), body, 0.85, 32),
        _ell((-0.36, 0.70, 0.0), (0.17, 0.36, 0.11), body, 0.8, 26),
        _ell((0.36, 0.70, 0.0), (0.17, 0.36, 0.11), body, 0.8, 26),
        _ell((-0.34, 0.78, 0.05), (0.08, 0.18, 0.05), INNER, 0.35, 14),
        _ell((0.34, 0.78, 0.05), (0.08, 0.18, 0.05), INNER, 0.35, 14),
        _ell((0.0, -0.34, 0.78), (0.07, 0.05, 0.045), NOSE, 0.5, 16),
        # Glasses sit inside one slice so the cut doesn't run through the lenses.
        _ell((-0.62, 0.14, 0.18), (0.045, 0.03, 0.40), GREEN, 0.95, 28),
        _ell((0.62, 0.14, 0.18), (0.045, 0.03, 0.40), GREEN, 0.95, 28),
        _ell((-0.32, 0.14, 0.66), (0.34, 0.115, 0.08), GREEN, 1.25, 28),
        _ell((0.32, 0.14, 0.66), (0.34, 0.115, 0.08), GREEN, 1.25, 28),
        _ell((0.0, 0.18, 0.64), (0.13, 0.035, 0.06), GREEN, 1.15, 28),
        _ell((-0.32, 0.14, 0.74), (0.24, 0.078, 0.045), LENS, 1.55, 16),
        _ell((0.32, 0.14, 0.74), (0.24, 0.078, 0.045), LENS, 1.55, 16),
    ]
    return shapes


SHAPES = build_shapes()


def slice_layout(t):
    breath = (1.0 - np.cos(2.0 * np.pi * t)) * 0.5
    gap = 0.016 + 0.055 * breath
    thick = (Y1 - Y0) / N_SLICES
    total = N_SLICES * thick + (N_SLICES - 1) * gap
    start = -total / 2.0 + 0.02
    edges = Y0 + np.arange(N_SLICES) * thick
    vis0 = start + np.arange(N_SLICES) * (thick + gap)
    return edges, vis0, thick, gap


def shade(base, nx, ny, nz, spec_gain, spec_pow):
    nrm = np.sqrt(nx * nx + ny * ny + nz * nz) + 1e-8
    nx, ny, nz = nx / nrm, ny / nrm, nz / nrm
    ndl = np.clip(nx * LIGHT[0] + ny * LIGHT[1] + nz * LIGHT[2], 0.0, 1.0)
    ndl2 = np.clip(nx * LIGHT2[0] + ny * LIGHT2[1] + nz * LIGHT2[2], 0.0, 1.0)
    rx = 2 * nx * ndl - LIGHT[0]
    ry = 2 * ny * ndl - LIGHT[1]
    rz = 2 * nz * ndl - LIGHT[2]
    spec = np.clip(rx * VIEW[0] + ry * VIEW[1] + rz * VIEW[2], 0.0, 1.0) ** spec_pow
    col = base * (0.32 + 0.72 * ndl)[..., None]
    col = col + base * (0.16 * ndl2)[..., None]
    col = col + (spec * spec_gain)[..., None]
    return np.clip(col, 0.0, 1.0)


def hit_ellipsoid(x, y, cth, sth, c, r):
    """Orthographic rays along -Z. Returns front z and local normal."""
    ry = r[1]
    k = 1.0 - ((y - c[1]) / ry) ** 2
    px = x * cth - c[0]
    pz = x * sth - c[2]
    rx2 = r[0] ** 2
    rz2 = r[2] ** 2
    a = (sth * sth) / rx2 + (cth * cth) / rz2
    b = (-2.0 * px * sth) / rx2 + (2.0 * pz * cth) / rz2
    c0 = (px * px) / rx2 + (pz * pz) / rz2 - k
    disc = b * b - 4.0 * a * c0
    hit = (k > 0.0) & (disc >= 0.0) & (a > 1e-8)
    sqrt_d = np.sqrt(np.clip(disc, 0.0, None))
    z1 = (-b - sqrt_d) / (2.0 * a + 1e-8)
    z2 = (-b + sqrt_d) / (2.0 * a + 1e-8)
    z = np.maximum(z1, z2)
    xl = x * cth - z * sth
    zl = x * sth + z * cth
    nx = (xl - c[0]) / rx2
    ny = np.full_like(x, (0.0)) + ((y - c[1]) / (ry * ry))
    nz = (zl - c[2]) / rz2
    return hit, z, nx, ny, nz


def render_sprite(t, scale, sprite_size):
    sw, sh = sprite_size
    sprite = np.zeros((sh, sw, 4), np.float32)
    ox = (sw - 1) * 0.5
    oy = sh * 0.58
    cols = np.arange(sw, dtype=np.float32)
    rows = np.arange(sh, dtype=np.float32)
    xg = np.broadcast_to((cols[None, :] - ox) / scale, (sh, sw))
    yg = np.broadcast_to((oy - rows[:, None]) / scale, (sh, sw))

    edges, vis0, thick, _gap = slice_layout(t)
    # Paint farther slices first so a nearer overlap wins by later writes... 
    # Hits are resolved by front-most z inside each slice; slices don't overlap in y.
    for i in range(N_SLICES):
        y0 = float(vis0[i])
        y1 = y0 + thick
        mask = (yg >= y0) & (yg < y1)
        if not np.any(mask):
            continue
        ys = yg[mask]
        xs = xg[mask]
        anat_y = float(edges[i]) + (ys - y0)
        theta = 2.0 * np.pi * (BASE_TURNS + REL_TURNS[i]) * t
        cth = float(np.cos(theta))
        sth = float(np.sin(theta))
        stripe = PINK if (i % 2 == 0) else BLUE

        best_z = np.full(xs.shape, -1e9, np.float32)
        best_nx = np.zeros_like(xs)
        best_ny = np.zeros_like(xs)
        best_nz = np.zeros_like(xs)
        best_rgb = np.zeros((xs.shape[0], 3), np.float32)
        best_spec = np.ones(xs.shape, np.float32)
        best_pow = np.full(xs.shape, 36.0, np.float32)
        best_body = np.zeros(xs.shape, dtype=bool)
        any_hit = np.zeros(xs.shape, dtype=bool)

        for shape in SHAPES:
            hit, z, nx, ny, nz = hit_ellipsoid(xs, anat_y, cth, sth, shape["c"], shape["r"])
            # Rotate normal into world (slice spin is around Y).
            nwx = nx * cth + nz * sth
            nwz = -nx * sth + nz * cth
            nwy = ny
            better = hit & (z > best_z)
            best_z = np.where(better, z, best_z)
            best_nx = np.where(better, nwx, best_nx)
            best_ny = np.where(better, nwy, best_ny)
            best_nz = np.where(better, nwz, best_nz)
            col = stripe if shape["color"] is None else shape["color"]
            best_rgb[better] = col
            best_spec = np.where(better, shape["spec"], best_spec)
            best_pow = np.where(better, shape["power"], best_pow)
            best_body = np.where(better, shape["color"] is None, best_body)
            any_hit |= better

        if not np.any(any_hit):
            continue

        frac = (ys - y0) / thick
        # Bevel on the plastic head only, so the cut doesn't slash through the lenses.
        bevel = np.clip((frac - 0.78) / 0.22, 0.0, 1.0) * best_body
        best_ny = best_ny * (1.0 - 0.65 * bevel) + 1.15 * bevel
        rgb = shade(best_rgb, best_nx, best_ny, best_nz, best_spec, best_pow)
        lip = np.clip((frac - 0.9) / 0.1, 0.0, 1.0) * best_body
        rgb = np.clip(rgb + lip[..., None] * 0.28, 0, 1)
        foot = np.clip(frac / 0.14, 0.0, 1.0)
        rgb = rgb * np.where(best_body, 0.7 + 0.3 * foot, 1.0)[..., None]

        block = np.zeros((ys.shape[0], 4), np.float32)
        block[any_hit, :3] = rgb[any_hit]
        block[any_hit, 3] = 1.0
        sprite[mask] = block

    return sprite, (ox, oy)


def paste_rgb(dst, src, x, y):
    sh, sw = src.shape[:2]
    dh, dw = dst.shape[:2]
    x0, y0 = int(round(x)), int(round(y))
    sx0 = max(0, -x0)
    sy0 = max(0, -y0)
    sx1 = sw - max(0, x0 + sw - dw)
    sy1 = sh - max(0, y0 + sh - dh)
    if sx1 <= sx0 or sy1 <= sy0:
        return
    cut = src[sy0:sy1, sx0:sx1]
    a = cut[..., 3:4]
    rgb = cut[..., :3]
    view = dst[y0 + sy0 : y0 + sy1, x0 + sx0 : x0 + sx1]
    view[...] = rgb * a + view * (1.0 - a)


def background(w, h):
    yy = np.linspace(-1.05, 1.15, h, dtype=np.float32)[:, None]
    xx = np.linspace(-1.0, 1.0, w, dtype=np.float32)[None, :]
    r = np.sqrt((xx * 1.02) ** 2 + (yy * 0.9) ** 2)
    t = np.clip(r / 1.2, 0, 1)[..., None]
    center = np.array([0.08, 0.30, 0.98], np.float32)
    edge = np.array([0.015, 0.07, 0.55], np.float32)
    return center * (1 - t) + edge * t


def composite_frame(t, w, h, scale):
    frame = background(w, h)
    sprite_size = (int(scale * 3.05), int(scale * 3.55))
    sprite, (ox, oy) = render_sprite(t, scale, sprite_size)
    cols = [int(w * x) for x in (0.02, 0.26, 0.50, 0.74, 0.98)]
    rows = (int(h * 0.28), int(h * 0.76))
    for cy in rows:
        for cx in cols:
            paste_rgb(frame, sprite, cx - ox, cy - oy)
    vig = np.sqrt(
        (np.linspace(-1, 1, w, dtype=np.float32)[None, :]) ** 2
        + (np.linspace(-1, 1, h, dtype=np.float32)[:, None]) ** 2
    )
    frame *= (1.0 - 0.18 * np.clip(vig - 0.45, 0, 1))[..., None]
    return np.clip(frame, 0, 1)


def write_png(path, rgb):
    Image.fromarray((np.clip(rgb, 0, 1) * 255).astype(np.uint8), "RGB").save(path)


def render_video(path, seconds, fps, w, h, scale):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    cmd = [
        "ffmpeg",
        "-y",
        "-f",
        "rawvideo",
        "-pix_fmt",
        "rgb24",
        "-s",
        f"{w}x{h}",
        "-r",
        str(fps),
        "-i",
        "pipe:0",
        "-an",
        "-c:v",
        "libx264",
        "-pix_fmt",
        "yuv420p",
        "-crf",
        "17",
        "-preset",
        "medium",
        "-movflags",
        "+faststart",
        str(path),
    ]
    proc = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    n = int(round(seconds * fps))
    try:
        for i in range(n):
            rgb = composite_frame(i / n, w, h, scale)
            proc.stdin.write((rgb * 255).astype(np.uint8).tobytes())
            if i % 10 == 0 or i == n - 1:
                print(f"frame {i + 1}/{n}", flush=True)
    finally:
        proc.stdin.close()
        code = proc.wait()
    if code != 0:
        raise SystemExit(f"ffmpeg exited {code}")
    return path


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--output", default="video/output/cat-heads-spinning.mp4")
    p.add_argument("--seconds", type=float, default=10.0)
    p.add_argument("--fps", type=int, default=30)
    p.add_argument("--width", type=int, default=1920)
    p.add_argument("--height", type=int, default=1080)
    p.add_argument("--scale", type=float, default=240.0)
    p.add_argument("--stills", action="store_true")
    p.add_argument("--still-dir", default="/tmp/cat_heads")
    args = p.parse_args()

    if args.stills:
        out = Path(args.still_dir)
        out.mkdir(parents=True, exist_ok=True)
        for t in (0.0, 0.083, 0.25, 0.5):
            rgb = composite_frame(t, args.width, args.height, args.scale)
            dest = out / f"t_{t:.2f}.png"
            write_png(dest, rgb)
            print(dest, flush=True)
        return

    render_video(args.output, args.seconds, args.fps, args.width, args.height, args.scale)
    print(args.output)


if __name__ == "__main__":
    main()
