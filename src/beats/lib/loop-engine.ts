import { getAudioContext, getBuffer, peekBuffer, unlockAudio } from "@/lib/audio-cache";

type Overdub = { id: string; path: string; offset: number };

let generation = 0;
let loopSrc: AudioBufferSourceNode | null = null;
let loopStart = 0;
let loopDur = 0;
let loopPath: string | null = null;
let overdubs: Overdub[] = [];
let timer = 0;
let seq = 0;
const fired = new Set<string>();

function trigger(path: string, when: number) {
  const ctx = getAudioContext();
  const buf = peekBuffer(path);
  if (!buf) {
    void getBuffer(path)
      .then(() => trigger(path, Math.max(when, getAudioContext().currentTime)))
      .catch(() => null);
    return;
  }
  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.connect(ctx.destination);
  try {
    src.start(Math.max(when, ctx.currentTime));
  } catch {
    /* start rejected if the context is closing */
  }
}

function clearTimer() {
  if (!timer) return;
  window.clearTimeout(timer);
  timer = 0;
}

function stopSource() {
  clearTimer();
  if (!loopSrc) return;
  try {
    loopSrc.stop();
  } catch {
    /* already stopped */
  }
  loopSrc.disconnect();
  loopSrc = null;
}

function arm() {
  const tick = () => {
    if (!loopDur || !loopSrc) return;
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    const cycleNow = Math.floor((now - loopStart) / loopDur);
    const horizon = now + 0.28;
    for (const hit of overdubs) {
      for (let cycle = Math.max(0, cycleNow); cycle <= cycleNow + 1; cycle++) {
        const when = loopStart + cycle * loopDur + hit.offset;
        if (when < now + 0.04 || when > horizon) continue;
        const key = `${hit.id}:${cycle}`;
        if (fired.has(key)) continue;
        fired.add(key);
        trigger(hit.path, when);
      }
    }
    if (fired.size > 500) {
      for (const key of fired) {
        const cycle = Number(key.slice(key.lastIndexOf(":") + 1));
        if (cycle < cycleNow - 1) fired.delete(key);
      }
    }
    timer = window.setTimeout(tick, 40);
  };
  clearTimer();
  timer = window.setTimeout(tick, 40);
}

/** Replace whatever is playing with this loop. Clears tapped overdubs. */
export async function startLoop(path: string) {
  const ticket = ++generation;
  await unlockAudio();
  const buf = await getBuffer(path);
  if (ticket !== generation) return;
  stopSource();
  overdubs = [];
  fired.clear();
  const ctx = getAudioContext();
  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.loop = true;
  src.connect(ctx.destination);
  const at = ctx.currentTime + 0.03;
  src.start(at);
  loopSrc = src;
  loopStart = at;
  loopDur = buf.duration;
  loopPath = path;
  arm();
}

export function stopLoop() {
  generation += 1;
  stopSource();
  loopPath = null;
  loopDur = 0;
  loopStart = 0;
  overdubs = [];
  fired.clear();
}

/** Play a one-shot now and again on every pass of the base loop. */
export function tapOverdub(path: string) {
  const ctx = getAudioContext();
  if (ctx.state === "suspended") void ctx.resume();
  const now = ctx.currentTime;
  trigger(path, now);
  if (!loopDur || !loopPath) return;
  let offset = (now - loopStart) % loopDur;
  if (offset < 0) offset += loopDur;
  overdubs.push({ id: String(++seq), path, offset });
}
