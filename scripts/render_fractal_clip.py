#!/usr/bin/env python3
"""Render a zooming Mandelbrot clip as MP4 (faster than ffmpeg's mandelbrot filter)."""

from __future__ import annotations

import argparse
import math
import sys
from pathlib import Path

import imageio
import numpy as np

# Seahorse Valley — smooth zoom target
CENTER_X = -0.743643887037151
CENTER_Y = 0.13182590420531175
START_SCALE = 3.5
END_SCALE = 0.000015


def smoothstep(t: float) -> float:
    t = max(0.0, min(1.0, t))
    return t * t * (3.0 - 2.0 * t)


def scale_at(progress: float) -> float:
    # Log-space zoom feels like constant motion.
    log_start = math.log(START_SCALE)
    log_end = math.log(END_SCALE)
    return math.exp(log_start + (log_end - log_start) * smoothstep(progress))


def mandelbrot(width: int, height: int, center_x: float, center_y: float, scale: float, max_iter: int) -> np.ndarray:
    aspect = width / height
    y = np.linspace(center_y - scale / 2, center_y + scale / 2, height, dtype=np.float64)
    x = np.linspace(center_x - scale * aspect / 2, center_x + scale * aspect / 2, width, dtype=np.float64)
    c = x[np.newaxis, :] + 1j * y[:, np.newaxis]
    z = np.zeros_like(c)
    div_time = np.zeros(z.shape, dtype=np.int32)
    mask = np.full(z.shape, True, dtype=bool)

    for i in range(max_iter):
        z[mask] = z[mask] * z[mask] + c[mask]
        escaped = np.greater(np.abs(z), 2.0, where=mask, out=np.zeros(z.shape, dtype=bool))
        div_time[escaped & mask] = i
        mask &= ~escaped

    div_time[mask] = max_iter
    return div_time


def colorize(iterations: np.ndarray, max_iter: int) -> np.ndarray:
    """Map iteration counts to RGB uint8."""
    t = iterations.astype(np.float32) / max_iter
    # Purple / magenta / cyan palette
    r = np.sin(2.4 * math.pi * t + 0.2) * 0.5 + 0.5
    g = np.sin(2.4 * math.pi * t + 2.0) * 0.5 + 0.5
    b = np.sin(2.4 * math.pi * t + 3.6) * 0.5 + 0.5
    rgb = np.stack([r, g, b], axis=-1)
    inside = iterations >= max_iter
    rgb[inside] = (0.02, 0.0, 0.06)
    return (rgb * 255).astype(np.uint8)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--width", type=int, default=1280)
    parser.add_argument("--height", type=int, default=720)
    parser.add_argument("--fps", type=int, default=24)
    parser.add_argument("--seconds", type=int, default=120)
    parser.add_argument("--max-iter", type=int, default=96)
    args = parser.parse_args()

    total_frames = args.fps * args.seconds
    args.output.parent.mkdir(parents=True, exist_ok=True)

    print(
        f"Rendering {args.seconds}s @ {args.width}x{args.height} ({total_frames} frames)...",
        flush=True,
    )

    writer = imageio.get_writer(
        args.output,
        fps=args.fps,
        codec="libx264",
        pixelformat="yuv420p",
        quality=8,
        macro_block_size=1,
    )
    try:
        for frame_idx in range(total_frames):
            progress = frame_idx / max(total_frames - 1, 1)
            scale = scale_at(progress)
            iters = mandelbrot(args.width, args.height, CENTER_X, CENTER_Y, scale, args.max_iter)
            writer.append_data(colorize(iters, args.max_iter))
            if frame_idx % args.fps == 0:
                print(f"  {frame_idx}/{total_frames} ({100 * frame_idx / total_frames:.1f}%)", flush=True)
    finally:
        writer.close()

    print(f"Wrote {args.output}", flush=True)
    return 0


if __name__ == "__main__":
    sys.exit(main())
