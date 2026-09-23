
import { useEffect, useMemo, useRef, useState, type DragEvent } from "react";
import { Download, Pause, Plus, Play, Search } from "lucide-react";
import { BeatGrid, type BeatGridHandle } from "@/components/beat-grid";
import { MobilePads } from "@/components/mobile-pads";
import { Input } from "@/components/ui/input";
import { buildPadBanks } from "@/lib/pad-banks";
import { ALLOW_DOWNLOAD, filename, mediaUrl, SAMPLE_DRAG_MIME } from "@/lib/media";
import type { SoundItem } from "@/lib/types";

const KIND_LABEL: Record<string, string> = {
  beat: "Beat",
  kick: "Kick",
  snare: "Snare",
  clap: "Clap",
  hat: "Hat",
  "808": "808",
  melodic: "Keys",
  "kit-pad": "Pad",
  perc: "Perc",
  loop: "Loop",
  vocal: "Vocal",
  fx: "FX",
};

const MPC_TYPES = [
  { value: "all", label: "Everything" },
  { value: "beat", label: "My tracks" },
  { value: "loop", label: "Loops" },
  { value: "kick", label: "Kicks" },
  { value: "snare", label: "Snares" },
  { value: "clap", label: "Claps" },
  { value: "hat", label: "Hats & cymbals" },
  { value: "808", label: "808s & bass" },
  { value: "perc", label: "Perc" },
  { value: "melodic", label: "Keys & synths" },
  { value: "vocal", label: "Vocals" },
  { value: "fx", label: "FX" },
];

const PAGE = 120;

function startSampleDrag(e: DragEvent, item: SoundItem) {
  e.dataTransfer.setData(SAMPLE_DRAG_MIME, JSON.stringify(item));
  e.dataTransfer.setData("application/json", JSON.stringify(item));
  e.dataTransfer.effectAllowed = "copy";
}

let exclusivePause = false;

