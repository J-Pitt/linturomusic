import { getAudioContext, getBuffer, peekBuffer, unlockAudio } from "@/lib/audio-cache";

export type LoopHit = { id: string; path: string; offset: number };
export type LoopSection = { id: string; hits: LoopHit[]; loopPath: string | null };
export type SectionSpan = {
  id: string;
  loopPath: string | null;
  start: number;
  hold: number;
  loopDur: number;
};

/** Same assumed tempo as the guided loop list, so the grid and the snap share one beat. */
const GRID_BPM = 140;

/** Every section is eight beats. Duplicate on the sections screen plays that eight twice. */
export const SECTION_BEATS = 8;

export function sectionSeconds() {
  return (SECTION_BEATS * 60) / GRID_BPM;
}

export function beatsInDuration(duration: number) {
  if (duration <= 0) return 1;
  return Math.max(1, Math.round((duration * GRID_BPM) / 60));
}

export function snapToBeat(offset: number, loopDur: number) {
  const beats = beatsInDuration(loopDur);
  const beat = loopDur / beats;
  let snapped = Math.round(offset / beat) * beat;
  if (snapped >= loopDur - 1e-4) snapped = 0;
  if (snapped < 0) snapped = 0;
  return snapped;
}

let generation = 0;
let loopSrc: AudioBufferSourceNode | null = null;
let voices: AudioBufferSourceNode[] = [];
let loopStart = 0;
let loopDur = 0;
let loopPath: string | null = null;
let arrangementStart = 0;
let arrangementOn = false;
let sections: LoopSection[] = [];
let loopsPerSection = 1;
let timer = 0;
let seq = 0;
let lastPlaying = -1;
let playingListener: ((index: number) => void) | null = null;
let paused = false;
let pausedProgress = 0;
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

function stopVoices() {
  clearTimer();
  const all = loopSrc ? [loopSrc, ...voices] : voices;
  loopSrc = null;
  voices = [];
  for (const src of all) {
    try {
      src.stop();
    } catch {
      /* already stopped */
    }
    src.disconnect();
  }
}

function notifyPlaying(index: number) {
  if (index === lastPlaying) return;
  lastPlaying = index;
  playingListener?.(index);
}

function loopLength(path: string | null, fallback: number) {
  if (!path) return fallback;
  return peekBuffer(path)?.duration || fallback;
}

/** First eight beats of the loop. Shorter files stay as they are. */
function windowLength(path: string | null, fallback: number) {
  return Math.min(loopLength(path, fallback), sectionSeconds());
}

export function sectionSpans(): { spans: SectionSpan[]; total: number } {
  const first = sections.find((section) => section.loopPath && peekBuffer(section.loopPath));
  const fallback = first?.loopPath ? peekBuffer(first.loopPath)?.duration || loopDur || 4 : loopDur || 4;
  let cursor = 0;
  const spans: SectionSpan[] = sections.map((section) => {
    const one = windowLength(section.loopPath, fallback);
    const hold = one * Math.max(1, loopsPerSection);
    const span = {
      id: section.id,
      loopPath: section.loopPath,
      start: cursor,
      hold,
      loopDur: one,
    };
    cursor += hold;
    return span;
  });
  return { spans, total: Math.max(cursor, 0.01) };
}

function arm() {
  const tick = () => {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    if (arrangementOn && sections.length) {
      scheduleArrangement(ctx, now);
    }
    timer = window.setTimeout(tick, 40);
  };
  clearTimer();
  timer = window.setTimeout(tick, 40);
}

