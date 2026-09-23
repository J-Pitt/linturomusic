
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type DragEvent,
  type PointerEvent,
} from "react";
import { createPortal } from "react-dom";
import {
  ChevronDown,
  ChevronUp,
  Circle,
  Copy,
  Pause,
  Play,
  Redo2,
  Square,
  Trash2,
  Undo2,
  Volume2,
  VolumeX,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  arrangementEnd,
  BEATS_PER_BAR,
  clipColor,
  clipIsLight,
  clipFromSound,
  type Clip,
  defaultLayers,
  defaultTrack,
  DEFAULT_BARS,
  LAYER_COUNT,
  layerAudible,
  LAYERS,
  type LayerState,
  PX_PER_BEAT,
  QUANTIZE_OPTIONS,
  type QuantizeId,
  quantize,
  TRACK_COUNT,
  TRACK_H,
  TRACK_LABELS,
} from "@/lib/grid";
import { getAudioContext, getBuffer } from "@/lib/audio-cache";
import { ClipWaveform } from "@/components/clip-waveform";
import { SAMPLE_DRAG_MIME } from "@/lib/media";
import type { SoundItem } from "@/lib/types";

const STORAGE_KEY = "trapfog-arrangement-v1";
const RULER_H = 28;
const GRID_PAD = 8;
const HANDLE_H = 10;
const TOOLBAR_H = 96;
const GHOST_H = 6;
const DEFAULT_GRID_H = RULER_H + TRACK_COUNT * TRACK_H + GRID_PAD;
const MIN_GRID_H = RULER_H + TRACK_H + GRID_PAD;

function clampGridH(h: number) {
  const max = Math.max(
    MIN_GRID_H,
    Math.round((typeof window !== "undefined" ? window.innerHeight : 800) * 0.85) - TOOLBAR_H - HANDLE_H
  );
  return Math.max(MIN_GRID_H, Math.min(max, Math.round(h)));
}

export type BeatGridHandle = {
  recordHit: (item: SoundItem) => void;
  addAtPlayhead: (item: SoundItem) => void;
  isRecording: () => boolean;
  toggleRecordWithCountIn: () => void;
};

type BeatGridProps = {
  items: SoundItem[];
  /** Inline full-height panel (mobile) instead of fixed bottom dock. */
  embed?: boolean;
  onRecordState?: (state: { recording: boolean; countInBeat: number | null }) => void;
};

type DragState =
  | { mode: "move"; ids: string[]; originX: number; originY: number; starts: { id: string; start: number; track: number }[] }
  | { mode: "resize"; id: string; originX: number; start: number; length: number }
  | null;

function snapGrid(id: QuantizeId) {
  return QUANTIZE_OPTIONS.find((q) => q.id === id)?.beats ?? 0.25;
}

function cloneClips(clips: Clip[]): Clip[] {
  return clips.map((c) => ({ ...c }));
}

