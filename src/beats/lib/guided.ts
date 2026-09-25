import type { SoundItem } from "@/lib/types";

/** Catalog loops have duration but no BPM. 140 matches this hip-hop / trap library. */
const ASSUMED_BPM = 140;
const MIN_BEATS = 8;

export type PadPick = { name: string; label: string };

/** A few standard hats and cymbals — not the full hat folder. */
export const PERCUSSION: PadPick[] = [
  { name: "HipHop Hat · ClosedHH 09", label: "Closed hat" },
  { name: "HipHop Hat · ClosedHH 16", label: "Tight hat" },
  { name: "HipHop Hat · OpenHH 05", label: "Open hat" },
  { name: "HipHop Hat · OpenHH 04", label: "Open hat 2" },
  { name: "HipHop Cymbal · Cym 14", label: "Cymbal" },
  { name: "Trap Cymbal · Ride 16", label: "Ride" },
];

/** Seven short, thumpy bass one-shots. */
export const BASS: PadPick[] = [
  { name: "HipHop Bass · Cipher Bass 1", label: "Thump" },
  { name: "HipHop Bass · Cipher Bass 2", label: "Thump 2" },
  { name: "HipHop 808 · 808 9", label: "808" },
  { name: "HipHop 808 · 808 5", label: "808 2" },
  { name: "Trap 808 · BigBop 808", label: "Big 808" },
  { name: "Inst Bass · F9 Magma 808-060 C3", label: "Magma" },
  { name: "Inst Bass · F9 Orbit 808-060 C3", label: "Orbit" },
];

export function loopBeats(item: SoundItem) {
  if (!item.duration || item.duration <= 0) return null;
  const bpm = item.bpm && item.bpm > 0 ? item.bpm : ASSUMED_BPM;
  return (item.duration * bpm) / 60;
}

/** Project loops long enough to be a base (8 beats or more). */
export function isBaseLoop(item: SoundItem) {
  if (item.kind !== "loop") return false;
  if (!item.projects?.length) return false;
  const beats = loopBeats(item);
  return beats != null && beats >= MIN_BEATS;
}

export function loopTitle(item: SoundItem) {
  const parts = item.name.split("·");
  return (parts[parts.length - 1] ?? item.name).trim();
}

export function pickSounds(items: SoundItem[], picks: PadPick[]) {
  const byName = new Map(items.map((item) => [item.name, item]));
  const found: { item: SoundItem; label: string }[] = [];
  for (const pick of picks) {
    const item = byName.get(pick.name);
    if (item) found.push({ item, label: pick.label });
  }
  return found;
}
