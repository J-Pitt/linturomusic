import { mediaUrl } from "@/lib/media";

let ctx: AudioContext | null = null;
const buffers = new Map<string, AudioBuffer>();
const peakCache = new Map<string, Float32Array>();
const inflight = new Map<string, Promise<AudioBuffer>>();
const punchSeconds = new Map<string, number>();

/** Keep only the attack of a long 808 so the tone does not ring. */
function trimToPunch(buffer: AudioBuffer, seconds: number) {
  const audio = getAudioContext();
  const frames = Math.min(buffer.length, Math.max(1, Math.floor(seconds * buffer.sampleRate)));
  const out = audio.createBuffer(buffer.numberOfChannels, frames, buffer.sampleRate);
  const fadeStart = Math.floor(frames * 0.28);
  for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
    const source = buffer.getChannelData(channel);
    const target = out.getChannelData(channel);
    for (let i = 0; i < frames; i++) {
      let gain = 1;
      if (i >= fadeStart) {
        const t = (i - fadeStart) / Math.max(1, frames - fadeStart);
        gain = Math.cos((t * Math.PI) / 2);
      }
      target[i] = (source[i] ?? 0) * gain;
    }
  }
  return out;
}

export function usePunch(path: string, seconds: number) {
  punchSeconds.set(path, seconds);
  const existing = buffers.get(path);
  if (!existing || existing.duration <= seconds + 0.02) return;
  buffers.set(path, trimToPunch(existing, seconds));
  for (const key of peakCache.keys()) {
    if (key.startsWith(`${path}:`)) peakCache.delete(key);
  }
}

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
    const punch = punchSeconds.get(path);
    const stored = punch ? trimToPunch(buf, punch) : buf;
    buffers.set(path, stored);
    inflight.delete(path);
    return stored;
  })();
  inflight.set(path, job);
  return job;
}

export function hasBuffer(path: string) {
  return buffers.has(path);
}

export function peekBuffer(path: string) {
  return buffers.get(path) ?? null;
}

/** Keep a recorded sample in the same cache the pads and the beat use. */
export function putBuffer(path: string, buffer: AudioBuffer) {
  buffers.set(path, buffer);
  for (const key of peakCache.keys()) {
    if (key.startsWith(`${path}:`)) peakCache.delete(key);
  }
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

export function peekPeaks(path: string, buckets = 2048) {
  return peakCache.get(`${path}:${buckets}`) ?? null;
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
