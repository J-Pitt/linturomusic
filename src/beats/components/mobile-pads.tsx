import { useEffect, useRef, useState } from "react";
import { Circle, ChevronLeft, ChevronRight } from "lucide-react";
import { preloadBuffers, unlockAudio } from "@/lib/audio-cache";
import { shortPadLabel, type PadBank } from "@/lib/pad-banks";
import type { SoundItem } from "@/lib/types";

type Props = {
  banks: PadBank[];
  recording: boolean;
  countInBeat: number | null;
  onHit: (item: SoundItem) => void;
  onRecord: () => void;
  onScrollSounds: () => void;
  onScrollGrid: () => void;
};

function bankPaths(bank: PadBank | undefined) {
  if (!bank) return [];
  return bank.pads.filter(Boolean).map((p) => p!.path);
}

export function MobilePads({
  banks,
  recording,
  countInBeat,
  onHit,
  onRecord,
  onScrollSounds,
  onScrollGrid,
}: Props) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const onHitRef = useRef(onHit);
  const [bankIndex, setBankIndex] = useState(0);
  const bank = banks[bankIndex] ?? banks[0];
  onHitRef.current = onHit;

  useEffect(() => {
    void unlockAudio();
  }, []);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollTo({ left: bankIndex * el.clientWidth });
  }, [bankIndex, banks.length]);

  // Preload visible bank first, then neighbors, then the rest — keeps first hits buffered.
  useEffect(() => {
    const priority = [
      ...bankPaths(banks[bankIndex]),
      ...bankPaths(banks[bankIndex - 1]),
      ...bankPaths(banks[bankIndex + 1]),
    ];
    preloadBuffers(priority);

    const rest: string[] = [];
    for (let i = 0; i < banks.length; i++) {
      if (Math.abs(i - bankIndex) <= 1) continue;
      rest.push(...bankPaths(banks[i]));
    }
    const idleId =
      typeof requestIdleCallback === "function"
        ? requestIdleCallback(() => preloadBuffers(rest), { timeout: 2500 })
        : 0;
    const timeoutId =
      typeof requestIdleCallback === "function"
        ? 0
        : window.setTimeout(() => preloadBuffers(rest), 400);
    return () => {
      if (idleId && typeof cancelIdleCallback === "function") cancelIdleCallback(idleId);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [banks, bankIndex]);

  function onScroll() {
    const el = scrollerRef.current;
    if (!el?.clientWidth) return;
    const i = Math.round(el.scrollLeft / el.clientWidth);
    if (i !== bankIndex && i >= 0 && i < banks.length) setBankIndex(i);
  }

  function flashEl(btn: HTMLElement) {
    btn.classList.add("pad-lit");
    window.setTimeout(() => btn.classList.remove("pad-lit"), 90);
  }

  function hit(item: SoundItem | null, btn: HTMLElement) {
    if (!item) return;
    // Audio first — never wait on React paint / classList.
    onHitRef.current(item);
    flashEl(btn);
  }

  function goBank(dir: number) {
    const next = Math.max(0, Math.min(banks.length - 1, bankIndex + dir));
    setBankIndex(next);
    const el = scrollerRef.current;
    if (el) el.scrollTo({ left: next * el.clientWidth, behavior: "smooth" });
  }

  return (
    <div className="relative flex h-full min-h-0 flex-col bg-black px-3 pt-[max(0.5rem,env(safe-area-inset-top))] pb-[max(0.5rem,env(safe-area-inset-bottom))]">
      <div className="mb-2 flex shrink-0 items-center justify-between gap-2">
        <button
          type="button"
          onClick={onScrollSounds}
          className="text-[11px] tracking-[0.16em] text-mute-dim uppercase"
        >
          ↑ Sounds
        </button>
        <div className="min-w-0 text-center">
          <p className="truncate text-xs tracking-[0.18em] text-paper uppercase">
            {bank?.label ?? "Pads"}
          </p>
          <p className="truncate text-[11px] text-mute-dim">
            {countInBeat != null
              ? `Count-in ${countInBeat}`
              : recording
                ? "Recording…"
                : "Swipe banks · tap pads"}
          </p>
        </div>
        <button
          type="button"
          onClick={onScrollGrid}
          className="text-[11px] tracking-[0.16em] text-mute-dim uppercase"
        >
          Grid ↓
        </button>
      </div>

      <div className="mb-2 flex shrink-0 items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => goBank(-1)}
          disabled={bankIndex === 0}
          className="border border-hairline p-2 text-mute disabled:opacity-30"
          aria-label="Previous bank"
        >
          <ChevronLeft className="size-4" />
        </button>
        <div className="flex max-w-[50vw] gap-1 overflow-hidden">
          {banks.map((b, i) => (
            <span
              key={b.id}
              className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                i === bankIndex ? "bg-paper" : "bg-hairline"
              }`}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={() => goBank(1)}
          disabled={bankIndex >= banks.length - 1}
          className="border border-hairline p-2 text-mute disabled:opacity-30"
          aria-label="Next bank"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>

      <div
        ref={scrollerRef}
        onScroll={onScroll}
        className="flex min-h-0 flex-1 snap-x snap-mandatory overflow-x-auto overflow-y-hidden overscroll-x-contain"
        style={{ WebkitOverflowScrolling: "touch", touchAction: "pan-x" }}
      >
        {banks.map((b) => (
          <div
            key={b.id}
            className="grid h-full w-full shrink-0 snap-start snap-always grid-cols-4 grid-rows-4 gap-2 p-0.5"
          >
            {b.pads.map((pad, i) => (
              <button
                key={pad?.id ?? `${b.id}-${i}`}
                type="button"
                disabled={!pad}
                onPointerDown={(e) => {
                  if (!pad) return;
                  // Capture the gesture before click delay / scroll steal.
                  e.preventDefault();
                  e.currentTarget.setPointerCapture?.(e.pointerId);
                  void unlockAudio();
                  hit(pad, e.currentTarget);
                }}
                className={`pad-key touch-manipulation select-none rounded-sm border text-[10px] leading-tight tracking-[0.06em] uppercase [-webkit-tap-highlight-color:transparent] ${
                  !pad
                    ? "border-hairline/40 bg-[#080808] text-mute-dim/40"
                    : "border-hairline bg-[#111] text-mute active:border-paper active:bg-paper active:text-black"
                }`}
              >
                {pad ? shortPadLabel(pad) : "—"}
              </button>
            ))}
          </div>
        ))}
      </div>

      <div className="mt-3 shrink-0">
        <button
          type="button"
          onClick={onRecord}
          className={`flex w-full items-center justify-center gap-2 border py-3.5 text-sm tracking-[0.18em] uppercase ${
            recording || countInBeat != null
              ? "animate-pulse border-paper bg-paper text-black"
              : "border-paper text-paper"
          }`}
        >
          <Circle
            className={`size-4 ${recording || countInBeat != null ? "fill-current" : ""}`}
          />
          {countInBeat != null ? `Ready ${countInBeat}` : recording ? "Stop" : "Record"}
        </button>
      </div>

      {countInBeat != null ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <p className="text-7xl font-light text-paper/90 tabular-nums">{countInBeat}</p>
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
