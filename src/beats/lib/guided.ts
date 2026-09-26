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

/** Four more of each base percussion sound. Shown under the base pads and decoded on tap. */
export const EXTRA_PERCUSSION: { title: string; pads: PadPick[] }[] = [
  {
    title: "More closed hats",
    pads: [
      { name: "HipHop Hat · ClosedHH 05", label: "Closed 3" },
      { name: "HipHop Hat · ClosedHH 10", label: "Closed 4" },
      { name: "HipHop Hat · ClosedHH 12", label: "Closed 5" },
      { name: "HipHop Hat · ClosedHH 14", label: "Closed 6" },
    ],
  },
  {
    title: "More open hats",
    pads: [
      { name: "HipHop Hat · OpenHH 07", label: "Open 3" },
      { name: "HipHop Hat · OpenHH 10", label: "Open 4" },
      { name: "HipHop Hat · OpenHH 14", label: "Open 5" },
      { name: "HipHop Hat · OpenHH 20", label: "Open 6" },
    ],
  },
  {
    title: "More cymbals",
    pads: [
      { name: "HipHop Cymbal · Cym 08", label: "Cymbal 2" },
      { name: "Trap Cymbal · Cym 01", label: "Cymbal 3" },
      { name: "HipHop Cymbal · Cym 22", label: "Cymbal 4" },
      { name: "HipHop Cymbal · Cym 12", label: "Cymbal 5" },
    ],
  },
  {
    title: "More rides",
    pads: [
      { name: "Trap Cymbal · Ride 08", label: "Ride 2" },
      { name: "Trap Cymbal · Ride 14", label: "Ride 3" },
      { name: "Trap Cymbal · Ride 17", label: "Ride 4" },
      { name: "Trap Cymbal · Ride 19", label: "Ride 5" },
    ],
  },
  {
    title: "More claps",
    pads: [
      { name: "HipHop Clap · Clp 02", label: "Clap 2" },
      { name: "HipHop Clap · Clp 04", label: "Clap 3" },
      { name: "HipHop Clap · Clp 10", label: "Clap 4" },
      { name: "Trap Clap · Clp 01", label: "Clap 5" },
    ],
  },
  {
    title: "More shakers",
    pads: [
      { name: "HipHop Shaker · Shkr 01", label: "Shaker 2" },
      { name: "HipHop Shaker · Shkr 02", label: "Shaker 3" },
      { name: "HipHop Shaker · Shkr 03", label: "Shaker 4" },
      { name: "Trap Perc · BigBop Shaker", label: "Shaker 5" },
    ],
  },
];

/** Eight short, thumpy bass one-shots. */
export const BASS: PadPick[] = [
  { name: "HipHop Bass · Cipher Bass 1", label: "Thump" },
  { name: "HipHop Bass · Cipher Bass 2", label: "Thump 2" },
  { name: "HipHop 808 · 808 9", label: "808" },
  { name: "HipHop 808 · 808 5", label: "808 2" },
  { name: "HipHop 808 · 808 10", label: "808 3" },
  { name: "Trap 808 · BigBop 808", label: "Big 808" },
  { name: "HipHop Bass · NS1014_JBS", label: "Knock" },
  { name: "EDM Bass · 17 BHits F", label: "Bump" },
  { name: "FutureBass Bass · FD guessG", label: "Bump 2" },
  { name: "Urban Kick · Heat3 Sub", label: "Deep" },
  { name: "HipHop Bass · NS4414_JBS", label: "Body" },
  { name: "HipHop Bass · Raw Curfew Bass 1", label: "Raw" },
  { name: "HipHop Bass · Raw Curfew Bass 4", label: "Raw 4" },
  { name: "HipHop Bass · RiDDL Bass 02", label: "Riddle" },
  { name: "HipHop Bass · NS4416_JBS", label: "Sub" },
  { name: "HipHop Bass · NS0316_JBS", label: "Sub 2" },
];

/** Four more bass hits under the base bass pads. */
export const EXTRA_BASS: PadPick[] = [
  { name: "HipHop 808 · 808 3", label: "808 4" },
  { name: "HipHop 808 · 808 24", label: "808 5" },
  { name: "HipHop Bass · Raw Curfew Bass 2", label: "Raw 2" },
  { name: "HipHop Bass · Raw Curfew Bass 3", label: "Raw 3" },
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

const DROPPED_PROJECT = /untitled|1stbeat|first\s*beat/i;

/** Project names still offered as base loops. Untitled and first-beat sets are left out. */
export function keptProjects(item: SoundItem) {
  return (item.projects ?? []).filter((name) => !DROPPED_PROJECT.test(name));
}

/** Project loops long enough to be a base (8 beats or more). */
export function isBaseLoop(item: SoundItem) {
  if (item.kind !== "loop") return false;
  if (!keptProjects(item).length) return false;
  const beats = loopBeats(item);
  return beats != null && beats >= MIN_BEATS;
}

/** Bass loops in this library are named LpBs (and the odd Bass / 808 loop). */
export function isBassHeavy(item: SoundItem) {
  return /\b(lpbs|bass|808)\b/i.test(item.name);
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
