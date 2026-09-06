"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AudioLines,
  Brackets,
  CaseLower,
  CaseSensitive,
  CaseUpper,
  Copy,
  Download,
  RotateCcw,
  Scissors,
} from "lucide-react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { downloadTextFile, stripExtension } from "@/lib/file";
import {
  buildLrcFile,
  changeCase,
  countSyncable,
  countSynced,
  parseLyrics,
  restoreOriginalCase,
  stripSections,
  stripTags,
  type TransformResult,
} from "@/lib/lrc";
import {
  setLyricsText,
  setOriginalCase,
  useAudioSource,
  useHydrated,
  useLyricsText,
  useOriginalCase,
} from "@/lib/lyrics-store";

const PLACEHOLDER = `Paste your lyrics here, for example straight from Genius:

[Verse 1]
I've been walking down this road
Looking for a place to call my own

[Chorus]
Take me home, take me home…`;

export function LyricsEditor() {
  const text = useLyricsText();
  const hydrated = useHydrated();
  const audio = useAudioSource();
  const original = useOriginalCase();
  const router = useRouter();
  const [resetOpen, setResetOpen] = useState(false);

  const stats = useMemo(() => {
    const lines = parseLyrics(text);
    return { lines: countSyncable(lines), synced: countSynced(lines) };
  }, [text]);
  const empty = text.trim() === "";

  /** The text with every case-changed line put back as it was written. */
  const restored = useMemo(
    () => (original === null ? null : restoreOriginalCase(text, original)),
    [original, text],
  );
  const canRestore = restored !== null && restored !== text;

  /** Snapshot the current casing before changing it, keeping any earlier original. */
  function rememberOriginal() {
    setOriginalCase(
      original === null ? text : restoreOriginalCase(text, original),
    );
  }

  function restoreCase() {
    if (restored === null) return;
    const before = text;
    setLyricsText(restored);
    toast.success("Restored the original casing", {
      action: { label: "Undo", onClick: () => setLyricsText(before) },
    });
  }

  function transform(
    run: (input: string) => TransformResult,
    describe: (count: number) => string,
    nothing: string,
  ) {
    const before = text;
    const result = run(before);
    if (result.text === before) {
      toast.info(nothing);
      return;
    }
    setLyricsText(result.text);
    toast.success(describe(result.count), {
      action: { label: "Undo", onClick: () => setLyricsText(before) },
    });
  }

  function reset() {
    const before = text;
    setLyricsText("");
    setResetOpen(false);
    toast("Editor cleared", {
      action: { label: "Undo", onClick: () => setLyricsText(before) },
    });
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copied to clipboard");
    } catch {
      toast.error("Couldn't copy. Select the text and copy it manually.");
    }
  }

  function download() {
    const base = stripExtension(audio?.name ?? "lyrics") || "lyrics";
    downloadTextFile(`${base}.lrc`, buildLrcFile(parseLyrics(text)));
    toast.success(`Saved ${base}.lrc`);
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:py-10">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Free online LRC generator
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Paste your lyrics, play the song and tap each line as it&apos;s
            sung. Download a synced .lrc file that works in any media player.
          </p>
        </div>
        <p className="text-sm text-muted-foreground tabular-nums">
          {stats.lines} {stats.lines === 1 ? "line" : "lines"}
          {stats.synced > 0 ? ` · ${stats.synced} synced` : ""}
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
        <div className="flex flex-wrap items-center gap-2 border-b bg-muted/40 p-3">
          <Button
            variant="outline"
            disabled={empty}
            onClick={() =>
              transform(
                stripSections,
                (count) =>
                  `Removed ${count} header ${count === 1 ? "line" : "lines"}`,
                "No section headers found",
              )
            }
          >
            <Scissors />
            Strip sections
          </Button>
          <Button
            variant="outline"
            disabled={empty}
            onClick={() =>
              transform(
                stripTags,
                (count) => `Removed ${count} ${count === 1 ? "tag" : "tags"}`,
                "No time tags found",
              )
            }
          >
            <Brackets />
            Strip tags
          </Button>
          <Button
            variant="outline"
            disabled={empty}
            onClick={() => {
              rememberOriginal();
              transform(
                (input) => changeCase(input, "lower"),
                () => "Converted to lowercase",
                "Already lowercase",
              );
            }}
          >
            <CaseLower />
            lowercase
          </Button>
          <Button
            variant="outline"
            disabled={empty}
            onClick={() => {
              rememberOriginal();
              transform(
                (input) => changeCase(input, "upper"),
                () => "Converted to uppercase",
                "Already uppercase",
              );
            }}
          >
            <CaseUpper />
            UPPERCASE
          </Button>
          <Button
            variant="outline"
            disabled={!canRestore}
            onClick={restoreCase}
            title="Put the casing back the way the lyrics were pasted"
          >
            <CaseSensitive />
            Original
          </Button>
          <Button
            variant="outline"
            disabled={empty}
            onClick={() => setResetOpen(true)}
            className="ml-auto"
          >
            <RotateCcw />
            Reset
          </Button>
        </div>

        <Textarea
          value={text}
          onChange={(event) => setLyricsText(event.target.value)}
          placeholder={PLACEHOLDER}
          spellCheck={false}
          disabled={!hydrated}
          aria-label="Lyrics"
          // Same height as the synchronizer panel: half the viewport below
          // the header (at least 24rem), minus that page's padding and hint.
          className="h-[calc(max((100dvh-3.5rem)/2,24rem)-3.75rem)] field-sizing-fixed sm:h-[calc(max((100dvh-3.5rem)/2,24rem)-4.75rem)] resize-none overflow-y-auto rounded-none border-0 px-5 py-4 text-base leading-relaxed shadow-none focus-visible:ring-0 disabled:bg-transparent md:text-base dark:bg-transparent dark:disabled:bg-transparent"
        />

        <div className="flex flex-wrap items-center justify-end gap-3 border-t bg-muted/40 p-3">
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" disabled={empty} onClick={copy}>
              <Copy />
              Copy
            </Button>
            <Button
              variant="outline"
              disabled={stats.synced === 0}
              onClick={download}
            >
              <Download />
              Download .lrc
            </Button>
            <Button
              size="lg"
              disabled={stats.lines === 0}
              onClick={() => router.push("/sync")}
              className="px-4"
            >
              <AudioLines />
              Synchronize
            </Button>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={resetOpen}
        onOpenChange={setResetOpen}
        title="Clear the editor?"
        description="All lyrics and any timestamps in the editor will be removed. You can undo this right after."
        confirmLabel="Clear"
        destructive
        onConfirm={reset}
      />
    </div>
  );
}
