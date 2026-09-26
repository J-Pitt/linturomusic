import { useEffect, useMemo, useRef, useState } from "react";
import { getBuffer, getPeaks, peekBuffer, unlockAudio } from "@/lib/audio-cache";
import {
  BASS,
  MORE_PERCUSSION,
  PERCUSSION,
  isBaseLoop,
  loopBeats,
  loopTitle,
  pickSounds,
  sectionName,
} from "@/lib/guided";
import {
  cancelCountIn,
  countIn,
  loopProgress,
  preview,
  resumeLoop,
  setArrangement,
  startLoop,
  stopLoop,
  tapOverdub,
  watchPlayingSection,
  type LoopHit,
  type LoopSection,
} from "@/lib/loop-engine";
import type { SoundItem } from "@/lib/types";

type Step = "loop" | "sections";
type Mode = "play" | "count" | "record";
type Pad = { item: SoundItem; label: string };

const STEPS = [
  { id: "1", label: "Loop" },
  { id: "2", label: "Sections" },
] as const;

function newId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function copyHits(hits: LoopHit[]) {
  return hits.map((hit) => ({ ...hit, id: newId() }));
}

export function GuidedBeat({ items }: { items: SoundItem[] }) {
  const request = useRef(0);
  const [step, setStep] = useState<Step>("loop");
  const [project, setProject] = useState("all");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<SoundItem | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [sections, setSections] = useState<LoopSection[]>([]);
  const [editId, setEditId] = useState<string | null>(null);
  const [repeats, setRepeats] = useState(2);
  const [playing, setPlaying] = useState(0);
  const [mode, setMode] = useState<Mode>("play");
  const [count, setCount] = useState<number | null>(null);
  const [loadingPath, setLoadingPath] = useState<string | null>(null);
  const [morePerc, setMorePerc] = useState(false);

  const loops = useMemo(() => {
    return items.filter(isBaseLoop).sort((a, b) => a.name.localeCompare(b.name));
  }, [items]);

  const projects = useMemo(() => {
    const names = new Set<string>();
    for (const loop of loops) {
      for (const name of loop.projects ?? []) names.add(name);
    }
    return [...names].sort();
  }, [loops]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return loops.filter((loop) => {
      if (project !== "all" && !loop.projects?.includes(project)) return false;
      if (!q) return true;
      return `${loop.name} ${loop.genre ?? ""} ${(loop.projects ?? []).join(" ")}`
        .toLowerCase()
        .includes(q);
    });
  }, [loops, project, query]);

  const percussion = useMemo(() => pickSounds(items, PERCUSSION), [items]);
  const morePercussion = useMemo(() => pickSounds(items, MORE_PERCUSSION), [items]);
  const bass = useMemo(() => pickSounds(items, BASS), [items]);
  const editIndex = Math.max(0, sections.findIndex((section) => section.id === editId));
  const editing = sections[editIndex] ?? null;

  useEffect(() => () => stopLoop(), []);

  useEffect(() => {
    watchPlayingSection(setPlaying);
    return () => watchPlayingSection(null);
  }, []);

  useEffect(() => {
    setArrangement(sections, repeats);
  }, [sections, repeats]);

  async function choose(item: SoundItem) {
    if (selected?.id === item.id) {
      request.current += 1;
      stopLoop();
      setSelected(null);
      setBusyId(null);
      setSections([]);
      setEditId(null);
      return;
    }
    const ticket = ++request.current;
    setBusyId(item.id);
    try {
      await startLoop(item.path);
      if (ticket !== request.current) return;
      setSelected(item);
      setSections([]);
      setEditId(null);
      setPlaying(0);
    } finally {
      if (ticket === request.current) setBusyId(null);
    }
  }

  function beginSections() {
    const id = newId();
    setSections([{ id, hits: [] }]);
    setEditId(id);
    setRepeats(2);
    setPlaying(0);
    setMode("play");
    setCount(null);
    setMorePerc(false);
    setStep("sections");
  }

  function restart() {
    request.current += 1;
    stopLoop();
    setSelected(null);
    setBusyId(null);
    setSections([]);
    setEditId(null);
    setPlaying(0);
    setMode("play");
    setCount(null);
    setStep("loop");
  }

  async function onPad(path: string, record: boolean) {
    if (!peekBuffer(path)) {
      setLoadingPath(path);
      await getBuffer(path).catch(() => null);
      setLoadingPath((current) => (current === path ? null : current));
    }
    if (!peekBuffer(path)) return;
    if (!record) {
      preview(path);
      return;
    }
    const hit = tapOverdub(path);
    if (!hit || !editId) return;
    setSections((prev) =>
      prev.map((section) =>
        section.id === editId ? { ...section, hits: [...section.hits, hit] } : section,
      ),
    );
  }

  async function armRecord() {
    if (!selected) return;
    const beats = Math.max(4, Math.round(loopBeats(selected) ?? 8));
    setMode("count");
    setCount(null);
    const started = await countIn(beats, setCount);
    if (!started) {
      setMode("play");
      setCount(null);
      return;
    }
    setCount(null);
    setMode("record");
  }

  function stopRecord() {
    cancelCountIn();
    resumeLoop();
    setCount(null);
    setMode("play");
  }

  function addSection(empty: boolean) {
    const id = newId();
    setSections((prev) => {
      const source = prev.find((section) => section.id === editId) ?? prev[prev.length - 1];
      const hits = empty || !source ? [] : copyHits(source.hits);
      return [...prev, { id, hits }];
    });
    setEditId(id);
  }

  function clearSection() {
    if (!editId) return;
    setSections((prev) =>
      prev.map((section) => (section.id === editId ? { ...section, hits: [] } : section)),
    );
  }

  function removeSection() {
    if (sections.length < 2 || !editId) return;
    const index = sections.findIndex((section) => section.id === editId);
    const next = sections.filter((section) => section.id !== editId);
    setSections(next);
    setEditId(next[Math.max(0, index - 1)]?.id ?? next[0]?.id ?? null);
  }

  return (
    <div className="relative mx-auto flex h-dvh max-w-lg flex-col bg-ink text-paper">
      <header className="shrink-0 border-b border-hairline px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3">
        <p className="text-[10px] tracking-[0.22em] text-mute-dim uppercase">linturo beats</p>
        <div className="mt-3 flex gap-4">
          {STEPS.map((item, index) => {
            const on = (index === 0 && step === "loop") || (index === 1 && step === "sections");
            const past = index === 0 && step === "sections";
            return (
              <p
                key={item.id}
                className={`text-[11px] tracking-[0.16em] uppercase ${
                  on ? "text-paper" : past ? "text-mute" : "text-mute-dim"
                }`}
              >
                {item.id} {item.label}
              </p>
            );
          })}
        </div>
        {selected && step !== "loop" ? (
          <p className="mt-2 truncate text-xs text-mute">
            {loopTitle(selected)}
            {selected.genre ? ` · ${selected.genre}` : ""}
            {sections.length > 1 ? ` · ${sections.length} sections` : ""}
          </p>
        ) : null}
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {step === "sections" && selected ? (
          <div className="sticky top-0 z-10 border-b border-hairline bg-ink px-4 py-2">
            <p className="mb-1 flex items-center gap-2 text-[10px] tracking-[0.16em] uppercase">
              {mode === "record" ? (
                <span className="inline-flex items-center gap-1.5 text-red-500">
                  <span className="size-2 animate-pulse rounded-full bg-red-500" />
                  Rec
                </span>
              ) : (
                <span className="text-mute-dim">{mode === "count" ? "Count-in" : "Play"}</span>
              )}
              <span className="text-mute-dim">· loop</span>
            </p>
            <LoopWave path={selected.path} recording={mode === "record"} />
          </div>
        ) : null}
        <div className="px-4 py-4">
          {step === "loop" ? (
            <LoopStep
              loops={visible}
              total={loops.length}
              projects={projects}
              project={project}
              query={query}
              selectedId={selected?.id ?? null}
              busyId={busyId}
              onProject={setProject}
              onQuery={setQuery}
              onChoose={(item) => void choose(item)}
            />
          ) : (
            <SectionStep
              percussion={percussion}
              morePercussion={morePercussion}
              showMore={morePerc}
              bass={bass}
              sections={sections}
              editId={editId}
              playing={playing}
              repeats={repeats}
              hits={editing?.hits.length ?? 0}
              mode={mode}
              loadingPath={loadingPath}
              onEdit={setEditId}
              onRepeats={setRepeats}
              onMore={() => setMorePerc((open) => !open)}
              onTap={(path) => void onPad(path, mode === "record")}
            />
          )}
        </div>
      </div>

      <footer className="shrink-0 border-t border-hairline px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        {step === "loop" ? (
          <button
            type="button"
            disabled={!selected || busyId != null}
            onClick={beginSections}
            className="w-full border border-paper py-3.5 text-sm tracking-[0.18em] text-paper uppercase disabled:opacity-30"
          >
            Build sections
          </button>
        ) : (
          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              <button
                type="button"
                disabled={mode !== "play"}
                onClick={() => void armRecord()}
                className="flex-1 border border-paper py-3.5 text-sm tracking-[0.18em] text-paper uppercase disabled:opacity-30"
              >
                Record
              </button>
              <button
                type="button"
                disabled={mode === "play"}
                onClick={stopRecord}
                className={`flex-1 border py-3.5 text-sm tracking-[0.18em] uppercase disabled:opacity-30 ${
                  mode === "record"
                    ? "border-red-500 text-red-500"
                    : "border-hairline text-mute"
                }`}
              >
                Stop
              </button>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => addSection(true)}
                className="flex-1 border border-hairline py-3.5 text-sm tracking-[0.14em] text-mute uppercase"
              >
                Add a break
              </button>
              <button
                type="button"
                onClick={() => addSection(false)}
                className="flex-1 border border-paper bg-paper py-3.5 text-sm tracking-[0.14em] text-black uppercase"
              >
                Add section
              </button>
            </div>
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={clearSection}
                className="py-2 text-[11px] tracking-[0.16em] text-mute uppercase"
              >
                Clear {sectionName(editIndex)}
              </button>
              {sections.length > 1 ? (
                <button
                  type="button"
                  onClick={removeSection}
                  className="py-2 text-[11px] tracking-[0.16em] text-mute uppercase"
                >
                  Remove
                </button>
              ) : null}
              <button
                type="button"
                onClick={restart}
                className="py-2 text-[11px] tracking-[0.16em] text-mute uppercase"
              >
                Start over
              </button>
            </div>
          </div>
        )}
      </footer>

      {mode === "count" && count != null ? (
        <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
          <p className="text-7xl font-light text-paper tabular-nums">{count}</p>
        </div>
      ) : null}

      <style>{`
        .pad-key.pad-lit,
        .pad-key:active {
          border-color: #f5f5f5;
          background: #f5f5f5;
          color: #000;
        }
      `}</style>
    </div>
  );
}

