import type { SoundItem } from "@/lib/types";

export const BEATS_PER_BAR = 4;
export const TRACK_COUNT = 8;
export const TRACK_LABELS = ["Beat", "Drums", "808", "Keys", "FX", "Pad", "Loop", "Spare"];
export const PX_PER_BEAT = 22;
export const TRACK_H = 48;
export const DEFAULT_BARS = 16;

export const LAYER_COUNT = 3;
export const LAYERS = [
  { name: "A", dot: "bg-[#f5f5f5]", ring: "ring-[#f5f5f5]", text: "text-[#f5f5f5]" },
  { name: "B", dot: "border border-[#f5f5f5] bg-transparent", ring: "ring-[#a1a1aa]", text: "text-[#a1a1aa]" },
  { name: "C", dot: "bg-[#71717a]", ring: "ring-[#71717a]", text: "text-[#71717a]" },
] as const;

export type LayerState = { muted: boolean; solo: boolean; volume: number };

export function defaultLayers(): LayerState[] {
  return Array.from({ length: LAYER_COUNT }, () => ({ muted: false, solo: false, volume: 1 }));
}

export function layerAudible(layers: LayerState[], layer: number) {
  const anySolo = layers.some((l) => l.solo);
  const state = layers[layer];
  if (!state) return false;
  return anySolo ? state.solo : !state.muted;
}

export const QUANTIZE_OPTIONS = [
  { id: "1", label: "1/4", beats: 1 },
  { id: "1/2", label: "1/8", beats: 0.5 },
  { id: "1/4n", label: "1/16", beats: 0.25 },
  { id: "1/8n", label: "1/32", beats: 0.125 },
  { id: "off", label: "Off", beats: 0 },
] as const;

export type QuantizeId = (typeof QUANTIZE_OPTIONS)[number]["id"];

export type Clip = {
  id: string;
  soundId: string;
  name: string;
  path: string;
  kind: string;
  vibe: string;
  track: number;
  start: number;
  length: number;
  layer?: number;
};

export function newId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function quantize(value: number, grid: number, direction: "round" | "floor" = "round") {
  if (grid <= 0) return Math.max(0, value);
  const n = direction === "floor" ? Math.floor(value / grid + 1e-9) : Math.round(value / grid);
  return Math.max(0, n * grid);
}

export function defaultTrack(item: SoundItem) {
  if (item.kind === "beat") return 0;
  if (["kick", "snare", "clap", "hat"].includes(item.kind)) return 1;
  if (item.kind === "808") return 2;
  if (item.kind === "melodic") return 3;
  return 4;
}

export function defaultLength(item: SoundItem) {
  if (item.tags.includes("16-bar")) return 16 * BEATS_PER_BAR;
  if (item.tags.includes("2-bar") || item.kind === "beat") return 2 * BEATS_PER_BAR;
  if (item.kind === "808" || item.kind === "melodic") return BEATS_PER_BAR;
  return 1;
}

export function clipFromSound(
  item: SoundItem,
  start: number,
  track: number,
  grid: number
): Clip {
  return {
    id: newId(),
    soundId: item.id,
    name: item.name,
    path: item.path,
    kind: item.kind,
    vibe: item.vibe,
    track: Math.max(0, Math.min(TRACK_COUNT - 1, track)),
    start: quantize(start, grid),
    length: Math.max(grid || 0.25, defaultLength(item)),
  };
}

export function arrangementEnd(clips: Clip[], minBars = DEFAULT_BARS) {
  const last = clips.reduce((m, c) => Math.max(m, c.start + c.length), 0);
  return Math.max(minBars * BEATS_PER_BAR, Math.ceil(last / BEATS_PER_BAR) * BEATS_PER_BAR);
}

export function clipColor(kind: string) {
  if (kind === "beat") return "bg-[#f5f5f5] text-black border-white";
  if (kind === "808") return "bg-[#3f3f46] text-[#f5f5f5] border-[#71717a]";
  if (kind === "melodic") return "bg-[#18181b] text-[#f5f5f5] border-[#a1a1aa]";
  if (["kick", "snare", "clap", "hat"].includes(kind)) return "bg-[#d4d4d8] text-black border-white";
  return "bg-[#27272a] text-[#f5f5f5] border-[#52525b]";
}

export function clipIsLight(kind: string) {
  return kind === "beat" || ["kick", "snare", "clap", "hat"].includes(kind);
}
