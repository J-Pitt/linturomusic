export type SoundItem = {
  id: string;
  name: string;
  kind: string;
  vibe: "bones" | "dolph" | "dungeon" | string;
  path: string;
  kit: string | null;
  pad: number | null;
  bpm: number | null;
  key: string | null;
  tags: string[];
  source?: "mpc";
  genre?: string;
  duration?: number | null;
  projects?: string[];
};

export type Catalog = {
  items: SoundItem[];
};