function stopOtherAudio(current: HTMLMediaElement) {
  exclusivePause = true;
  try {
    document.querySelectorAll("audio").forEach((el) => {
      if (el === current || el.paused) return;
      el.pause();
      el.currentTime = 0;
    });
  } finally {
    exclusivePause = false;
  }
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="flex min-w-0 flex-col gap-1.5 text-[10px] tracking-[0.18em] text-mute-dim uppercase">
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 w-full min-w-[8.5rem] border border-hairline bg-black px-2 text-sm tracking-normal text-paper normal-case transition-colors hover:border-paper focus:border-paper focus:outline-none"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function LibraryRow({
  item,
  active,
  playing,
  onPlay,
  onAdd,
}: {
  item: SoundItem;
  active: boolean;
  playing: boolean;
  onPlay: (item: SoundItem) => void;
  onAdd: (item: SoundItem) => void;
}) {
  return (
    <div
      draggable
      onDragStart={(e) => startSampleDrag(e, item)}
      onDoubleClick={() => onAdd(item)}
      className={`group flex items-center gap-3 border-b border-hairline px-1 py-2.5 transition-colors ${
        active ? "bg-[#0a0a0a]" : "hover:bg-[#0a0a0a]"
      }`}
    >
      <button
        type="button"
        onClick={() => onPlay(item)}
        aria-label={`${active && playing ? "Pause" : "Play"} ${item.name}`}
        className={`flex size-8 shrink-0 items-center justify-center border transition-colors ${
          active && playing
            ? "border-paper bg-paper text-black"
            : "border-hairline text-paper hover:border-paper"
        }`}
      >
        {active && playing ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
      </button>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm text-paper">{item.name.replace(/^A\d+\s/, "")}</p>
        <p className="truncate text-[11px] text-mute-dim">
          {KIND_LABEL[item.kind] ?? item.kind}
          {item.bpm ? ` · ${item.bpm} BPM` : ""}
          {item.key ? ` · ${item.key}` : ""}
          {item.genre ? ` · ${item.genre}` : ""}
          {item.duration ? ` · ${item.duration.toFixed(1)}s` : ""}
          {item.projects?.length
            ? ` · ${item.projects.slice(0, 2).join(", ")}${item.projects.length > 2 ? ` +${item.projects.length - 2}` : ""}`
            : ""}
          {active && playing ? " · Playing" : ""}
        </p>
      </div>
      <button
        type="button"
        onClick={() => onAdd(item)}
        className="inline-flex h-8 items-center gap-1.5 border border-hairline px-3 text-[11px] tracking-[0.18em] text-paper uppercase transition-colors hover:border-paper"
      >
        <Plus className="size-3" />
        Add
      </button>
      {ALLOW_DOWNLOAD ? (
        <a
          href={mediaUrl(item.path)}
          download={filename(item.path)}
          aria-label={`Download ${item.name}`}
          className="flex size-8 items-center justify-center text-mute-dim transition-colors hover:text-paper"
        >
          <Download className="size-4" />
        </a>
      ) : null}
    </div>
  );
}

export function Studio({ items }: { items: SoundItem[] }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const gridRef = useRef<BeatGridHandle>(null);
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const activeIdRef = useRef<string | null>(null);
  const [query, setQuery] = useState("");
  const [mpcType, setMpcType] = useState("all");
  const [genre, setGenre] = useState("all");
  const [project, setProject] = useState("all");
  const [visible, setVisible] = useState(PAGE);
  const [active, setActive] = useState<SoundItem | null>(null);
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mobile, setMobile] = useState(false);
  const [recording, setRecording] = useState(false);
  const [countInBeat, setCountInBeat] = useState<number | null>(null);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    const sync = () => setMobile(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const padBanks = useMemo(() => buildPadBanks(items), [items]);

  function goPanel(index: number) {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollTo({ top: index * el.clientHeight, behavior: "smooth" });
  }

  function onRecordState(state: { recording: boolean; countInBeat: number | null }) {
    setRecording(state.recording);
    setCountInBeat(state.countInBeat);
  }

  function startPreview(item: SoundItem) {
    activeIdRef.current = item.id;
    setActive(item);
    setPlaying(true);
    setError(null);
  }

  function endPreview(item: SoundItem) {
    if (exclusivePause) return;
    if (activeIdRef.current !== item.id) return;
    activeIdRef.current = null;
    setPlaying(false);
  }

  function addToGrid(item: SoundItem) {
    gridRef.current?.addAtPlayhead(item);
  }

  async function trigger(item: SoundItem) {
    gridRef.current?.recordHit(item);
    startPreview(item);
    const el = audioRef.current;
    if (!el) {
      setError("Player is not ready.");
      return;
    }
    stopOtherAudio(el);
    el.muted = false;
    el.volume = 1;
    const url = mediaUrl(item.path);
    if (el.src !== new URL(url, window.location.href).href) {
      el.src = url;
      el.load();
    } else {
      el.currentTime = 0;
    }
    try {
      await el.play();
    } catch (err) {
      endPreview(item);
      const name = err instanceof Error ? err.name : "";
      setError(
        name === "NotAllowedError"
          ? "Browser blocked autoplay. Click Play again."
          : "Could not start audio. Download the WAV instead."
      );
    }
  }

  function togglePreview(item: SoundItem) {
    const el = audioRef.current;
    if (el && active?.id === item.id) {
      if (playing) {
        el.pause();
        setPlaying(false);
        return;
      }
      if (el.currentTime > 0 && !el.ended) {
        stopOtherAudio(el);
        startPreview(item);
        void el.play();
        return;
      }
    }
    void trigger(item);
  }

  const mpcOptions = useMemo(() => {
    const genres = new Set<string>();
    const projects = new Set<string>();
    for (const item of items) {
      if (item.source !== "mpc") continue;
      if (item.genre) genres.add(item.genre);
      for (const p of item.projects ?? []) projects.add(p);
    }
    return { genres: [...genres].sort(), projects: [...projects].sort() };
  }, [items]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((item) => {
      if (item.source !== "mpc") return false;
      if (mpcType !== "all" && item.kind !== mpcType) return false;
      if (genre !== "all" && item.genre !== genre) return false;
      if (project !== "all" && !item.projects?.includes(project)) return false;
      if (!q) return true;
      const blob = `${item.name} ${item.kind} ${item.genre ?? ""} ${(item.projects ?? []).join(" ")}`.toLowerCase();
      return blob.includes(q);
    });
  }, [items, query, mpcType, genre, project]);

  const filterKey = `${query}|${mpcType}|${genre}|${project}`;
  const [shownFor, setShownFor] = useState(filterKey);
  if (shownFor !== filterKey) {
    setShownFor(filterKey);
    setVisible(PAGE);
  }

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const bpm = (a.bpm ?? 999) - (b.bpm ?? 999);
      if (bpm !== 0) return bpm;
      return a.name.localeCompare(b.name);
    });
  }, [filtered]);

  const libraryFilters = (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
      <div className="relative min-w-[12rem] flex-1">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-mute-dim" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search kick, LpSyn, vocal, project…"
          className="border-hairline bg-black pl-8 text-paper hover:border-paper focus-visible:border-paper focus-visible:ring-0 dark:bg-black"
        />
      </div>
      <FilterSelect label="Type" value={mpcType} onChange={setMpcType} options={MPC_TYPES} />
      <FilterSelect
        label="Genre"
        value={genre}
        onChange={setGenre}
        options={[
          { value: "all", label: "Any genre" },
          ...mpcOptions.genres.map((g) => ({ value: g, label: g })),
        ]}
      />
      <FilterSelect
        label="Project"
        value={project}
        onChange={setProject}
        options={[
          { value: "all", label: "All projects" },
          ...mpcOptions.projects.map((p) => ({ value: p, label: p })),
        ]}
      />
    </div>
  );

  const libraryList = (
    <>
      {sorted.length === 0 ? (
        <div className="border border-dashed border-hairline p-10 text-center">
          <p className="text-paper">Nothing in this filter.</p>
          <p className="mt-1 text-sm text-mute">
            Try Everything, Any genre, and All projects.
          </p>
        </div>
      ) : (
        <div className="flex flex-col border-t border-hairline">
          {sorted.slice(0, visible).map((item) => (
            <LibraryRow
              key={item.id}
              item={item}
              active={active?.id === item.id}
              playing={playing}
              onPlay={togglePreview}
              onAdd={addToGrid}
            />
          ))}
          {sorted.length > visible ? (
            <button
              type="button"
              onClick={() => setVisible((v) => v + PAGE)}
              className="border-b border-hairline py-3 text-[11px] tracking-[0.18em] text-mute uppercase transition-colors hover:text-paper"
            >
              Show more · {sorted.length - visible} left
            </button>
          ) : null}
        </div>
      )}
    </>
  );

  const previewAudio = (
    <audio
      ref={audioRef}
      className="hidden"
      playsInline
      preload="none"
      onEnded={() => {
        if (activeIdRef.current) endPreview({ id: activeIdRef.current } as SoundItem);
      }}
      onPlay={(e) => {
        stopOtherAudio(e.currentTarget);
        setPlaying(true);
        setError(null);
      }}
    />
  );

  if (mobile) {
    return (
      <div
        ref={scrollerRef}
        className="h-dvh snap-y snap-mandatory overflow-y-auto overscroll-none"
      >
        <section className="flex h-dvh snap-start snap-always flex-col overflow-hidden px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-4">
          <div className="mb-3 flex shrink-0 items-end justify-between gap-3">
            <div>
              <p className="text-[10px] tracking-[0.22em] text-mute-dim uppercase">
                linturo beats
              </p>
              <h1 className="mt-1 text-xl font-light tracking-tight text-paper">Sounds</h1>
            </div>
            <button
              type="button"
              onClick={() => goPanel(1)}
              className="text-[11px] tracking-[0.16em] text-mute uppercase"
            >
              Pads ↓
            </button>
          </div>
          <div className="mb-3 shrink-0 border-b border-hairline pb-3">{libraryFilters}</div>
          <div className="min-h-0 flex-1 overflow-y-auto touch-pan-y">{libraryList}</div>
          {error ? <p className="mt-2 shrink-0 text-xs text-mute">{error}</p> : null}
        </section>

        <section className="h-dvh snap-start snap-always overflow-hidden">
          <MobilePads
            banks={padBanks}
            recording={recording}
            countInBeat={countInBeat}
            onHit={(item) => void trigger(item)}
            onRecord={() => gridRef.current?.toggleRecordWithCountIn()}
            onScrollSounds={() => goPanel(0)}
            onScrollGrid={() => goPanel(2)}
          />
        </section>

        <section className="flex h-dvh snap-start snap-always flex-col overflow-hidden">
          <div className="flex shrink-0 items-center justify-between border-b border-hairline px-4 py-2">
            <button
              type="button"
              onClick={() => goPanel(1)}
              className="text-[11px] tracking-[0.16em] text-mute uppercase"
            >
              ↑ Pads
            </button>
            <p className="text-[10px] tracking-[0.2em] text-mute-dim uppercase">Beatgrid</p>
            <span className="w-12" />
          </div>
          <div className="min-h-0 flex-1">
            <BeatGrid
              ref={gridRef}
              items={items}
              embed
              onRecordState={onRecordState}
            />
          </div>
        </section>

        {previewAudio}
      </div>
    );
  }

  return (
    <>
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-10 pb-[var(--beat-grid-h,28rem)] sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[10px] tracking-[0.22em] text-mute-dim uppercase">
              linturo beats
            </p>
            <h1 className="mt-3 text-2xl font-light tracking-tight text-paper sm:text-3xl">
              Pick a sound
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-mute">
              Play to audition. Add it to the grid, or drag it in.
            </p>
          </div>
          <p className="text-[10px] tracking-[0.22em] text-mute-dim uppercase">
            {sorted.length} showing
          </p>
        </header>

        <div className="sticky top-0 z-20 -mx-4 flex flex-col gap-4 border-b border-hairline bg-black/95 px-4 py-4 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
          {libraryFilters}
        </div>

        {libraryList}

        {previewAudio}
        {error ? <p className="text-muted-foreground text-xs">{error}</p> : null}
      </div>
      <BeatGrid ref={gridRef} items={items} onRecordState={onRecordState} />
    </>
  );
}
