"use client";

import { Synchronizer } from "@/components/sync/synchronizer";
import { useHydrated, useLyricsText } from "@/lib/lyrics-store";

/**
 * Waits for the client store before mounting the synchronizer, so its state
 * is initialized from the real lyrics instead of the empty server snapshot.
 */
export function SyncPage() {
  const hydrated = useHydrated();
  const text = useLyricsText();

  if (!hydrated) {
    return (
      <div className="mx-auto w-full max-w-5xl px-4 py-6">
        <div className="h-[70vh] animate-pulse rounded-xl bg-neutral-300 dark:bg-neutral-800" />
      </div>
    );
  }

  return <Synchronizer initialText={text} />;
}
