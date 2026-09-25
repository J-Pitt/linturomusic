import { useEffect, useState } from "react";
import { GuidedBeat } from "@/components/guided-beat";
import { BEATS_CDN } from "@/lib/media";
import type { SoundItem } from "@/lib/types";

export default function BeatsPage() {
  const [items, setItems] = useState<SoundItem[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    document.title = "Linturo Beats";
    let cancelled = false;
    fetch(`${BEATS_CDN}/catalog.json`)
      .then((res) => (res.ok ? res.json() : Promise.reject(res.status)))
      .then((data: { items: SoundItem[] }) => {
        if (!cancelled) setItems(data.items);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-ink px-4 text-sm text-mute">
        Couldn’t load the beat library. Refresh to try again.
      </div>
    );
  }

  if (!items) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-ink text-[10px] tracking-[0.22em] text-mute-dim uppercase">
        Loading beats…
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-ink text-paper">
      <GuidedBeat items={items} />
    </div>
  );
}