function SectionStep({
  percussion,
  morePercussion,
  showMore,
  bass,
  sections,
  editId,
  playing,
  repeats,
  hits,
  mode,
  loadingPath,
  onEdit,
  onRepeats,
  onMore,
  onTap,
}: {
  percussion: Pad[];
  morePercussion: Pad[];
  showMore: boolean;
  bass: Pad[];
  sections: LoopSection[];
  editId: string | null;
  playing: number;
  repeats: number;
  hits: number;
  mode: Mode;
  loadingPath: string | null;
  onEdit: (id: string) => void;
  onRepeats: (repeats: number) => void;
  onMore: () => void;
  onTap: (path: string) => void;
}) {
  const editIndex = Math.max(0, sections.findIndex((section) => section.id === editId));
  const name = sectionName(editIndex);

  let coach = "Play mode. Tap until the rhythm feels right, then Record. You get a 4-count, then it writes over the loop.";
  if (mode === "record") {
    coach = `Recording onto ${name}. Taps stay on this section.`;
  } else if (mode === "count") {
    coach = "Count-in from the top. Recording starts when the loop does.";
  } else if (editIndex === 0 && hits > 0) {
    coach = "That’s on the intro. Record again to add more, or add a section — it starts as a copy.";
  } else if (editIndex > 0 && hits === 0) {
    coach = `${name} is just the loop. Record into it, or leave it as a break.`;
  } else if (editIndex > 0) {
    coach = `${name} is in the arrangement. Record to add hits. Sections play in order, then the beat repeats.`;
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-light tracking-tight">{name}</h1>
        <p className="mt-2 text-sm leading-relaxed text-mute">{coach}</p>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {sections.map((section, index) => {
          const editing = section.id === editId;
          const live = index === playing;
          return (
            <button
              key={section.id}
              type="button"
              onClick={() => onEdit(section.id)}
              className={`shrink-0 border px-3 py-1.5 text-[11px] tracking-[0.12em] uppercase ${
                editing
                  ? "border-paper bg-paper text-black"
                  : live
                    ? "border-paper text-paper"
                    : "border-hairline text-mute-dim"
              }`}
            >
              {live && !editing ? "● " : ""}
              {sectionName(index)}
              {section.hits.length ? ` ${section.hits.length}` : ""}
            </button>
          );
        })}
      </div>

      {sections.length > 1 ? (
        <div className="flex items-center gap-2">
          <p className="text-[10px] tracking-[0.16em] text-mute-dim uppercase">Hold each</p>
          {[1, 2].map((count) => (
            <button
              key={count}
              type="button"
              onClick={() => onRepeats(count)}
              className={`border px-3 py-1.5 text-[11px] tracking-[0.12em] uppercase ${
                repeats === count ? "border-paper text-paper" : "border-hairline text-mute-dim"
              }`}
            >
              {count}× loop
            </button>
          ))}
        </div>
      ) : null}

      <PadGrid title="Percussion" pads={percussion} loadingPath={loadingPath} onTap={onTap} />
      {morePercussion.length ? (
        <div>
          <button
            type="button"
            onClick={onMore}
            className="mb-2 text-[10px] tracking-[0.16em] text-mute uppercase"
          >
            {showMore ? "Hide extra percussion" : "More percussion"}
          </button>
          {showMore ? (
            <PadGrid pads={morePercussion} loadingPath={loadingPath} onTap={onTap} />
          ) : null}
        </div>
      ) : null}
      <PadGrid title="Bass" pads={bass} loadingPath={loadingPath} onTap={onTap} />
    </div>
  );
}

