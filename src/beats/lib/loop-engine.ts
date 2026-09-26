import { getAudioContext, getBuffer, peekBuffer, unlockAudio } from "@/lib/audio-cache";

export type LoopHit = { id: string; path: string; offset: number };
export type LoopSection = { id: string; hits: LoopHit[] };

let generation = 0;
let loopSrc: AudioBufferSourceNode | null = null;
let loopStart = 0;
let loopDur = 0;
let loopPath: string | null = null;
let sections: LoopSection[] = [];
let loopsPerSection = 2;
let timer = 0;
let seq = 0;
let lastPlaying = -1;
let playingListener: ((index: number) => void) | null = null;
let countTicket = 0;
const countTimers: number[] = [];
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

function sectionIndexForCycle(cycle: number) {
  if (!sections.length) return 0;
  const span = Math.max(1, loopsPerSection);
  const n = Math.floor(cycle / span);
  return ((n % sections.length) + sections.length) % sections.length;
}

function notifyPlaying(index: number) {
  if (index === lastPlaying) return;
  lastPlaying = index;
  playingListener?.(index);
}

function arm() {
  const tick = () => {
    if (!loopDur || !loopSrc) return;
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    const cycleNow = Math.floor((now - loopStart) / loopDur);
    notifyPlaying(sectionIndexForCycle(Math.max(0, cycleNow)));
    const horizon = now + 0.28;
    for (let cycle = Math.max(0, cycleNow); cycle <= cycleNow + 1; cycle++) {
      const section = sections[sectionIndexForCycle(cycle)];
      if (!section) continue;
      for (const hit of section.hits) {
        const when = loopStart + cycle * loopDur + hit.offset;
        if (when < now + 0.04 || when > horizon) continue;
        const key = `${hit.id}:${cycle}`;
        if (fired.has(key)) continue;
        fired.add(key);
        trigger(hit.path, when);
      }
    }
    if (fired.size > 800) {
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

/** Replace whatever is playing with this loop. Clears section patterns. */
export async function startLoop(path: string) {
  const ticket = ++generation;
  await unlockAudio();
  const buf = await getBuffer(path);
  if (ticket !== generation) return;
  stopSource();
  sections = [];
  fired.clear();
  lastPlaying = -1;
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

function clearCountTimers() {
  for (const id of countTimers) window.clearTimeout(id);
  countTimers.length = 0;
}

export function cancelCountIn() {
  countTicket += 1;
  clearCountTimers();
}

export function stopLoop() {
  generation += 1;
  cancelCountIn();
  stopSource();
  loopPath = null;
  loopDur = 0;
  loopStart = 0;
  sections = [];
  fired.clear();
  lastPlaying = -1;
}

function restartLoopAt(when: number) {
  if (!loopPath) return;
  const buf = peekBuffer(loopPath);
  if (!buf) return;
  stopSource();
  const ctx = getAudioContext();
  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.loop = true;
  src.connect(ctx.destination);
  const at = Math.max(when, ctx.currentTime);
  src.start(at);
  loopSrc = src;
  loopStart = at;
  loopDur = buf.duration;
  fired.clear();
  lastPlaying = -1;
  arm();
}

/** Bring the loop back from the top if count-in stopped it. */
export function resumeLoop() {
  if (loopSrc || !loopPath) return;
  restartLoopAt(getAudioContext().currentTime + 0.03);
}

/** 0–1 position inside the current pass of the base loop. */
export function loopProgress() {
  if (!loopDur || !loopPath || !loopSrc) return 0;
  const elapsed = getAudioContext().currentTime - loopStart;
  let progress = elapsed / loopDur;
  progress -= Math.floor(progress);
  return progress < 0 ? progress + 1 : progress;
}

function clickAt(when: number, accent: boolean) {
  const ctx = getAudioContext();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.frequency.value = accent ? 1200 : 800;
  gain.gain.value = accent ? 0.12 : 0.07;
  osc.connect(gain);
  gain.connect(ctx.destination);
  const start = Math.max(when, ctx.currentTime);
  osc.start(start);
  osc.stop(start + 0.05);
}

/**
 * Stop the loop, play a 1–2–3–4 count, then start it again from the top.
 * Resolves when recording should begin, on that downbeat.
 */
export function countIn(beatsInLoop: number, onBeat: (beat: number | null) => void) {
  const ticket = ++countTicket;
  clearCountTimers();
  if (!loopDur || !loopPath || !peekBuffer(loopPath)) {
    onBeat(null);
    return Promise.resolve(false);
  }
  stopSource();
  const ctx = getAudioContext();
  const beat = loopDur / Math.max(4, beatsInLoop);
  const now = ctx.currentTime;
  const startAt = now + beat * 4;

  for (let i = 0; i < 4; i++) {
    const when = startAt - (4 - i) * beat;
    clickAt(when, i === 0);
    const shown = i + 1;
    const id = window.setTimeout(() => {
      if (ticket !== countTicket) return;
      onBeat(shown);
    }, Math.max(0, (when - now) * 1000));
    countTimers.push(id);
  }

  return new Promise<boolean>((resolve) => {
    const id = window.setTimeout(() => {
      if (ticket !== countTicket) {
        resolve(false);
        return;
      }
      restartLoopAt(startAt);
      onBeat(null);
      resolve(true);
    }, Math.max(0, (startAt - now) * 1000));
    countTimers.push(id);
  });
}

/** Audition a one-shot without writing it into the arrangement. */
export function preview(path: string) {
  const ctx = getAudioContext();
  if (ctx.state === "suspended") void ctx.resume();
  trigger(path, ctx.currentTime);
}

/** How the tapped patterns line up. The base loop itself keeps running. */
export function setArrangement(next: LoopSection[], repeats: number) {
  sections = next.map((section) => ({
    id: section.id,
    hits: section.hits.map((hit) => ({ ...hit })),
  }));
  loopsPerSection = Math.max(1, repeats);
}

export function watchPlayingSection(fn: ((index: number) => void) | null) {
  playingListener = fn;
}

/**
 * Play a one-shot now and return where it landed in the loop.
 * The caller stores it on a section; it sounds again only while that section plays.
 */
export function tapOverdub(path: string): LoopHit | null {
  const ctx = getAudioContext();
  if (ctx.state === "suspended") void ctx.resume();
  const now = ctx.currentTime;
  trigger(path, now);
  if (!loopDur || !loopPath) return null;
  let offset = (now - loopStart) % loopDur;
  if (offset < 0) offset += loopDur;
  return { id: String(++seq), path, offset };
}
