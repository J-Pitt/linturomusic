import type { SoundItem } from "@/lib/types";

export type PadBank = {
  id: string;
  label: string;
  pads: (SoundItem | null)[];
};

const BANK_KINDS: { id: string; label: string; kind: string }[] = [
  { id: "kicks", label: "Kicks", kind: "kick" },
  { id: "snares", label: "Snares", kind: "snare" },
  { id: "hats", label: "Hats", kind: "hat" },
  { id: "claps", label: "Claps", kind: "clap" },
  { id: "808s", label: "808s", kind: "808" },
  { id: "perc", label: "Perc", kind: "perc" },
  { id: "keys", label: "Keys", kind: "melodic" },
  { id: "fx", label: "FX", kind: "fx" },
];

function chunk16(items: SoundItem[]): SoundItem[][] {
  const out: SoundItem[][] = [];
  for (let i = 0; i < items.length; i += 16) {
    out.push(items.slice(i, i + 16));
  }
  return out;
}

function padSlots(items: SoundItem[]): (SoundItem | null)[] {
  const slots: (SoundItem | null)[] = Array.from({ length: 16 }, () => null);
  items.slice(0, 16).forEach((item, i) => {
    slots[i] = item;
  });
  return slots;
}

/** Build swipeable 16-pad banks from kits + MPC one-shot kinds. */
export function buildPadBanks(items: SoundItem[]): PadBank[] {
  const banks: PadBank[] = [];

  const byKit = new Map<string, SoundItem[]>();
  for (const item of items) {
    if (item.kind !== "kit-pad" || !item.kit) continue;
    const list = byKit.get(item.kit) ?? [];
    list.push(item);
    byKit.set(item.kit, list);
  }
  for (const [kit, pads] of byKit) {
    const ordered = [...pads].sort((a, b) => (a.pad ?? 0) - (b.pad ?? 0));
    banks.push({
      id: `kit-${kit}`,
      label: kit.replace(/-/g, " "),
      pads: padSlots(ordered),
    });
  }

  for (const bank of BANK_KINDS) {
    const pool = items
      .filter((i) => i.kind === bank.kind && i.source === "mpc")
      .sort((a, b) => a.name.localeCompare(b.name));
    const pages = chunk16(pool).slice(0, 4);
    pages.forEach((page, pageIndex) => {
      banks.push({
        id: `${bank.id}-${pageIndex}`,
        label: pages.length > 1 ? `${bank.label} ${pageIndex + 1}` : bank.label,
        pads: padSlots(page),
      });
    });
  }

  return banks.length ? banks : [{ id: "empty", label: "Pads", pads: padSlots([]) }];
}

export function shortPadLabel(item: SoundItem) {
  return item.name.replace(/^A\d+\s+/, "").replace(/^0+/, "").slice(0, 14);
}
