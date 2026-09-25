import { useEffect, useMemo, useRef, useState } from "react";
import { getBuffer, unlockAudio } from "@/lib/audio-cache";
import {
  BASS,
  PERCUSSION,
  isBaseLoop,
  loopBeats,
  loopTitle,
  pickSounds,
} from "@/lib/guided";
import { startLoop, stopLoop, tapOverdub } from "@/lib/loop-engine";
import type { SoundItem } from "@/lib/types";

type Step = "loop" | "perc-ask" | "perc" | "bass-ask" | "bass" | "done";

const STEPS = [
  { id: "1", label: "Loop" },
  { id: "2", label: "Hats" },
  { id: "3", label: "Bass" },
] as const;

function stepNumber(step: Step) {
  if (step === "loop") return 1;
  if (step === "perc-ask" || step === "perc") return 2;
  return 3;
}

export function GuidedBeat({ items }: { items: SoundItem[] }) {
  const request = useRef(0);
  const [step, setStep] = useState<Step>("loop");
  const [project, setProject] = useState("all");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<SoundItem | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [loadingPads, setLoadingPads] = useState(false);
  const [addedPerc, setAddedPerc] = useState(false);
  const [addedBass, setAddedBass] = useState(false);

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
  const bass = useMemo(() => pickSounds(items, BASS), [items]);

  useEffect(() => () => stopLoop(), []);

  async function choose(item: SoundItem) {
    if (selected?.id === item.id) {
      request.current += 1;
      stopLoop();
      setSelected(null);
      setBusyId(null);
      return;
    }
    const ticket = ++request.current;
    setBusyId(item.id);
    try {
      await startLoop(item.path);
      if (ticket !== request.current) return;
      setSelected(item);
      setAddedPerc(false);
      setAddedBass(false);
    } finally {
      if (ticket === request.current) setBusyId(null);
    }
  }

  async function loadThen(sounds: { item: SoundItem }[], next: Step) {
    setLoadingPads(true);
    await Promise.all(sounds.map((sound) => getBuffer(sound.item.path).catch(() => null)));
    setLoadingPads(false);
    setStep(next);
  }

  function restart() {
    request.current += 1;
    stopLoop();
    setSelected(null);
    setAddedPerc(false);
    setAddedBass(false);
    setBusyId(null);
    setStep("loop");
  }

  const n = stepNumber(step);

  return (
    <div className="mx-auto flex h-dvh max-w-lg flex-col bg-ink text-paper">
      <header className="shrink-0 border-b border-hairline px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3">
        <p className="text-[10px] tracking-[0.22em] text-mute-dim uppercase">linturo beats</p>
        <div className="mt-3 flex gap-4">
          {STEPS.map((item, index) => {
            const current = index + 1;
            const on = current === n;
            const past = current < n;
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
          </p>
        ) : null}
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
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
        ) : null}

        {step === "perc-ask" ? (
          <Ask
            title="Add any percussion?"
            body="A few closed hats, open hats, and cymbals to tap over the loop."
          />
        ) : null}

        {step === "perc" ? (
          <PadStep
            title="Tap the hats"
            body="They play now and come back around with the loop."
            pads={percussion}
          />
        ) : null}

        {step === "bass-ask" ? (
          <Ask
            title="Add more bass?"
            body="Seven short bass hits. Tap them in over the loop."
          />
        ) : null}

        {step === "bass" ? (
          <PadStep
            title="Tap the bass"
            body="Hard, short hits. They loop with the beat."
            pads={bass}
          />
        ) : null}

        {step === "done" ? (
          <div className="flex flex-col gap-6">
            <div>
              <h1 className="text-2xl font-light tracking-tight">That’s the beat.</h1>
              <p className="mt-2 text-sm text-mute">
                {selected ? loopTitle(selected) : "Your loop"} is playing
                {addedPerc || addedBass ? " with what you tapped in." : "."}
              </p>
            </div>
            {addedPerc ? <PadGrid title="Hats" pads={percussion} /> : null}
            {addedBass ? <PadGrid title="Bass" pads={bass} /> : null}
          </div>
        ) : null}
      </div>

      <footer className="shrink-0 border-t border-hairline px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        {step === "loop" ? (
          <button
            type="button"
            disabled={!selected || busyId != null}
            onClick={() => setStep("perc-ask")}
            className="w-full border border-paper py-3.5 text-sm tracking-[0.18em] text-paper uppercase disabled:opacity-30"
          >
            Use this loop
          </button>
        ) : null}

        {step === "perc-ask" ? (
          <YesNo
            busy={loadingPads}
            onYes={() => {
              setAddedPerc(true);
              void loadThen(percussion, "perc");
            }}
            onNo={() => {
              setAddedPerc(false);
              setStep("bass-ask");
            }}
          />
        ) : null}

        {step === "perc" ? (
          <div className="flex gap-2">
            <Back onClick={() => setStep("perc-ask")} />
            <button
              type="button"
              onClick={() => setStep("bass-ask")}
              className="flex-1 border border-paper py-3.5 text-sm tracking-[0.18em] text-paper uppercase"
            >
              Next
            </button>
          </div>
        ) : null}

        {step === "bass-ask" ? (
          <div className="flex flex-col gap-2">
            <YesNo
              busy={loadingPads}
              onYes={() => {
                setAddedBass(true);
                void loadThen(bass, "bass");
              }}
              onNo={() => {
                setAddedBass(false);
                setStep("done");
              }}
            />
            <button
              type="button"
              onClick={() => setStep(addedPerc ? "perc" : "perc-ask")}
              className="py-2 text-[11px] tracking-[0.16em] text-mute uppercase"
            >
              Back
            </button>
          </div>
        ) : null}

        {step === "bass" ? (
          <div className="flex gap-2">
            <Back onClick={() => setStep("bass-ask")} />
            <button
              type="button"
              onClick={() => setStep("done")}
              className="flex-1 border border-paper bg-paper py-3.5 text-sm tracking-[0.18em] text-black uppercase"
            >
              That’s the beat
            </button>
          </div>
        ) : null}

        {step === "done" ? (
          <button
            type="button"
            onClick={restart}
            className="w-full border border-hairline py-3.5 text-sm tracking-[0.18em] text-mute uppercase"
          >
            Start over
          </button>
        ) : null}
      </footer>

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
          {total} project loops, 8 beats or longer. Play one, then use it.
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