function scheduleArrangement(ctx: AudioContext, now: number) {
  const { spans, total } = sectionSpans();
  const elapsed = now - arrangementStart;
  const pass = Math.floor(elapsed / total);
  const pos = elapsed - pass * total;
  const index = spans.findIndex((span) => pos >= span.start && pos < span.start + span.hold - 1e-4);
  notifyPlaying(index < 0 ? 0 : index);
  const horizon = now + 0.35;

  for (let passI = Math.max(0, pass); passI <= pass + 1; passI++) {
    for (const span of spans) {
      const section = sections.find((item) => item.id === span.id);
      if (!section) continue;
      const sectionStart = arrangementStart + passI * total + span.start;
      const voiceKey = `sec:${span.id}:${passI}`;
      if (!fired.has(voiceKey) && sectionStart < horizon && sectionStart + span.hold > now + 0.03) {
        fired.add(voiceKey);
        const buf = span.loopPath ? peekBuffer(span.loopPath) : null;
        if (buf) {
          const src = ctx.createBufferSource();
          src.buffer = buf;
          src.loop = true;
          const window = Math.min(buf.duration, span.loopDur);
          src.loopStart = 0;
          src.loopEnd = window;
          src.connect(ctx.destination);
          const late = Math.max(0, now - sectionStart);
          const offset = late % window;
          const startAt = Math.max(sectionStart, now);
          try {
            src.start(startAt, offset);
            const end = sectionStart + span.hold;
            if (end > startAt) src.stop(end);
            voices.push(src);
          } catch {
            /* already passed */
          }
        }
      }
      const repeats = Math.max(1, Math.round(span.hold / Math.max(span.loopDur, 0.01)));
      for (let repeat = 0; repeat < repeats; repeat++) {
        for (const hit of section.hits) {
          const when = sectionStart + repeat * span.loopDur + hit.offset;
          if (when < now + 0.04 || when > horizon) continue;
          const key = `${hit.id}:${repeat}:${passI}`;
          if (fired.has(key)) continue;
          fired.add(key);
          trigger(hit.path, when);
        }
      }
    }
  }

  if (fired.size > 1200) {
    for (const key of fired) {
      const cycle = Number(key.slice(key.lastIndexOf(":") + 1));
      if (cycle < pass - 1) fired.delete(key);
    }
  }
}

/** Replace whatever is playing with this loop. Clears section patterns. */
export async function startLoop(path: string) {
  const ticket = ++generation;
  await unlockAudio();
  const buf = await getBuffer(path);
  if (ticket !== generation) return;
  stopVoices();
  sections = [];
  arrangementOn = false;
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
  arrangementStart = at;
  loopDur = buf.duration;
  loopPath = path;
  paused = false;
  pausedProgress = 0;
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
  stopVoices();
  loopPath = null;
  loopDur = 0;
  loopStart = 0;
  arrangementStart = 0;
  arrangementOn = false;
  sections = [];
  fired.clear();
  lastPlaying = -1;
  paused = false;
  pausedProgress = 0;
}

/** How the tapped patterns line up. Starts the full arrangement the first time sections arrive. */
export function setArrangement(next: LoopSection[], repeats: number) {
  const starting = !arrangementOn && next.length > 0 && !paused;
  const repeatsChanged = loopsPerSection !== Math.max(1, repeats);
  sections = next.map((section) => ({
    id: section.id,
    loopPath: section.loopPath,
    hits: section.hits.map((hit) => ({ ...hit })),
  }));
  loopsPerSection = Math.max(1, repeats);
  if (!next.length || paused) return;
  if (starting || repeatsChanged) {
    stopVoices();
    fired.clear();
    lastPlaying = -1;
    arrangementOn = true;
    arrangementStart = getAudioContext().currentTime + 0.03;
    arm();
  } else if (!timer) {
    arrangementOn = true;
    arm();
  }
}

/** 0–1 position across the whole arrangement, including blank sections. */
export function arrangementProgress() {
  if (paused) return pausedProgress;
  if (!arrangementOn || !sections.length) {
    if (!loopDur || !loopPath || !loopSrc) return 0;
    let progress = (getAudioContext().currentTime - loopStart) / loopDur;
    progress -= Math.floor(progress);
    return progress < 0 ? progress + 1 : progress;
  }
  const { total } = sectionSpans();
  let progress = (getAudioContext().currentTime - arrangementStart) / total;
  progress -= Math.floor(progress);
  return progress < 0 ? progress + 1 : progress;
}

export function loopProgress() {
  return arrangementProgress();
}

/** Silence the loop or arrangement and keep the beat so it can start again. */
export function pausePlayback() {
  cancelCountIn();
  if (arrangementOn && sections.length) {
    const { total } = sectionSpans();
    let progress = (getAudioContext().currentTime - arrangementStart) / total;
    progress -= Math.floor(progress);
    pausedProgress = progress < 0 ? progress + 1 : progress;
  } else if (loopDur > 0 && loopPath) {
    let progress = (getAudioContext().currentTime - loopStart) / loopDur;
    progress -= Math.floor(progress);
    pausedProgress = progress < 0 ? progress + 1 : progress;
  }
  stopVoices();
  paused = true;
}

