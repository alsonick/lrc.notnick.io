"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  ChevronsDown,
  ChevronsUp,
  Code,
  Copy,
  Download,
  RotateCcw,
  Scissors,
  Tag,
  Type,
} from "react-feather";
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
  stripParentheses,
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
import { reportDownload } from "@/lib/report-download";

/**
 * Original lines laid out like a Genius copy-paste: credited section headers,
 * asides in parentheses and the odd missing blank line, all of which the
 * toolbar cleans up.
 */
const PLACEHOLDER = `[Intro: Mara Vale & Theo Lane]
(Ooh, ooh)

[Verse 1: Theo Lane]
I left the porch light on for you
Just in case the night ran long
Counted every passing car
Humming half of our old song

[Pre-Chorus: Theo Lane]
Wherever the road goes, I'll be driving
Headlights on and still believing
So I'll keep the engine running every night
Every night

[Chorus: Theo Lane]
If the stars stopped shining
I'd still find my way to you
If the map went blank
And every road we knew fell through
I'd follow your voice through the dark
Like a spark
If the stars stopped shining
I'd still find my way to you

[Post-Chorus: Mara Vale & Theo Lane]
(Ooh, ooh)
[Verse 2: Mara Vale, Mara Vale & Theo Lane]
Oh, we wrote our names on the station wall
Back when the trains still ran on time
Every word you said, I kept them all
Folded in a pocket next to mine

[Pre-Chorus: Mara Vale & Theo Lane]
Wherever the road goes, I'll be driving
Headlights on and still believing
So I'll keep the engine running every night
Every night

[Chorus: Mara Vale & Theo Lane, Mara Vale]
If the stars stopped shining
I'd still find my way to you
If the map went blank
And every road we knew fell through
I'd follow your voice through the dark
Like a spark
If the stars stopped shining
I'd still find my way to you

[Bridge: Theo Lane, Mara Vale, Both]
Find my way to you
Way to you
Find my way to you
Oh-oh
[Chorus: Mara Vale, Mara Vale & Theo Lane, Theo Lane]
If the stars stopped shining
I'd still find my way to you
If the map went blank
And every road we knew fell through
I'd follow your voice through the dark
Like a spark
If the stars stopped shining
I'd still find my way to you
If the stars stopped shining
I'd still find my way to you

[Outro: Mara Vale & Theo Lane]
(Ooh, ooh)
I'd still find my way to you`;

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
    reportDownload({
      format: "lrc",
      filename: `${base}.lrc`,
      lines: stats.lines,
      source: "editor",
      audio,
    });
    toast.success(`Saved ${base}.lrc`);
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:py-10">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Free Online LRC Generator
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            A browser-based LRC generator for synced lyrics.
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
            <Tag />
            Strip tags
          </Button>
          <Button
            variant="outline"
            disabled={empty}
            onClick={() =>
              transform(
                stripParentheses,
                (count) =>
                  `Removed ${count} ${count === 1 ? "parenthesis" : "parentheses"}`,
                "No parentheses found",
              )
            }
            title="Remove asides in parentheses, like (Let's go)"
          >
            <Code />
            Strip ()
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
            <ChevronsDown />
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
            <ChevronsUp />
            UPPERCASE
          </Button>
          <Button
            variant="outline"
            disabled={!canRestore}
            onClick={restoreCase}
            title="Put the casing back the way the lyrics were pasted"
          >
            <Type />
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
          className="h-[calc(max((100dvh-3.5rem)/2,24rem)-3.75rem)] field-sizing-fixed sm:h-[calc(max((100dvh-3.5rem)/2,24rem)-4.75rem)] resize-none overflow-y-auto rounded-none border-0 px-5 py-4 text-base leading-relaxed shadow-none placeholder:text-muted-foreground/50 focus-visible:ring-0 disabled:bg-transparent md:text-base dark:bg-transparent dark:disabled:bg-transparent"
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
              disabled={stats.lines === 0}
              onClick={() => router.push("/sync")}
            >
              <Activity />
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