export const BeatGrid = forwardRef<BeatGridHandle, BeatGridProps>(function BeatGrid(
  { items, embed = false, onRecordState },
  ref
) {
  const [clips, setClips] = useState<Clip[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [bpm, setBpm] = useState(140);
  const [quantizeId, setQuantizeId] = useState<QuantizeId>("1/4n");
  const [playing, setPlaying] = useState(false);
  const [recording, setRecording] = useState(false);
  const [countInBeat, setCountInBeat] = useState<number | null>(null);
  const [playhead, setPlayhead] = useState(0);
  const [loop, setLoop] = useState(true);
  const [collapsed, setCollapsed] = useState(false);
  const [bars, setBars] = useState(DEFAULT_BARS);
  const [metronome, setMetronome] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [gridH, setGridH] = useState(DEFAULT_GRID_H);
  const [activeLayer, setActiveLayer] = useState(0);
  const [layers, setLayers] = useState<LayerState[]>(defaultLayers);
  const activeLayerRef = useRef(0);
  const layersRef = useRef(layers);
  const layerGainsRef = useRef<GainNode[]>([]);
  const clickBusRef = useRef<GainNode | null>(null);
  const metronomeRef = useRef(metronome);
  metronomeRef.current = metronome;

  const undoRef = useRef<Clip[][]>([]);
  const redoRef = useRef<Clip[][]>([]);
  const clipboardRef = useRef<Clip[]>([]);
  const clipsRef = useRef(clips);
  const playheadRef = useRef(0);
  const playingRef = useRef(false);
  const recordingRef = useRef(false);
  const countInActiveRef = useRef(false);
  const countInTimerRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const bpmRef = useRef(bpm);
  const loopRef = useRef(loop);
  const quantizeRef = useRef(quantizeId);
  const barsRef = useRef(bars);

  const ctxRef = useRef<AudioContext | null>(null);
  const buffersRef = useRef(new Map<string, AudioBuffer>());
  const voicesRef = useRef<AudioBufferSourceNode[]>([]);
  const clickRef = useRef<OscillatorNode[]>([]);
  const originTimeRef = useRef(0);
  const originBeatRef = useRef(0);
  const rafRef = useRef(0);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const gridRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<DragState>(null);
  const dragSnapshotRef = useRef<Clip[] | null>(null);
  const [hydrated, setHydrated] = useState(false);

  clipsRef.current = clips;
  playheadRef.current = playhead;
  playingRef.current = playing;
  recordingRef.current = recording;
  bpmRef.current = bpm;
  loopRef.current = loop;
  quantizeRef.current = quantizeId;
  barsRef.current = bars;
  activeLayerRef.current = activeLayer;
  layersRef.current = layers;

  const lengthBeats = Math.max(bars * BEATS_PER_BAR, arrangementEnd(clips, bars));
  const gridPx = snapGrid(quantizeId);

  useEffect(() => {
    onRecordState?.({ recording, countInBeat });
  }, [recording, countInBeat, onRecordState]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as {
        clips?: Clip[];
        bpm?: number;
        bars?: number;
        gridH?: number;
        layers?: LayerState[];
        activeLayer?: number;
      };
      if (Array.isArray(parsed.clips)) {
        const known = new Set(items.map((i) => i.path));
        setClips(parsed.clips.filter((c) => known.has(c.path)));
      }
      if (Array.isArray(parsed.layers) && parsed.layers.length === LAYER_COUNT) setLayers(parsed.layers);
      if (typeof parsed.activeLayer === "number") setActiveLayer(parsed.activeLayer);
      if (parsed.bpm) setBpm(parsed.bpm);
      if (parsed.bars) setBars(parsed.bars);
      if (parsed.gridH) setGridH(clampGridH(parsed.gridH));
    } catch {
      /* ignore */
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ clips, bpm, bars, gridH, layers, activeLayer })
    );
  }, [hydrated, clips, bpm, bars, gridH, layers, activeLayer]);

  useEffect(() => {
    const ctx = ctxRef.current;
    layerGainsRef.current.forEach((g, i) => {
      const target = layerAudible(layers, i) ? layers[i].volume : 0;
      if (ctx) g.gain.setTargetAtTime(target, ctx.currentTime, 0.015);
      else g.gain.value = target;
    });
  }, [layers]);

  useEffect(() => {
    if (embed) {
      document.documentElement.style.setProperty("--beat-grid-h", "0px");
      return;
    }
    const dock = HANDLE_H + TOOLBAR_H + (collapsed ? 0 : gridH);
    document.documentElement.style.setProperty("--beat-grid-h", `${dock}px`);
  }, [collapsed, gridH, embed]);

  useEffect(() => {
    const paths = [...new Set(clips.map((c) => c.path))];
    void Promise.all(paths.map((p) => getBuffer(p).catch(() => null)));
  }, [clips]);

  const commit = useCallback((next: Clip[] | ((prev: Clip[]) => Clip[])) => {
    setClips((prev) => {
      const resolved = typeof next === "function" ? next(prev) : next;
      undoRef.current.push(cloneClips(prev));
      if (undoRef.current.length > 80) undoRef.current.shift();
      redoRef.current = [];
      return resolved;
    });
  }, []);

  function undo() {
    const prev = undoRef.current.pop();
    if (!prev) return;
    setClips((cur) => {
      redoRef.current.push(cloneClips(cur));
      return prev;
    });
  }

  function redo() {
    const next = redoRef.current.pop();
    if (!next) return;
    setClips((cur) => {
      undoRef.current.push(cloneClips(cur));
      return next;
    });
  }

  function ensureCtx() {
    const ctx = getAudioContext();
    ctxRef.current = ctx;
    if (layerGainsRef.current.length !== LAYER_COUNT) {
      layerGainsRef.current = Array.from({ length: LAYER_COUNT }, (_, i) => {
        const g = ctx.createGain();
        const state = layersRef.current;
        g.gain.value = layerAudible(state, i) ? state[i].volume : 0;
        g.connect(ctx.destination);
        return g;
      });
    }
    if (!clickBusRef.current) {
      clickBusRef.current = ctx.createGain();
      clickBusRef.current.gain.value = metronomeRef.current ? 1 : 0;
      clickBusRef.current.connect(ctx.destination);
    }
    return ctx;
  }

  async function loadBuffer(path: string) {
    const buf = await getBuffer(path);
    buffersRef.current.set(path, buf);
    return buf;
  }

  function stopVoices() {
    for (const v of voicesRef.current) {
      try {
        v.stop();
      } catch {
        /* already stopped */
      }
    }
    voicesRef.current = [];
    for (const c of clickRef.current) {
      try {
        c.stop();
      } catch {
        /* already stopped */
      }
    }
    clickRef.current = [];
  }

  const stopTransport = useCallback((resetHead = false) => {
    stopVoices();
    playingRef.current = false;
    setPlaying(false);
    if (resetHead) {
      playheadRef.current = 0;
      setPlayhead(0);
      originBeatRef.current = 0;
    }
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
  }, []);

  const scheduleFrom = useCallback(
    async (fromBeat: number) => {
      const ctx = ensureCtx();
      await ctx.resume();
      stopVoices();
      const now = ctx.currentTime + 0.04;
      originTimeRef.current = now;
      originBeatRef.current = fromBeat;
      const bpmNow = bpmRef.current;
      const secPerBeat = 60 / bpmNow;
      const loopLen = barsRef.current * BEATS_PER_BAR;
      const horizon = loopRef.current ? loopLen * 2 : loopLen;

      const unique = [...new Set(clipsRef.current.map((c) => c.path))];
      await Promise.all(unique.map((p) => loadBuffer(p).catch(() => null)));

      const place = (clip: Clip, cycle: number) => {
        const start = clip.start + cycle * loopLen;
        const when = now + (start - fromBeat) * secPerBeat;
        const dur = clip.length * secPerBeat;
        if (when + dur < now - 0.01) return;
        const buf = buffersRef.current.get(clip.path);
        if (!buf) return;
        const src = ctx.createBufferSource();
        src.buffer = buf;
        src.connect(layerGainsRef.current[clip.layer ?? 0] ?? ctx.destination);
        const offset = when < now ? Math.min(buf.duration, now - when) : 0;
        const startAt = Math.max(when, now);
        try {
          src.start(startAt, offset);
          src.stop(when + dur);
        } catch {
          return;
        }
        voicesRef.current.push(src);
      };

      const cycles = loopRef.current ? 3 : 1;
      for (const clip of clipsRef.current) {
        for (let c = 0; c < cycles; c++) place(clip, c);
      }

      if (recordingRef.current) {
        const first = Math.ceil(fromBeat - 1e-6);
        for (let b = first; b <= fromBeat + horizon; b++) {
          const when = now + (b - fromBeat) * secPerBeat;
          if (when < now) continue;
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.frequency.value = b % BEATS_PER_BAR === 0 ? 1200 : 800;
          gain.gain.value = 0.06;
          osc.connect(gain);
          gain.connect(clickBusRef.current ?? ctx.destination);
          osc.start(when);
          osc.stop(when + 0.04);
          clickRef.current.push(osc);
        }
      }

      const tick = () => {
        if (!playingRef.current || !ctxRef.current) return;
        const elapsed = ctxRef.current.currentTime - originTimeRef.current;
        let beat = originBeatRef.current + elapsed * (bpmRef.current / 60);
        const loopLenNow = barsRef.current * BEATS_PER_BAR;
        if (loopRef.current && beat >= loopLenNow) {
          beat = beat % loopLenNow;
          void scheduleFrom(beat);
          return;
        }
        if (!loopRef.current && beat >= loopLenNow) {
          stopTransport(true);
          return;
        }
        playheadRef.current = beat;
        setPlayhead(beat);
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    },
    [stopTransport]
  );

  useEffect(() => {
    const bus = clickBusRef.current;
    const ctx = ctxRef.current;
    if (!bus || !ctx) return;
    bus.gain.setTargetAtTime(metronome ? 1 : 0, ctx.currentTime, 0.005);
  }, [metronome]);

  const play = useCallback(async () => {
    playingRef.current = true;
    setPlaying(true);
    await scheduleFrom(playheadRef.current);
  }, [scheduleFrom]);

  const pause = useCallback(() => {
    const ctx = ctxRef.current;
    if (ctx && playingRef.current) {
      const elapsed = ctx.currentTime - originTimeRef.current;
      playheadRef.current = originBeatRef.current + elapsed * (bpmRef.current / 60);
      setPlayhead(playheadRef.current);
    }
    stopTransport(false);
  }, [stopTransport]);

  const togglePlay = useCallback(() => {
    if (playingRef.current) pause();
    else void play();
  }, [pause, play]);

  const addClip = useCallback(
    (item: SoundItem, start: number, track: number) => {
      const clip = {
        ...clipFromSound(item, start, track, snapGrid(quantizeRef.current)),
        layer: activeLayerRef.current,
      };
      commit((prev) => [...prev, clip]);
      setSelected([clip.id]);
      setBars((b) => Math.max(b, Math.ceil((clip.start + clip.length) / BEATS_PER_BAR)));
      return clip;
    },
    [commit]
  );

  const recordHit = useCallback(
    (item: SoundItem) => {
      if (!recordingRef.current) return;
      if (!playingRef.current) void play();
      addClip(item, playheadRef.current, defaultTrack(item));
    },
    [addClip, play]
  );

  const addAtPlayhead = useCallback(
    (item: SoundItem) => {
      addClip(item, playheadRef.current, defaultTrack(item));
    },
    [addClip]
  );

  function clearCountInTimers() {
    for (const t of countInTimerRef.current) clearTimeout(t);
    countInTimerRef.current = [];
  }

  function scheduleClickAt(when: number, accent: boolean) {
    const ctx = ensureCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = accent ? 1200 : 800;
    gain.gain.value = accent ? 0.12 : 0.07;
    osc.connect(gain);
    gain.connect(clickBusRef.current ?? ctx.destination);
    osc.start(when);
    osc.stop(when + 0.05);
    clickRef.current.push(osc);
  }

  function toggleRecordWithCountIn() {
    if (recordingRef.current || countInActiveRef.current) {
      clearCountInTimers();
      countInActiveRef.current = false;
      setCountInBeat(null);
      recordingRef.current = false;
      setRecording(false);
      pause();
      return;
    }

    void (async () => {
      const ctx = ensureCtx();
      await ctx.resume();
      stopTransport(true);
      const secPerBeat = 60 / bpmRef.current;
      const start = ctx.currentTime + 0.06;
      countInActiveRef.current = true;
      setCountInBeat(0);

      for (let i = 0; i < 4; i++) {
        const at = start + i * secPerBeat;
        scheduleClickAt(at, i === 0);
        const beatNum = i + 1;
        const delay = Math.max(0, (at - ctx.currentTime) * 1000);
        countInTimerRef.current.push(
          setTimeout(() => {
            if (!countInActiveRef.current) return;
            setCountInBeat(beatNum);
          }, delay)
        );
      }

      const goDelay = Math.max(0, (start + 4 * secPerBeat - ctx.currentTime) * 1000);
      countInTimerRef.current.push(
        setTimeout(() => {
          if (!countInActiveRef.current) return;
          countInActiveRef.current = false;
          setCountInBeat(null);
          recordingRef.current = true;
          setRecording(true);
          playheadRef.current = 0;
          setPlayhead(0);
          void play();
        }, goDelay)
      );
    })();
  }

  function toggleRecord() {
    toggleRecordWithCountIn();
  }

  useImperativeHandle(
    ref,
    () => ({
      recordHit,
      addAtPlayhead,
      isRecording: () => recordingRef.current,
      toggleRecordWithCountIn,
    }),
    [addAtPlayhead, recordHit]
  );

  function copySelected() {
    clipboardRef.current = clipsRef.current.filter((c) => selected.includes(c.id)).map((c) => ({ ...c }));
  }

  function pasteClipboard() {
    const src = clipboardRef.current;
    if (!src.length) return;
    const minStart = Math.min(...src.map((c) => c.start));
    const offset = Math.max(0, playheadRef.current - minStart);
    const copies = src.map((c) => ({
      ...c,
      id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      start: quantize(c.start + offset, snapGrid(quantizeRef.current)),
      layer: activeLayerRef.current,
    }));
    commit((prev) => [...prev, ...copies]);
    setSelected(copies.map((c) => c.id));
  }

  function deleteSelected() {
    if (!selected.length) return;
    commit((prev) => prev.filter((c) => !selected.includes(c.id)));
    setSelected([]);
  }

  function quantizeSelected() {
    const g = snapGrid(quantizeRef.current);
    if (!g || !selected.length) return;
    commit((prev) =>
      prev.map((c) => (selected.includes(c.id) ? { ...c, start: quantize(c.start, g) } : c))
    );
  }

  function switchLayer(layer: number) {
    if (layer === activeLayerRef.current) return;
    activeLayerRef.current = layer;
    setActiveLayer(layer);
    setSelected([]);
  }

  function updateLayer(layer: number, patch: Partial<LayerState>) {
    setLayers((prev) => prev.map((l, i) => (i === layer ? { ...l, ...patch } : l)));
  }

  function moveSelectedToLayer(layer: number) {
    if (!selected.length || layer === activeLayerRef.current) return;
    commit((prev) => prev.map((c) => (selected.includes(c.id) ? { ...c, layer } : c)));
    setSelected([]);
    switchLayer(layer);
  }

  function duplicateSelected() {
    const src = clipsRef.current.filter((c) => selected.includes(c.id));
    if (!src.length) return;
    const copies = src.map((c) => ({
      ...c,
      id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      start: c.start + c.length,
    }));
    commit((prev) => [...prev, ...copies]);
    setSelected(copies.map((c) => c.id));
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA") return;
      const meta = e.metaKey || e.ctrlKey;
      const digit = /^Digit([1-3])$/.exec(e.code);
      if (digit && !meta) {
        e.preventDefault();
        const layer = Number(digit[1]) - 1;
        if (e.shiftKey) moveSelectedToLayer(layer);
        else switchLayer(layer);
      } else if ((e.key === "k" || e.key === "K") && !meta) {
        e.preventDefault();
        setMetronome((m) => !m);
      } else if (e.key === "m" || e.key === "M") {
        e.preventDefault();
        const l = activeLayerRef.current;
        updateLayer(l, { muted: !layersRef.current[l].muted });
      } else if (e.key === "s" && !meta) {
        e.preventDefault();
        const l = activeLayerRef.current;
        updateLayer(l, { solo: !layersRef.current[l].solo });
      } else if (e.code === "Space") {
        e.preventDefault();
        togglePlay();
      } else if (e.key === "r" || e.key === "R") {
        e.preventDefault();
        toggleRecord();
      } else if (meta && e.key === "c") {
        e.preventDefault();
        copySelected();
      } else if (meta && e.key === "v") {
        e.preventDefault();
        pasteClipboard();
      } else if (meta && e.key === "x") {
        e.preventDefault();
        copySelected();
        deleteSelected();
      } else if (meta && e.key === "d") {
        e.preventDefault();
        duplicateSelected();
      } else if (meta && e.shiftKey && e.key === "z") {
        e.preventDefault();
        redo();
      } else if (meta && e.key === "z") {
        e.preventDefault();
        undo();
      } else if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        deleteSelected();
      } else if (e.key === "q" || e.key === "Q") {
        e.preventDefault();
        quantizeSelected();
      } else if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        e.preventDefault();
        const delta = (e.key === "ArrowRight" ? 1 : -1) * (snapGrid(quantizeRef.current) || 0.25);
        commit((prev) =>
          prev.map((c) =>
            selected.includes(c.id) ? { ...c, start: Math.max(0, c.start + delta) } : c
          )
        );
      } else if (e.key === "ArrowUp" || e.key === "ArrowDown") {
        e.preventDefault();
        const delta = e.key === "ArrowDown" ? 1 : -1;
        commit((prev) =>
          prev.map((c) =>
            selected.includes(c.id)
              ? { ...c, track: Math.max(0, Math.min(TRACK_COUNT - 1, c.track + delta)) }
              : c
          )
        );
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  useEffect(() => () => {
    clearCountInTimers();
    stopTransport(false);
  }, [stopTransport]);

  function beatAtClientX(clientX: number) {
    const scroller = scrollRef.current;
    if (!scroller) return 0;
    const rect = scroller.getBoundingClientRect();
    const x = clientX - rect.left + scroller.scrollLeft - 72;
    return Math.max(0, x / PX_PER_BEAT);
  }

  function trackAtClientY(clientY: number) {
    const grid = gridRef.current;
    if (!grid) return 0;
    const rect = grid.getBoundingClientRect();
    return Math.max(0, Math.min(TRACK_COUNT - 1, Math.floor((clientY - rect.top) / TRACK_H)));
  }

  function onGridDrop(e: DragEvent) {
    e.preventDefault();
    const raw = e.dataTransfer.getData(SAMPLE_DRAG_MIME) || e.dataTransfer.getData("application/json");
    if (!raw) return;
    try {
      const item = JSON.parse(raw) as SoundItem;
      if (!item?.path) return;
      addClip(item, beatAtClientX(e.clientX), trackAtClientY(e.clientY));
    } catch {
      /* ignore */
    }
  }

  function seekTo(clientX: number) {
    const beat = quantize(beatAtClientX(clientX), snapGrid(quantizeRef.current) || 0.25, "floor");
    playheadRef.current = beat;
    setPlayhead(beat);
    if (playingRef.current) void scheduleFrom(beat);
  }

  function onClipPointerDown(e: PointerEvent, clip: Clip, resize: boolean) {
    e.stopPropagation();
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    dragSnapshotRef.current = cloneClips(clipsRef.current);
    const ids = selected.includes(clip.id) ? selected : [clip.id];
    if (!selected.includes(clip.id)) setSelected(ids);
    if (resize) {
      dragRef.current = { mode: "resize", id: clip.id, originX: e.clientX, start: clip.start, length: clip.length };
    } else {
      dragRef.current = {
        mode: "move",
        ids,
        originX: e.clientX,
        originY: e.clientY,
        starts: clipsRef.current
          .filter((c) => ids.includes(c.id))
          .map((c) => ({ id: c.id, start: c.start, track: c.track })),
      };
    }
  }

  function onGridPointerMove(e: PointerEvent) {
    const drag = dragRef.current;
    if (!drag) return;
    const g = snapGrid(quantizeRef.current);
    if (drag.mode === "resize") {
      const delta = (e.clientX - drag.originX) / PX_PER_BEAT;
      const length = Math.max(g || 0.125, quantize(drag.length + delta, g || 0.125));
      setClips((prev) => prev.map((c) => (c.id === drag.id ? { ...c, length } : c)));
      return;
    }
    const dBeats = (e.clientX - drag.originX) / PX_PER_BEAT;
    const dTracks = Math.round((e.clientY - drag.originY) / TRACK_H);
    setClips((prev) =>
      prev.map((c) => {
        const src = drag.starts.find((s) => s.id === c.id);
        if (!src) return c;
        return {
          ...c,
          start: quantize(Math.max(0, src.start + dBeats), g),
          track: Math.max(0, Math.min(TRACK_COUNT - 1, src.track + dTracks)),
        };
      })
    );
  }

  function onDockResizeDown(e: PointerEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    const startY = e.clientY;
    const startH = gridH;
    if (collapsed) setCollapsed(false);

    function move(ev: globalThis.PointerEvent) {
      setGridH(clampGridH(startH + (startY - ev.clientY)));
    }
    function up() {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    }
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }

  function onGridPointerUp() {
    const drag = dragRef.current;
    if (!drag) return;
    dragRef.current = null;
    if (dragSnapshotRef.current) {
      undoRef.current.push(dragSnapshotRef.current);
      if (undoRef.current.length > 80) undoRef.current.shift();
      redoRef.current = [];
      dragSnapshotRef.current = null;
    }
    if (playingRef.current) void scheduleFrom(playheadRef.current);
  }

  const orderedClips = useMemo(
    () =>
      [...clips].sort(
        (a, b) =>
          Number((a.layer ?? 0) === activeLayer) - Number((b.layer ?? 0) === activeLayer) ||
          a.track - b.track
      ),
    [clips, activeLayer]
  );
  const layerCounts = useMemo(() => {
    const counts = Array.from({ length: LAYER_COUNT }, () => 0);
    for (const c of clips) counts[c.layer ?? 0] += 1;
    return counts;
  }, [clips]);
  const activeName = LAYERS[activeLayer].name;
  const otherNames = LAYERS.filter((_, i) => i !== activeLayer && layerCounts[i] > 0).map((l) => l.name);

  const width = lengthBeats * PX_PER_BEAT;
  const barMarks = Array.from({ length: Math.ceil(lengthBeats / BEATS_PER_BAR) }, (_, i) => i);

  const panel = (
    <div
      className={
        embed
          ? "flex h-full min-h-0 flex-col border-t border-hairline bg-black text-paper"
          : "pointer-events-auto fixed inset-x-0 bottom-0 z-40 border-t border-hairline bg-black text-paper"
      }
    >
      {!embed ? (
      <div
        role="separator"
        aria-orientation="horizontal"
        aria-label="Resize beat grid"
        tabIndex={0}
        className="group flex h-2.5 cursor-ns-resize items-center justify-center hover:bg-[#0a0a0a]"
        onPointerDown={onDockResizeDown}
      >
        <div className="h-px w-12 bg-mute-dim transition-colors group-hover:bg-paper" />
      </div>
      ) : null}
      <div className="flex items-center gap-2 overflow-x-auto border-b border-hairline px-3 py-2">
        <Button size="icon-sm" onClick={togglePlay} aria-label={playing ? "Pause" : "Play"}>
          {playing ? <Pause /> : <Play />}
        </Button>
        <Button size="icon-sm" variant="outline" onClick={() => stopTransport(true)} aria-label="Stop">
          <Square />
        </Button>
        <Button
          size="icon-sm"
          variant={recording ? "destructive" : "outline"}
          onClick={toggleRecord}
          aria-label="Record"
          className={recording ? "animate-pulse" : ""}
        >
          <Circle className={recording ? "fill-current" : ""} />
        </Button>
        <button
          type="button"
          onClick={() => setMetronome((m) => !m)}
          aria-pressed={metronome}
          aria-label={metronome ? "Turn metronome off" : "Turn metronome on"}
          title="Metronome click (K) — works while recording"
          className={`flex h-7 items-center gap-1.5 border px-2 text-[11px] tracking-[0.12em] uppercase transition-colors ${
            metronome
              ? "border-paper bg-paper text-black"
              : "border-hairline text-mute line-through hover:border-paper hover:text-paper"
          }`}
        >
          {metronome ? <Volume2 className="size-3.5" /> : <VolumeX className="size-3.5" />}
          Click
        </button>
        <div className="text-muted-foreground hidden font-mono text-xs sm:block">
          {Math.floor(playhead / BEATS_PER_BAR) + 1}.{((playhead % BEATS_PER_BAR) + 1).toFixed(2).padStart(4, "0")}
        </div>
        <label className="flex items-center gap-1 text-xs">
          BPM
          <input
            type="number"
            min={40}
            max={200}
            value={bpm}
            onChange={(e) => setBpm(Number(e.target.value) || 140)}
            className="h-7 w-14 border border-hairline bg-black px-1.5 text-paper hover:border-paper focus:border-paper focus:outline-none font-mono text-xs"
          />
        </label>
        <label className="flex items-center gap-1 text-xs">
          Bars
          <input
            type="number"
            min={4}
            max={64}
            value={bars}
            onChange={(e) => setBars(Math.max(4, Number(e.target.value) || DEFAULT_BARS))}
            className="h-7 w-12 border border-hairline bg-black px-1.5 text-paper hover:border-paper focus:border-paper focus:outline-none font-mono text-xs"
          />
        </label>
        <label className="flex items-center gap-1 text-xs">
          Grid
          <select
            value={quantizeId}
            onChange={(e) => setQuantizeId(e.target.value as QuantizeId)}
            className="h-7 border border-hairline bg-black px-1.5 text-paper hover:border-paper focus:border-paper focus:outline-none text-xs"
          >
            {QUANTIZE_OPTIONS.map((q) => (
              <option key={q.id} value={q.id}>
                {q.label}
              </option>
            ))}
          </select>
        </label>
        <Button size="xs" variant="outline" onClick={quantizeSelected}>
          Quantize
        </Button>
        <Button size="icon-xs" variant="ghost" onClick={undo} aria-label="Undo">
          <Undo2 />
        </Button>
        <Button size="icon-xs" variant="ghost" onClick={redo} aria-label="Redo">
          <Redo2 />
        </Button>
        <Button size="icon-xs" variant="ghost" onClick={copySelected} aria-label="Copy">
          <Copy />
        </Button>
        <Button size="xs" variant="ghost" onClick={pasteClipboard}>
          Paste
        </Button>
        <Button size="icon-xs" variant="ghost" onClick={deleteSelected} aria-label="Delete">
          <Trash2 />
        </Button>
        <label className="flex items-center gap-1 text-xs">
          <input type="checkbox" className="accent-[#f5f5f5]" checked={loop} onChange={(e) => setLoop(e.target.checked)} />
          Loop
        </label>
        <Button
          size="xs"
          variant="ghost"
          onClick={() => {
            commit([]);
            setSelected([]);
          }}
        >
          Clear
        </Button>
        <span className="text-muted-foreground hidden text-[11px] lg:inline">
          Drag samples in · {clips.length} clips · Space play · R rec · ⌘C/V · Q quantize
        </span>
        {!embed ? (
          <Button
            size="icon-xs"
            variant="ghost"
            className="ml-auto"
            onClick={() => setCollapsed((c) => !c)}
            aria-label={collapsed ? "Expand grid" : "Collapse grid"}
          >
            {collapsed ? <ChevronUp /> : <ChevronDown />}
          </Button>
        ) : (
          <span className="ml-auto" />
        )}
      </div>

      <div className="flex items-center gap-2 overflow-x-auto border-b border-hairline px-3 py-1.5">
        <span className="text-[10px] tracking-[0.18em] text-mute-dim uppercase">Layers</span>
        {LAYERS.map((layer, i) => {
          const state = layers[i];
          const current = i === activeLayer;
          const audible = layerAudible(layers, i);
          return (
            <div
              key={layer.name}
              className={`flex shrink-0 items-center gap-1.5 border px-1.5 py-1 ${
                current ? "border-paper bg-[#0a0a0a]" : "border-hairline bg-black"
              } ${audible ? "" : "opacity-50"}`}
            >
              <button
                type="button"
                onClick={() => switchLayer(i)}
                className="flex items-center gap-1.5 px-1 text-xs"
                aria-pressed={current}
                title={`Edit layer ${layer.name} (${i + 1})`}
              >
                <span className={`size-2 ${layer.dot}`} />
                Layer {layer.name}
                <span className="font-mono text-[10px] text-mute-dim">{layerCounts[i]}</span>
              </button>
              <button
                type="button"
                onClick={() => updateLayer(i, { muted: !state.muted })}
                className={`h-5 w-5 border text-[10px] ${
                  state.muted ? "border-paper bg-paper text-black" : "border-hairline text-mute hover:text-paper"
                }`}
                aria-label={`Mute layer ${layer.name}`}
                title="Mute (M)"
              >
                M
              </button>
              <button
                type="button"
                onClick={() => updateLayer(i, { solo: !state.solo })}
                className={`h-5 w-5 border text-[10px] ${
                  state.solo ? "border-paper bg-paper text-black" : "border-hairline text-mute hover:text-paper"
                }`}
                aria-label={`Solo layer ${layer.name}`}
                title="Solo (S)"
              >
                S
              </button>
              <input
                type="range"
                min={0}
                max={1.5}
                step={0.01}
                value={state.volume}
                onChange={(e) => updateLayer(i, { volume: Number(e.target.value) })}
                className="w-16 accent-[#f5f5f5]"
                aria-label={`Layer ${layer.name} volume`}
              />
            </div>
          );
        })}
        {selected.length ? (
          <div className="flex shrink-0 items-center gap-1 text-xs">
            <span className="text-mute">Send {selected.length} to</span>
            {LAYERS.map((layer, i) =>
              i === activeLayer ? null : (
                <Button key={layer.name} size="xs" variant="outline" onClick={() => moveSelectedToLayer(i)}>
                  <span className={`size-2 ${layer.dot}`} />
                  {layer.name}
                </Button>
              )
            )}
          </div>
        ) : null}
        <span className="hidden text-[11px] text-mute-dim xl:inline">
          Editing <span className={LAYERS[activeLayer].text}>Layer {activeName}</span>
          {otherNames.length ? ` over ${otherNames.join(" + ")} (faded)` : ""} · 1/2/3 switch · ⇧1/2/3 send
          selection · M mute · S solo
        </span>
      </div>

      {!collapsed || embed ? (
        <div
          ref={scrollRef}
          className="relative min-h-0 flex-1 overflow-auto"
          style={embed ? undefined : { height: gridH }}
          onDragOver={(e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = "copy";
          }}
          onDrop={onGridDrop}
        >
          <div className="sticky top-0 z-10 flex border-b border-hairline bg-black">
            <div className="w-[72px] shrink-0 border-r border-hairline px-2 py-1 text-[10px] tracking-[0.18em] text-mute-dim uppercase">
              Track
            </div>
            <div className="relative" style={{ width }} onClick={(e) => seekTo(e.clientX)}>
              {barMarks.map((bar) => (
                <div
                  key={bar}
                  className="absolute top-0 bottom-0 border-l border-[#3f3f46]"
                  style={{ left: bar * BEATS_PER_BAR * PX_PER_BEAT }}
                >
                  <span className="pl-1 font-mono text-[10px] text-mute">{bar + 1}</span>
                </div>
              ))}
              {Array.from({ length: lengthBeats }, (_, i) =>
                i % BEATS_PER_BAR === 0 ? null : (
                  <div
                    key={`b${i}`}
                    className="absolute top-3 bottom-0 border-l border-hairline"
                    style={{ left: i * PX_PER_BEAT }}
                  />
                )
              )}
              <div className="h-7" />
            </div>
          </div>

          <div
            ref={gridRef}
            className="relative flex"
            onPointerMove={onGridPointerMove}
            onPointerUp={onGridPointerUp}
            onPointerCancel={onGridPointerUp}
          >
            <div className="sticky left-0 z-20 w-[72px] shrink-0 bg-black">
              {TRACK_LABELS.map((label) => (
                <div
                  key={label}
                  className="flex items-center border-r border-b border-hairline px-2 text-[10px] tracking-[0.14em] text-mute uppercase"
                  style={{ height: TRACK_H }}
                >
                  {label}
                </div>
              ))}
            </div>
            <div className="relative" style={{ width, height: TRACK_COUNT * TRACK_H }}>
              {TRACK_LABELS.map((_, track) => (
                <div
                  key={track}
                  className={`absolute right-0 left-0 border-b border-hairline ${
                    track % 2 ? "bg-[#050505]" : "bg-black"
                  }`}
                  style={{ top: track * TRACK_H, height: TRACK_H }}
                >
                  {barMarks.map((bar) => (
                    <div
                      key={bar}
                      className="absolute inset-y-0 border-l border-hairline"
                      style={{ left: bar * BEATS_PER_BAR * PX_PER_BEAT }}
                    />
                  ))}
                </div>
              ))}

              {layerCounts[activeLayer] === 0 ? (
                <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center text-sm text-mute">
                  <span className="bg-black px-3 py-1.5">
                    {clips.length === 0
                      ? `Drag a pad or beat here to start Layer ${activeName}`
                      : `Layer ${activeName} is empty — drag a beat in to lay it over ${otherNames.join(" + ")}`}
                  </span>
                </div>
              ) : null}

              {orderedClips.map((clip) => {
                const clipLayer = clip.layer ?? 0;
                const editable = clipLayer === activeLayer;
                const layerStyle = LAYERS[clipLayer] ?? LAYERS[0];
                const on = editable && selected.includes(clip.id);
                if (!editable) {
                  const slot = [0, 1, 2].filter((l) => l !== activeLayer).indexOf(clipLayer);
                  return (
                    <div
                      key={clip.id}
                      aria-hidden
                      className={`pointer-events-none absolute rounded-sm ${layerStyle.dot} ${
                        layerAudible(layers, clipLayer) ? "opacity-80" : "opacity-30"
                      }`}
                      style={{
                        left: clip.start * PX_PER_BEAT,
                        width: Math.max(8, clip.length * PX_PER_BEAT - 2),
                        height: GHOST_H - 1,
                        top: clip.track * TRACK_H + TRACK_H - 2 - GHOST_H * (slot + 1),
                        zIndex: 1,
                      }}
                    />
                  );
                }
                const clipW = Math.max(16, clip.length * PX_PER_BEAT - 2);
                const clipH = TRACK_H - 4 - GHOST_H * 2;
                const darkWave = clipIsLight(clip.kind);
                return (
                  <div
                    key={clip.id}
                    role="button"
                    tabIndex={0}
                    onPointerDown={(e) => onClipPointerDown(e, clip, false)}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelected(
                        e.shiftKey ? (selected.includes(clip.id) ? selected.filter((id) => id !== clip.id) : [...selected, clip.id]) : [clip.id]
                      );
                    }}
                    className={`absolute overflow-hidden border ${clipColor(
                      clip.kind
                    )} ${on ? "outline-2 outline-offset-1 outline-white" : ""} ${
                      editable
                        ? layerAudible(layers, clipLayer)
                          ? ""
                          : "opacity-50"
                        : "pointer-events-none border-dashed opacity-25"
                    }`}
                    style={{
                      left: clip.start * PX_PER_BEAT,
                      width: clipW,
                      height: clipH,
                      top: clip.track * TRACK_H + 2,
                      zIndex: editable ? 2 : 1,
                    }}
                    title={`${clip.name} · Layer ${layerStyle.name} · bar ${clip.start / BEATS_PER_BAR + 1}`}
                  >
                    <span
                      className={`absolute top-0.5 right-2.5 z-10 size-1.5 ${layerStyle.dot}`}
                      aria-hidden
                    />
                    <ClipWaveform
                      path={clip.path}
                      lengthBeats={clip.length}
                      bpm={bpm}
                      width={clipW}
                      height={clipH}
                      dark={darkWave}
                    />
                    <span className="relative z-10 block truncate px-1.5 pt-1 text-[10px] leading-none">
                      {clip.name.replace(/^A\d+\s/, "")}
                    </span>
                    <button
                      type="button"
                      aria-label="Resize clip"
                      className="absolute top-0 right-0 z-20 h-full w-2 cursor-e-resize bg-black/20"
                      onPointerDown={(e) => onClipPointerDown(e, clip, true)}
                    />
                  </div>
                );
              })}

              <div
                className="pointer-events-none absolute top-0 bottom-0 z-30 w-px bg-white"
                style={{ left: playhead * PX_PER_BEAT }}
              >
                <div className="h-0 w-0 -translate-x-1 border-x-4 border-t-8 border-x-transparent border-t-white" />
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <p className="sr-only">
        {items.length} library sounds available to drop onto the beat grid.
      </p>
    </div>
  );

  if (!mounted) return null;
  if (embed) return panel;
  return createPortal(panel, document.body);
});