function LoopStep({
  loops,
  total,
  projects,
  project,
  query,
  selectedId,
  busyId,
  onProject,
  onQuery,
  onChoose,
}: {
  loops: SoundItem[];
  total: number;
  projects: string[];
  project: string;
  query: string;
  selectedId: string | null;
  busyId: string | null;
  onProject: (project: string) => void;
  onQuery: (query: string) => void;
  onChoose: (item: SoundItem) => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-light tracking-tight">Choose your base loop</h1>
        <p className="mt-2 text-sm text-mute">
          {total} project loops, 8 beats or longer. Play one, then build sections on it.
        </p>
      </div>
      <input
        value={query}
        onChange={(e) => onQuery(e.target.value)}
        placeholder="Search loops"
        className="h-10 border border-hairline bg-black px-3 text-sm text-paper outline-none placeholder:text-mute-dim focus:border-paper"
      />
      <div className="flex gap-2 overflow-x-auto pb-1">
        <Chip active={project === "all"} onClick={() => onProject("all")}>
          All
        </Chip>
        {projects.map((name) => (
          <Chip key={name} active={project === name} onClick={() => onProject(name)}>
            {name}
          </Chip>
        ))}
      </div>
      {loops.length === 0 ? (
        <p className="text-sm text-mute">Nothing in this filter.</p>
      ) : (
        <div className="flex flex-col border-t border-hairline">
          {loops.map((loop) => {
            const on = selectedId === loop.id;
            const beats = Math.round(loopBeats(loop) ?? 0);
            return (
              <button
                key={loop.id}
                type="button"
                onClick={() => onChoose(loop)}
                className={`flex items-center justify-between gap-3 border-b border-hairline py-3 text-left ${
                  on ? "text-paper" : "text-mute"
                }`}
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm text-paper">{loopTitle(loop)}</span>
                  <span className="mt-0.5 block truncate text-[11px] text-mute-dim">
                    {loop.genre ?? "Loop"}
                    {loop.projects?.length ? ` · ${loop.projects.slice(0, 2).join(", ")}` : ""}
                    {beats ? ` · ${beats} beats` : ""}
                  </span>
                </span>
                <span className="shrink-0 text-[10px] tracking-[0.16em] uppercase">
                  {busyId === loop.id ? "Loading" : on ? "Playing" : "Play"}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function PadGrid({
  title,
  pads,
  loadingPath,
  onTap,
}: {
  title?: string;
  pads: Pad[];
  loadingPath: string | null;
  onTap: (path: string) => void;
}) {
  if (!pads.length) {
    return <p className="text-sm text-mute">Those sounds aren’t in the library.</p>;
  }
  return (
    <div>
      {title ? (
        <p className="mb-2 text-[10px] tracking-[0.18em] text-mute-dim uppercase">{title}</p>
      ) : null}
      <div className="grid grid-cols-4 gap-2">
        {pads.map((pad) => (
          <button
            key={pad.item.id}
            type="button"
            onPointerDown={(e) => {
              e.preventDefault();
              void unlockAudio();
              onTap(pad.item.path);
              const btn = e.currentTarget;
              btn.classList.add("pad-lit");
              window.setTimeout(() => btn.classList.remove("pad-lit"), 90);
            }}
            className="pad-key touch-manipulation min-h-14 border border-hairline bg-[#111] px-1.5 py-3 text-center text-[10px] leading-tight tracking-[0.06em] text-mute uppercase select-none [-webkit-tap-highlight-color:transparent]"
          >
            {loadingPath === pad.item.path ? "…" : pad.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function LoopWave({ path, recording }: { path: string; recording: boolean }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const headRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    let cancelled = false;

    const paint = (peaks: Float32Array) => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = Math.max(1, wrap.clientWidth);
      const h = 40;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const mid = canvas.height / 2;
      const bars = Math.max(24, Math.floor(w / 3));
      const gap = canvas.width / bars;
      ctx.fillStyle = "rgba(245, 245, 245, 0.82)";
      for (let i = 0; i < bars; i++) {
        const idx = Math.min(peaks.length - 1, Math.floor((i / bars) * peaks.length));
        const mag = Math.max(1, (peaks[idx] ?? 0) * canvas.height * 0.86);
        ctx.fillRect(i * gap, mid - mag / 2, Math.max(1, gap * 0.7), mag);
      }
    };

    void getPeaks(path, 180)
      .then((peaks) => {
        if (!cancelled) paint(peaks);
      })
      .catch(() => null);

    return () => {
      cancelled = true;
    };
  }, [path]);

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const wrap = wrapRef.current;
      const head = headRef.current;
      if (wrap && head) head.style.transform = `translateX(${loopProgress() * wrap.clientWidth}px)`;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div ref={wrapRef} className="relative h-10 overflow-hidden">
      <canvas ref={canvasRef} className="h-10 w-full" aria-hidden />
      <div
        ref={headRef}
        className={`absolute top-0 left-0 h-full w-px ${recording ? "bg-red-400" : "bg-paper"}`}
      />
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 border px-3 py-1.5 text-[11px] tracking-[0.12em] uppercase ${
        active ? "border-paper text-paper" : "border-hairline text-mute-dim"
      }`}
    >
      {children}
    </button>
  );
}