/** Bring the arrangement back from the top if count-in or stop silenced it. */
export function resumeLoop() {
  paused = false;
  if (!sections.length) {
    if (loopSrc || !loopPath) return;
    const buf = peekBuffer(loopPath);
    if (!buf) return;
    const ctx = getAudioContext();
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    src.connect(ctx.destination);
    const at = ctx.currentTime + 0.03;
    src.start(at);
    loopSrc = src;
    loopStart = at;
    return;
  }
  if (timer) return;
  arrangementOn = true;
  arrangementStart = getAudioContext().currentTime + 0.03;
  fired.clear();
  arm();
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
 * Stop playback, play a 1–2–3–4 count, then start the whole arrangement from the top.
 */
export function countIn(beatsInLoop: number, onBeat: (beat: number | null) => void) {
  const ticket = ++countTicket;
  clearCountTimers();
  const dur = sectionSpans().spans[0]?.loopDur || loopDur;
  if (!dur) {
    onBeat(null);
    return Promise.resolve(false);
  }
  stopVoices();
  paused = true;
  const ctx = getAudioContext();
  const beat = dur / Math.max(4, beatsInLoop);
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
      paused = false;
      arrangementOn = sections.length > 0;
      arrangementStart = Math.max(startAt, getAudioContext().currentTime);
      fired.clear();
      lastPlaying = -1;
      if (arrangementOn) arm();
      else if (loopPath && peekBuffer(loopPath)) {
        const buf = peekBuffer(loopPath);
        if (buf) {
          const src = ctx.createBufferSource();
          src.buffer = buf;
          src.loop = true;
          src.connect(ctx.destination);
          src.start(arrangementStart);
          loopSrc = src;
          loopStart = arrangementStart;
        }
      }
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

export function watchPlayingSection(fn: ((index: number) => void) | null) {
  playingListener = fn;
}

/**
 * Play a one-shot now and return where it landed in the current section's loop.
 */
export function tapOverdub(path: string): LoopHit | null {
  const ctx = getAudioContext();
  if (ctx.state === "suspended") void ctx.resume();
  const now = ctx.currentTime;
  trigger(path, now);
  if (arrangementOn && sections.length) {
    const { spans, total } = sectionSpans();
    let pos = (now - arrangementStart) % total;
    if (pos < 0) pos += total;
    const span = spans.find((item) => pos >= item.start && pos < item.start + item.hold) ?? spans[0];
    if (!span) return null;
    let offset = (pos - span.start) % span.loopDur;
    if (offset < 0) offset += span.loopDur;
    return { id: String(++seq), path, offset: snapToBeat(offset, span.loopDur) };
  }
  if (!loopDur || !loopPath) return null;
  let offset = (now - loopStart) % loopDur;
  if (offset < 0) offset += loopDur;
  return { id: String(++seq), path, offset: snapToBeat(offset, loopDur) };
}

/** Mix one full pass of the arrangement, including blanks and tapped hits. */
export async function renderArrangement(): Promise<AudioBuffer | null> {
  const { spans, total } = sectionSpans();
  if (!spans.length) return null;
  const live = getAudioContext();
  const needed = new Set<string>();
  for (const span of spans) {
    if (span.loopPath) needed.add(span.loopPath);
  }
  for (const section of sections) {
    for (const hit of section.hits) needed.add(hit.path);
  }
  await Promise.all(
    [...needed].map(async (path) => {
      if (peekBuffer(path) || path.startsWith("sample:")) return;
      await getBuffer(path).catch(() => null);
    }),
  );
  const length = Math.max(1, Math.ceil(total * live.sampleRate));
  const offline = new OfflineAudioContext(2, length, live.sampleRate);
  for (const span of spans) {
    const loop = span.loopPath ? peekBuffer(span.loopPath) : null;
    if (loop) {
      const src = offline.createBufferSource();
      src.buffer = loop;
      src.loop = true;
      src.loopStart = 0;
      src.loopEnd = Math.min(loop.duration, span.loopDur);
      src.connect(offline.destination);
      src.start(span.start);
      src.stop(span.start + span.hold);
    }
    const section = sections.find((item) => item.id === span.id);
    if (!section) continue;
    const repeats = Math.max(1, Math.round(span.hold / Math.max(span.loopDur, 0.01)));
    for (let repeat = 0; repeat < repeats; repeat++) {
      for (const hit of section.hits) {
        const buf = peekBuffer(hit.path);
        if (!buf) continue;
        const when = span.start + repeat * span.loopDur + hit.offset;
        if (when >= total) continue;
        const src = offline.createBufferSource();
        src.buffer = buf;
        src.connect(offline.destination);
        src.start(when);
      }
    }
  }
  return offline.startRendering();
}
