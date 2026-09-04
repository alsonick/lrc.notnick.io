"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { SyncSession } from "@/components/sync/sync-session";
import { Button } from "@/components/ui/button";
import {
  parseLyrics,
  serializeLyrics,
  trimBlankEdges,
  type LyricLine,
} from "@/lib/lrc";
import {
  setAudioFile,
  setLyricsText,
  useAudioSource,
} from "@/lib/lyrics-store";

/**
 * Owns the lyric lines for the sync page and mirrors every change back into
 * the shared editor text, so Editor <-> Synchronize round-trips keep stamps.
 */
export function Synchronizer({ initialText }: { initialText: string }) {
  const [lines, setLines] = useState<LyricLine[]>(() =>
    trimBlankEdges(parseLyrics(initialText)),
  );
  const audio = useAudioSource();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLyricsText(serializeLyrics(lines));
  }, [lines]);

  function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    event.target.value = "";
    if (!file) return;
    setAudioFile(file);
    toast.success(`Loaded ${file.name}`);
  }

  if (!lines.some((line) => line.text !== "")) {
    return (
      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-center justify-center px-4 py-16 text-center">
        <h1 className="text-xl font-semibold">Nothing to synchronize yet</h1>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          Paste your lyrics in the editor first, then come back here to stamp
          each line while the song plays.
        </p>
        <Button
          className="mt-6"
          nativeButton={false}
          render={<Link href="/" />}
        >
          Open the editor
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto flex h-[calc((100dvh-3.5rem)/2)] min-h-96 w-full max-w-5xl flex-col px-4 py-4 sm:py-6">
      <h1 className="sr-only">Synchronize lyrics to audio</h1>
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*"
        className="hidden"
        onChange={onFileChange}
      />
      <SyncSession
        key={audio?.url ?? "stopwatch"}
        lines={lines}
        onLinesChange={setLines}
        audio={audio}
        onPickAudio={() => fileInputRef.current?.click()}
        onEditor={() => router.push("/")}
      />
    </div>
  );
}
