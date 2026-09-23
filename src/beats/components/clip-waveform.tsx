
import { useEffect, useRef } from "react";
import { getBuffer, getPeaks } from "@/lib/audio-cache";

export function ClipWaveform({
  path,
  lengthBeats,
  bpm,
  width,
  height,
  dark,
}: {
  path: string;
  lengthBeats: number;
  bpm: number;
  width: number;
  height: number;
  dark?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || width < 8 || height < 8) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.max(1, Math.floor(width * dpr));
    canvas.height = Math.max(1, Math.floor(height * dpr));
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let cancelled = false;
    void (async () => {
      try {
        const [peaks, buf] = await Promise.all([getPeaks(path), getBuffer(path)]);
        if (cancelled || !canvasRef.current) return;
        const clipSec = Math.max(0.05, (lengthBeats * 60) / Math.max(1, bpm));
        const fraction = Math.min(1, clipSec / Math.max(buf.duration, 0.01));
        const slice = Math.max(8, Math.floor(peaks.length * fraction));
        drawWave(ctx, peaks, slice, canvas.width, canvas.height, dark);
      } catch {
        /* keep empty clip if decode fails */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [path, lengthBeats, bpm, width, height, dark]);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 h-full w-full"
      aria-hidden
    />
  );
}

function drawWave(
  ctx: CanvasRenderingContext2D,
  peaks: Float32Array,
  slice: number,
  w: number,
  h: number,
  dark?: boolean
) {
  ctx.clearRect(0, 0, w, h);
  const mid = h / 2;
  const bars = Math.max(8, Math.min(slice, Math.floor(w / 1.5)));
  const gap = w / bars;
  ctx.fillStyle = dark ? "rgba(20, 16, 8, 0.55)" : "rgba(255, 255, 255, 0.82)";
  for (let i = 0; i < bars; i++) {
    const idx = Math.min(slice - 1, Math.floor((i / bars) * slice));
    const amp = peaks[idx] ?? 0;
    const mag = Math.max(1, amp * (h * 0.86));
    const x = i * gap;
    ctx.fillRect(x, mid - mag / 2, Math.max(1, gap * 0.72), mag);
  }
}
