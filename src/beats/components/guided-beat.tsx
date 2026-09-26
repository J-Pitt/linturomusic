import { useEffect, useMemo, useRef, useState } from "react";
import { getBuffer, getPeaks, peekBuffer, putBuffer, unlockAudio } from "@/lib/audio-cache";
import { downloadWav } from "@/lib/download-beat";
import {
  BASS,
  EXTRA_BASS,
  EXTRA_PERCUSSION,
  PERCUSSION,
  isBaseLoop,
  loopBeats,
  loopTitle,
  pickSounds,
  sectionName,
} from "@/lib/guided";
import {
  arrangementProgress,
  beatsInDuration,
  countIn,
  preview,
  renderArrangement,
  resumeLoop,
  pausePlayback,
  sectionSpans,
  setArrangement,
  startLoop,
  stopLoop,
  tapOverdub,
  watchPlayingSection,
  type LoopHit,
  type LoopSection,
} from "@/lib/loop-engine";
import { startSampleRecording } from "@/lib/sample-recorder";
import type { SoundItem } from "@/lib/types";

type Step = "loop" | "sections";
type Mode = "play" | "count" | "record";
type Pad = { item: SoundItem; label: string };
type CustomSample = { id: string; name: string };

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
  const [pickingLoop, setPickingLoop] = useState(false);
  const [running, setRunning] = useState(true);
  const [samples, setSamples] = useState<CustomSample[]>([]);
  const [sampling, setSampling] = useState(false);
  const [askingMic, setAskingMic] = useState(false);
  const [sampleError, setSampleError] = useState<string | null>(null);
  const [focusSample, setFocusSample] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const sampleTake = useRef<{ stop: () => AudioBuffer } | null>(null);
  const sampleTimer = useRef(0);
  const resumeAfterSample = useRef(false);
  const [recordSnap, setRecordSnap] = useState<{ id: string; hits: LoopHit[] }[] | null>(null);
  const [showMoreArrow, setShowMoreArrow] = useState(false);
  const sectionsRef = useRef(sections);
  const scrollRef = useRef<HTMLDivElement>(null);
  const moreRef = useRef<HTMLDivElement>(null);
  sectionsRef.current = sections;

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

  const listed = useMemo(() => {
    const counts = new Map<string, number>();
    for (const loop of loops) {
      for (const name of loop.projects ?? []) counts.set(name, (counts.get(name) ?? 0) + 1);
    }
    const sizes = [...counts.values()].sort((a, b) => a - b);
    const cutoff = (sizes[Math.floor(sizes.length / 2)] ?? 0) * 1.5;
    const pool = project === "all" ? loops : loops.filter((loop) => loop.projects?.includes(project));
    const count = project === "all" ? loops.length : (counts.get(project) ?? pool.length);
    if (count <= cutoff) return pool;
    return pool.slice(0, Math.ceil((pool.length * 2) / 3));
  }, [loops, project]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return listed;
    return listed.filter((loop) =>
      `${loop.name} ${loop.genre ?? ""} ${(loop.projects ?? []).join(" ")}`.toLowerCase().includes(q),
    );
  }, [listed, query]);

  const percussion = useMemo(() => pickSounds(items, PERCUSSION), [items]);
  const extraPercussion = useMemo(
    () => EXTRA_PERCUSSION.map((group) => ({ title: group.title, pads: pickSounds(items, group.pads) })),
    [items],
  );
  const bass = useMemo(() => pickSounds(items, BASS), [items]);
  const extraBass = useMemo(() => pickSounds(items, EXTRA_BASS), [items]);
  const editIndex = Math.max(0, sections.findIndex((section) => section.id === editId));
  const editing = sections[editIndex] ?? null;

  useEffect(
    () => () => {
      stopLoop();
      if (sampleTimer.current) window.clearTimeout(sampleTimer.current);
      try {
        sampleTake.current?.stop();
      } catch {
        /* mic already closed */
      }
    },
    [],
  );

  useEffect(() => {
    watchPlayingSection(setPlaying);
    return () => watchPlayingSection(null);
  }, []);

  useEffect(() => {
    setArrangement(sections, repeats);
  }, [sections, repeats]);

  useEffect(() => {
    const root = scrollRef.current;
    const target = moreRef.current;
    if (step !== "sections" || pickingLoop || !root || !target) {
      setShowMoreArrow(false);
      return;
    }
    const update = () => {
      const rootBox = root.getBoundingClientRect();
      const box = target.getBoundingClientRect();
      const seen = box.top < rootBox.bottom - 8;
      setShowMoreArrow(!seen);
    };
    update();
    root.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      root.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [step, pickingLoop, extraPercussion, extraBass]);

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
    if (!selected) return;
    const id = newId();
    setSections([{ id, hits: [], loopPath: selected.path }]);
    setEditId(id);
    setRepeats(2);
    setPlaying(0);
    setMode("play");
    setCount(null);
    setRecordSnap(null);
    setRunning(true);
    setPickingLoop(false);
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
    setRecordSnap(null);
    setRunning(true);
    setPickingLoop(false);
    setStep("loop");
  }

  async function addLoopSection(item: SoundItem) {
    const ticket = ++request.current;
    setBusyId(item.id);
    try {
      await getBuffer(item.path);
      if (ticket !== request.current) return;
      const id = newId();
      setSections((prev) => [...prev, { id, hits: [], loopPath: item.path }]);
      setEditId(id);
      setPickingLoop(false);
    } finally {
      if (ticket === request.current) setBusyId(null);
    }
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
    setRunning(true);
    const started = await countIn(beats, setCount);
    if (!started) {
      setMode("play");
      setCount(null);
      return;
    }
    setCount(null);
    setRecordSnap(
      sectionsRef.current.map((section) => ({
        id: section.id,
        hits: section.hits.map((hit) => ({ ...hit })),
      })),
    );
    setMode("record");
  }

  function undoRecord() {
    if (!recordSnap) return;
    const byId = new Map(recordSnap.map((section) => [section.id, section.hits]));
    setSections((prev) =>
      prev.map((section) => {
        const hits = byId.get(section.id);
        return hits ? { ...section, hits: hits.map((hit) => ({ ...hit })) } : section;
      }),
    );
    setRecordSnap(null);
    if (mode !== "play") stopPlayback();
  }

  function stopPlayback() {
    pausePlayback();
    setCount(null);
    setMode("play");
    setRunning(false);
  }

  function startPlayback() {
    resumeLoop();
    setRunning(true);
  }

  async function finishSample() {
    if (sampleTimer.current) {
      window.clearTimeout(sampleTimer.current);
      sampleTimer.current = 0;
    }
    const take = sampleTake.current;
    if (!take) return;
    sampleTake.current = null;
    setSampling(false);
    try {
      const buffer = take.stop();
      const id = `sample:${newId()}`;
      putBuffer(id, buffer);
      setSamples((prev) => [...prev, { id, name: `Sample ${prev.length + 1}` }]);
      setFocusSample(id);
      setSampleError(null);
    } catch {
      setSampleError("Couldn’t save that sample.");
    }
    if (resumeAfterSample.current) {
      resumeAfterSample.current = false;
      startPlayback();
    }
  }

  async function toggleSample() {
    if (sampleTake.current) {
      await finishSample();
      return;
    }
    if (askingMic) return;
    setSampleError(null);
    if (mode !== "play") {
      stopPlayback();
    } else if (running) {
      resumeAfterSample.current = true;
      pausePlayback();
      setRunning(false);
    }
    setAskingMic(true);
    try {
      sampleTake.current = await startSampleRecording();
      setSampling(true);
      sampleTimer.current = window.setTimeout(() => {
        if (sampleTake.current) void finishSample();
      }, 15000);
    } catch {
      setSampleError("Allow the microphone to record a sample.");
      if (resumeAfterSample.current) {
        resumeAfterSample.current = false;
        startPlayback();
      }
    } finally {
      setAskingMic(false);
    }
  }

  function renameSample(id: string, name: string) {
    setSamples((prev) => prev.map((sample) => (sample.id === id ? { ...sample, name } : sample)));
  }

  async function downloadBeat() {
    if (exporting) return;
    setExporting(true);
    try {
      const buffer = await renderArrangement();
      if (!buffer) return;
      const title = selected ? loopTitle(selected) : "beat";
      const safe = title.replace(/[^\w\- ]+/g, "").trim().replace(/\s+/g, "-") || "beat";
      downloadWav(buffer, `linturo-${safe}`);
    } finally {
      setExporting(false);
    }
  }

  function addSection(empty: boolean) {
    const id = newId();
    setSections((prev) => {
      const source = prev.find((section) => section.id === editId) ?? prev[prev.length - 1];
      const hits = empty || !source ? [] : copyHits(source.hits);
      const loopPath = empty ? null : (source?.loopPath ?? null);
      return [...prev, { id, hits, loopPath }];
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

      <div className="relative min-h-0 flex-1">
        <div ref={scrollRef} className="h-full overflow-y-auto">
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
              <span className="text-mute-dim">· whole beat</span>
            </p>
            <ArrangementWave
              sections={sections}
              editId={editId}
              repeats={repeats}
              recording={mode === "record"}
            />
          </div>
        ) : null}
        <div className="px-4 py-4">
          {step === "loop" || pickingLoop ? (
            <LoopStep
              title={pickingLoop ? "Add a loop section" : "Choose your base loop"}
              body={
                pickingLoop
                  ? "This loop becomes the next section. The waveform keeps the blank space around it."
                  : `${listed.length} project loops, 8 beats or longer. Play one, then build sections on it.`
              }
              loops={visible}
              projects={projects}
              project={project}
              query={query}
              selectedId={pickingLoop ? null : (selected?.id ?? null)}
              busyId={busyId}
              action={pickingLoop ? "Add" : "Play"}
              onProject={setProject}
              onQuery={setQuery}
              onChoose={(item) => void (pickingLoop ? addLoopSection(item) : choose(item))}
            />
          ) : (
            <SectionStep
              percussion={percussion}
              extraPercussion={extraPercussion}
              bass={bass}
              extraBass={extraBass}
              moreRef={moreRef}
              sections={sections}
              editId={editId}
              playing={playing}
              repeats={repeats}
              hits={editing?.hits.length ?? 0}
              mode={mode}
              loadingPath={loadingPath}
              onEdit={setEditId}
              onRepeats={setRepeats}
              onTap={(path) => void onPad(path, mode === "record")}
              samples={samples}
              sampling={sampling}
              askingMic={askingMic}
              sampleError={sampleError}
              focusSample={focusSample}
              onRecordSample={() => void toggleSample()}
              onRename={renameSample}
            />
          )}
        </div>
        </div>
        {showMoreArrow ? (
          <button
            type="button"
            onClick={() => moreRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
            className="absolute bottom-3 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2 border border-hairline bg-ink/95 px-3 py-2 text-[10px] tracking-[0.16em] text-paper uppercase"
          >
            More sounds
            <span aria-hidden className="text-sm leading-none">
              ↓
            </span>
          </button>
        ) : null}
      </div>

      <footer className="shrink-0 border-t border-hairline px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        {step === "loop" || pickingLoop ? (
          <button
            type="button"
            disabled={!selected || busyId != null}
            onClick={pickingLoop ? () => setPickingLoop(false) : beginSections}
            className="w-full border border-paper py-3.5 text-sm tracking-[0.18em] text-paper uppercase disabled:opacity-30"
          >
            {pickingLoop ? "Back" : "Build sections"}
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
                onClick={running ? stopPlayback : startPlayback}
                className={`flex-1 border py-3.5 text-sm tracking-[0.18em] uppercase ${
                  mode === "record"
                    ? "border-red-500 text-red-500"
                    : "border-paper text-paper"
                }`}
              >
                {running ? "Stop" : "Play"}
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
                className="flex-1 border border-hairline py-3.5 text-sm tracking-[0.14em] text-mute uppercase"
              >
                Add section
              </button>
              <button
                type="button"
                onClick={() => setPickingLoop(true)}
                className="flex-1 border border-paper bg-paper py-3.5 text-sm tracking-[0.14em] text-black uppercase"
              >
                Add loop
              </button>
            </div>
            <button
              type="button"
              disabled={exporting}
              onClick={() => void downloadBeat()}
              className="w-full border border-paper py-3.5 text-sm tracking-[0.18em] text-paper uppercase disabled:opacity-30"
            >
              {exporting ? "Preparing…" : "Download beat"}
            </button>
            <button
              type="button"
              disabled={!recordSnap}
              onClick={undoRecord}
              className="w-full border border-hairline py-3 text-[11px] tracking-[0.16em] text-mute uppercase disabled:opacity-30"
            >
              Undo last record
            </button>
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
  extraPercussion,
  bass,
  extraBass,
  moreRef,
  sections,
  editId,
  playing,
  repeats,
  hits,
  mode,
  loadingPath,
  onEdit,
  onRepeats,
  onTap,
  samples,
  sampling,
  askingMic,
  sampleError,
  focusSample,
  onRecordSample,
  onRename,
}: {
  percussion: Pad[];
  extraPercussion: { title: string; pads: Pad[] }[];
  bass: Pad[];
  extraBass: Pad[];
  moreRef: { current: HTMLDivElement | null };
  sections: LoopSection[];
  editId: string | null;
  playing: number;
  repeats: number;
  hits: number;
  mode: Mode;
  loadingPath: string | null;
  onEdit: (id: string) => void;
  onRepeats: (repeats: number) => void;
  onTap: (path: string) => void;
  samples: CustomSample[];
  sampling: boolean;
  askingMic: boolean;
  sampleError: string | null;
  focusSample: string | null;
  onRecordSample: () => void;
  onRename: (id: string, name: string) => void;
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
  } else if (editIndex > 0 && !sections[editIndex]?.loopPath) {
    coach = `${name} is a blank. It stays in the waveform so you can hear the other sections around it.`;
  } else if (editIndex > 0 && hits === 0) {
    coach = `${name} is a new loop. Tap sounds to try them with the rest of the beat.`;
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

      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={onRecordSample}
          disabled={askingMic}
          className={`border py-3.5 text-sm tracking-[0.18em] uppercase disabled:opacity-30 ${
            sampling ? "border-red-500 text-red-500" : "border-paper text-paper"
          }`}
        >
          {sampling ? "Stop sample" : askingMic ? "Listening…" : "Record sample"}
        </button>
        {sampleError ? <p className="text-sm text-mute">{sampleError}</p> : null}
        {samples.length ? (
          <div>
            <p className="mb-2 text-[10px] tracking-[0.18em] text-mute-dim uppercase">Your samples</p>
            <div className="grid grid-cols-2 gap-2">
              {samples.map((sample) => (
                <div key={sample.id} className="flex flex-col gap-1">
                  <button
                    type="button"
                    onPointerDown={(event) => {
                      event.preventDefault();
                      void unlockAudio();
                      onTap(sample.id);
                    }}
                    className="pad-key touch-manipulation min-h-14 border border-hairline bg-[#111] px-2 py-3 text-center text-[10px] tracking-[0.06em] text-paper uppercase"
                  >
                    {sample.name.trim() || "Sample"}
                  </button>
                  <input
                    value={sample.name}
                    autoFocus={sample.id === focusSample}
                    onChange={(event) => onRename(sample.id, event.target.value)}
                    placeholder="Name this sample"
                    className="h-8 border border-hairline bg-black px-2 text-xs text-paper outline-none placeholder:text-mute-dim focus:border-paper"
                  />
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
      <PadGrid title="Percussion" pads={percussion} loadingPath={loadingPath} onTap={onTap} />
      <PadGrid title="Bass" pads={bass} loadingPath={loadingPath} onTap={onTap} />
      <div ref={moreRef} className="flex flex-col gap-4 pt-2">
        {extraPercussion.map((group) => (
          <PadGrid
            key={group.title}
            title={group.title}
            pads={group.pads}
            loadingPath={loadingPath}
            onTap={onTap}
          />
        ))}
        <PadGrid title="More bass" pads={extraBass} loadingPath={loadingPath} onTap={onTap} />
      </div>
    </div>
  );
}

function LoopStep({
  title,
  body,
  loops,
  projects,
  project,
  query,
  selectedId,
  busyId,
  action,
  onProject,
  onQuery,
  onChoose,
}: {
  title: string;
  body: string;
  loops: SoundItem[];
  projects: string[];
  project: string;
  query: string;
  selectedId: string | null;
  busyId: string | null;
  action: string;
  onProject: (project: string) => void;
  onQuery: (query: string) => void;
  onChoose: (item: SoundItem) => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-light tracking-tight">{title}</h1>
        <p className="mt-2 text-sm text-mute">{body}</p>
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
                  {busyId === loop.id ? "Loading" : on ? "Playing" : action}
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

const BEAT_PX = 16;

function ArrangementWave({
  sections,
  editId,
  repeats,
  recording,
}: {
  sections: LoopSection[];
  editId: string | null;
  repeats: number;
  recording: boolean;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const headRef = useRef<HTMLDivElement>(null);
  const shape = `${editId}|${repeats}|${sections
    .map(
      (section) =>
        `${section.id}:${section.loopPath ?? "blank"}:${section.hits.map((hit) => hit.offset.toFixed(3)).join(",")}`,
    )
    .join("|")}`;

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    let cancelled = false;

    const paint = (peaksByPath: Map<string, Float32Array>) => {
      if (cancelled) return;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const { spans, total } = sectionSpans();
      const pxPerSec = (140 / 60) * BEAT_PX;
      const cssW = Math.max(wrap.clientWidth, Math.ceil(total * pxPerSec));
      const h = 64;
      canvas.style.width = `${cssW}px`;
      canvas.style.height = `${h}px`;
      canvas.width = Math.floor(cssW * dpr);
      canvas.height = Math.floor(h * dpr);
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const mid = canvas.height / 2;
      const byId = new Map(sections.map((section) => [section.id, section]));

      spans.forEach((span, index) => {
        const x0 = (span.start / total) * canvas.width;
        const x1 = ((span.start + span.hold) / total) * canvas.width;
        const width = Math.max(1, x1 - x0);
        if (span.id === editId) {
          ctx.fillStyle = "rgba(245, 245, 245, 0.05)";
          ctx.fillRect(x0, 0, width, canvas.height);
        }
        const peaks = span.loopPath ? peaksByPath.get(span.loopPath) : null;
        if (!peaks) {
          ctx.fillStyle = "rgba(255, 255, 255, 0.035)";
          ctx.fillRect(x0, 0, width, canvas.height);
        } else {
          const repeatsInSpan = Math.max(1, Math.round(span.hold / Math.max(span.loopDur, 0.01)));
          const slice = width / repeatsInSpan;
          const bars = Math.max(8, Math.floor(slice / (2 * dpr)));
          ctx.fillStyle = "rgba(245, 245, 245, 0.7)";
          for (let repeat = 0; repeat < repeatsInSpan; repeat++) {
            const origin = x0 + repeat * slice;
            for (let i = 0; i < bars; i++) {
              const idx = Math.min(peaks.length - 1, Math.floor((i / bars) * peaks.length));
              const mag = Math.max(1, (peaks[idx] ?? 0) * canvas.height * 0.7);
              const gap = slice / bars;
              ctx.fillRect(origin + i * gap, mid - mag / 2, Math.max(1, gap * 0.62), mag);
            }
          }
        }

        const beats = Math.max(
          1,
          Math.round(span.hold / Math.max(span.loopDur, 0.01)) * beatsInDuration(span.loopDur),
        );
        for (let beat = 0; beat < beats; beat++) {
          const x = x0 + (beat / beats) * width;
          const bar = beat % 4 === 0;
          ctx.fillStyle = bar ? "rgba(245, 245, 245, 0.55)" : "rgba(245, 245, 245, 0.2)";
          ctx.fillRect(Math.round(x), 0, bar ? Math.max(1, dpr) : 1, canvas.height);
        }
        if (index > 0) {
          ctx.fillStyle = "rgba(245, 245, 245, 0.9)";
          ctx.fillRect(Math.round(x0), 0, Math.max(2, dpr), canvas.height);
        }

        const hits = byId.get(span.id)?.hits ?? [];
        const repeatsInSpan = Math.max(1, Math.round(span.hold / Math.max(span.loopDur, 0.01)));
        ctx.fillStyle = recording ? "rgba(248, 113, 113, 0.95)" : "rgba(245, 245, 245, 0.95)";
        for (const hit of hits) {
          for (let repeat = 0; repeat < repeatsInSpan; repeat++) {
            const at = span.start + repeat * span.loopDur + hit.offset;
            const x = (at / total) * canvas.width;
            ctx.fillRect(x - dpr, canvas.height - 8 * dpr, Math.max(2, dpr * 1.5), 6 * dpr);
          }
        }
      });
    };

    const paths = [...new Set(sections.map((section) => section.loopPath).filter((path): path is string => !!path))];
    paint(new Map());
    void Promise.all(paths.map(async (path) => [path, await getPeaks(path, 120)] as const))
      .then((pairs) => {
        if (!cancelled) paint(new Map(pairs));
      })
      .catch(() => null);

    return () => {
      cancelled = true;
    };
  }, [shape, sections, editId, recording]);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap || !editId) return;
    const { spans, total } = sectionSpans();
    const span = spans.find((item) => item.id === editId);
    if (!span) return;
    const x = (span.start / total) * wrap.scrollWidth;
    wrap.scrollTo({ left: Math.max(0, x), behavior: "smooth" });
  }, [editId, shape]);

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const wrap = wrapRef.current;
      const head = headRef.current;
      if (wrap && head) {
        const width = Math.max(wrap.scrollWidth, wrap.clientWidth);
        head.style.transform = `translateX(${arrangementProgress() * width}px)`;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div ref={wrapRef} className="relative h-16 overflow-x-auto overflow-y-hidden bg-[#080808]">
      <canvas ref={canvasRef} className="h-16" aria-hidden />
      <div
        ref={headRef}
        className={`pointer-events-none absolute top-0 left-0 z-10 h-full w-px ${recording ? "bg-red-400" : "bg-paper"}`}
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
