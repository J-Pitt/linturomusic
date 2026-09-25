import { mediaUrl } from "@/lib/media";

let ctx: AudioContext | null = null;
const buffers = new Map<string, AudioBuffer>();
const peakCache = new Map<string, Float32Array>();
const inflight = new Map<string, Promise<AudioBuffer>>();

export function getAudioContext() {
  if (!ctx) {
    ctx = new AudioContext({ latencyHint: "interactive" });
  }
  return ctx;
}

/** Resume the shared context (call from a user gesture). */
export function unlockAudio(): Promise<void> {
  const audio = getAudioContext();
  if (audio.state === "running") return Promise.resolve();
  return audio.resume();
}

export async function getBuffer(path: string) {
  const hit = buffers.get(path);
  if (hit) return hit;
  const pending = inflight.get(path);
  if (pending) return pending;
  const job = (async () => {
    const audio = getAudioContext();
    const res = await fetch(mediaUrl(path));
    if (!res.ok) throw new Error(`Failed to load ${path}`);
    const arr = await res.arrayBuffer();
    const buf = await audio.decodeAudioData(arr.slice(0));
    buffers.set(path, buf);
    inflight.delete(path);
    return buf;
  })();
  inflight.set(path, job);
  return job;
}

export function hasBuffer(path: string) {
  return buffers.has(path);
}

/** Fire-and-forget decode; safe to call repeatedly. */
export function preloadBuffers(paths: string[]) {
  for (const path of paths) {
    if (buffers.has(path) || inflight.has(path)) continue;
    void getBuffer(path).catch(() => null);
  }
}

/**
 * Lowest-latency one-shot: starts immediately if the buffer is cached.
 * If not cached yet, loads then plays (first hit may be late; subsequent hits are instant).
 */
export function playOneShot(path: string): void {
  const audio = getAudioContext();
  if (audio.state === "suspended") void audio.resume();

  const buf = buffers.get(path);
  if (!buf) {
    void getBuffer(path)
      .then(() => playOneShot(path))
      .catch(() => null);
    return;
  }

  const src = audio.createBufferSource();
  src.buffer = buf;
  src.connect(audio.destination);
  src.start();
}

export function peaksFromChannel(data: Float32Array, buckets: number) {
  const peaks = new Float32Array(buckets);
  const step = data.length / buckets;
  for (let i = 0; i < buckets; i++) {
    const start = Math.floor(i * step);
    const end = Math.max(start + 1, Math.floor((i + 1) * step));
    let max = 0;
    for (let s = start; s < end; s++) {
      const v = Math.abs(data[s] ?? 0);
      if (v > max) max = v;
    }
    peaks[i] = max;
  }
  return peaks;
}

export async function getPeaks(path: string, buckets = 2048) {
  const key = `${path}:${buckets}`;
  const hit = peakCache.get(key);
  if (hit) return hit;
  const buf = await getBuffer(path);
  const peaks = peaksFromChannel(buf.getChannelData(0), buckets);
  peakCache.set(key, peaks);
  return peaks;
}