function Ask({ title, body }: { title: string; body: string }) {
  return (
    <div>
      <h1 className="text-2xl font-light tracking-tight">{title}</h1>
      <p className="mt-2 text-sm leading-relaxed text-mute">{body}</p>
    </div>
  );
}

function PadStep({
  title,
  body,
  pads,
}: {
  title: string;
  body: string;
  pads: { item: SoundItem; label: string }[];
}) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-light tracking-tight">{title}</h1>
        <p className="mt-2 text-sm text-mute">{body}</p>
      </div>
      <PadGrid pads={pads} />
    </div>
  );
}

function PadGrid({
  title,
  pads,
}: {
  title?: string;
  pads: { item: SoundItem; label: string }[];
}) {
  if (!pads.length) {
    return <p className="text-sm text-mute">Those sounds aren’t in the library.</p>;
  }
  return (
    <div>
      {title ? (
        <p className="mb-2 text-[10px] tracking-[0.18em] text-mute-dim uppercase">{title}</p>
      ) : null}
      <div className="grid grid-cols-2 gap-2">
        {pads.map((pad) => (
          <button
            key={pad.item.id}
            type="button"
            onPointerDown={(e) => {
              e.preventDefault();
              void unlockAudio();
              tapOverdub(pad.item.path);
              const btn = e.currentTarget;
              btn.classList.add("pad-lit");
              window.setTimeout(() => btn.classList.remove("pad-lit"), 90);
            }}
            className="pad-key touch-manipulation min-h-16 border border-hairline bg-[#111] px-3 py-4 text-left text-[11px] tracking-[0.12em] text-mute uppercase select-none [-webkit-tap-highlight-color:transparent]"
          >
            {pad.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function YesNo({
  busy,
  onYes,
  onNo,
}: {
  busy: boolean;
  onYes: () => void;
  onNo: () => void;
}) {
  return (
    <div className="flex gap-2">
      <button
        type="button"
        disabled={busy}
        onClick={onNo}
        className="flex-1 border border-hairline py-3.5 text-sm tracking-[0.18em] text-mute uppercase disabled:opacity-40"
      >
        No
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={onYes}
        className="flex-1 border border-paper bg-paper py-3.5 text-sm tracking-[0.18em] text-black uppercase disabled:opacity-40"
      >
        {busy ? "Loading" : "Yes"}
      </button>
    </div>
  );
}

function Back({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="border border-hairline px-4 py-3.5 text-sm tracking-[0.16em] text-mute uppercase"
    >
      Back
    </button>
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
