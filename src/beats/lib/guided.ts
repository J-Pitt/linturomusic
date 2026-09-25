import type { SoundItem } from "@/lib/types";

/** Catalog loops have duration but no BPM. 140 matches this hip-hop / trap library. */
const ASSUMED_BPM = 140;
const MIN_BEATS = 8;

export type PadPick = { name: string; label: string };

/** Eight short percussion one-shots. Hats first, then clap and shaker. */
export const PERCUSSION: PadPick[] = [
  { name: "HipHop Hat · ClosedHH 09", label: "Closed hat" },
  { name: "HipHop Hat · ClosedHH 16", label: "Tight hat" },
  { name: "HipHop Hat · OpenHH 05", label: "Open hat" },
  { name: "HipHop Hat · OpenHH 04", label: "Open hat 2" },
  { name: "HipHop Cymbal · Cym 14", label: "Cymbal" },
  { name: "Trap Cymbal · Ride 16", label: "Ride" },
  { name: "HipHop Clap · Clp 8", label: "Clap" },
  { name: "Trap Perc · Shkr 4", label: "Shaker" },
];

/** Extra percussion. Shown on demand and decoded only when tapped. */
export const MORE_PERCUSSION: PadPick[] = [
  { name: "HipHop Hat · ClosedHH 11", label: "Closed 3" },
  { name: "HipHop Hat · OpenHH 18", label: "Open 3" },
  { name: "Trap Cymbal · Cym 03", label: "Cymbal 2" },
  { name: "Trap Rim · Rim 02", label: "Rim" },
  { name: "HipHop Clap · Clp 20", label: "Clap 2" },
  { name: "Trap Snap · MX Push Snap 2", label: "Snap" },
  { name: "HipHop Rim · NS_RIM_RastR", label: "Rim 2" },
  { name: "HipHop Perc · BDWK Shk", label: "Shaker 2" },
];

/** Eight short, thumpy bass one-shots. */
export const BASS: PadPick[] = [
  { name: "HipHop Bass · Cipher Bass 1", label: "Thump" },
  { name: "HipHop Bass · Cipher Bass 2", label: "Thump 2" },
  { name: "HipHop 808 · 808 9", label: "808" },
  { name: "HipHop 808 · 808 5", label: "808 2" },
  { name: "HipHop 808 · 808 10", label: "808 3" },
  { name: "Trap 808 · BigBop 808", label: "Big 808" },
  { name: "Inst Bass · F9 Magma 808-060 C3", label: "Magma" },
  { name: "Inst Bass · F9 Magma 808-052 E2", label: "Low 808" },
];

export const SECTION_NAMES = ["Intro", "Groove", "Switch", "Outro", "Break", "Lift"] as const;

export function sectionName(index: number) {
  return SECTION_NAMES[index] ?? `Part ${index + 1}`;
}

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
