"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  Check,
  ChevronRight,
  Download,
  FileAudio,
  Pause,
  PencilLine,
  Play,
  RotateCcw,
  TriangleAlert,
} from "lucide-react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/confirm-dialog";
import { LyricRow, type LineState } from "@/components/sync/lyric-row";
import { ToolbarButton } from "@/components/sync/toolbar-button";
import { Kbd } from "@/components/ui/kbd";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useClock, useClockTime, type Clock } from "@/hooks/use-clock";
import { usePersistedState } from "@/hooks/use-persisted-state";
import { beep } from "@/lib/beep";
import { downloadTextFile, stripExtension } from "@/lib/file";
import { buildLrcFile, formatClock, type LyricLine } from "@/lib/lrc";
import type { AudioSource } from "@/lib/lyrics-store";
import { cn } from "@/lib/utils";

/** How far playback rewinds before a line when that line is undone. */
export const REWIND_SECONDS = 2;

const ANTICIPATION_OPTIONS = [0, 0.25, 0.5, 0.75, 1, 1.5, 2, 3].map((s) => ({
  value: String(s),
  label: `${s}s`,
}));
const COUNTDOWN_OPTIONS = [0, 3, 5, 10].map((s) => ({
  value: String(s),
  label: `${s}s`,
}));

/** Green highlight for the button that finishes the job once every line is stamped. */
const READY_CLASS =
  "border-primary/60 bg-primary/20 text-primary hover:border-primary hover:bg-primary/30 hover:text-primary dark:border-primary/60 dark:bg-primary/20 dark:hover:border-primary dark:hover:bg-primary/30";

const SELECT_TRIGGER_CLASS =
  "min-h-10 w-[4.25rem] rounded-r-none border-neutral-300 bg-white text-neutral-900 hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 dark:hover:bg-neutral-700";

type Props = {
  lines: LyricLine[];
  onLinesChange: (next: LyricLine[]) => void;
  audio: AudioSource | null;
  onPickAudio: () => void;
  onEditor: () => void;
};

/**
 * One synchronization session bound to a single audio source. The parent
 * remounts it (via `key`) whenever the audio file changes so the clock and
 * countdown start fresh while the lyrics keep their stamps.
 */
export function SyncSession({
  lines,
  onLinesChange,
  audio,
  onPickAudio,
  onEditor,
}: Props) {
  const clock = useClock(audio?.url ?? null);
  const { isPlaying, now, play, pause, seek } = clock;
  const [anticipation, setAnticipation] = usePersistedState<number>(
    "lrc.notnick.io:anticipation",
    0,
  );
  const [countdownSeconds, setCountdownSeconds] = usePersistedState<number>(
    "lrc.notnick.io:countdown",
    0,
  );
  const [countdown, setCountdown] = useState<number | null>(null);
  const [resetOpen, setResetOpen] = useState(false);
  /** Index of the line whose text is being edited inline, if any. */
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  /** Indices of lines that actually get a timestamp (blank lines are skipped). */
  const syncable = useMemo(
    () => lines.flatMap((line, index) => (line.text ? [index] : [])),
    [lines],
  );
  const position = useMemo(() => {
    const map = new Map<number, number>();
    syncable.forEach((lineIndex, pos) => map.set(lineIndex, pos));
    return map;
  }, [syncable]);
  /** Number of leading syncable lines that already have a timestamp. */
  const cursor = useMemo(() => {
    let count = 0;
    while (count < syncable.length && lines[syncable[count]].time !== null) {
      count += 1;
    }
    return count;
  }, [lines, syncable]);

  const done = cursor >= syncable.length;
  const currentLine = cursor > 0 ? syncable[cursor - 1] : null;
  const hasProgress = cursor > 0;
  const started = hasProgress || clock.position > 0;
  const showDots = !isPlaying && countdown === null;

  // Keep the current line centred in the list without scrolling the page.
  useEffect(() => {
    const list = listRef.current;
    const row = list?.querySelector<HTMLElement>(
      `[data-line="${currentLine}"]`,
    );
    if (currentLine === null || !list || !row) return;
    const offset =
      row.getBoundingClientRect().top -
      list.getBoundingClientRect().top +
      list.scrollTop;
    const top = offset - list.clientHeight / 2 + row.offsetHeight / 2;
    list.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
  }, [currentLine]);

  /** Downloads the given lines as an .lrc file and returns the file name. */
  const saveLines = useCallback(
    (target: LyricLine[]) => {
      const base = stripExtension(audio?.name ?? "lyrics") || "lyrics";
      const filename = `${base}.lrc`;
      downloadTextFile(filename, buildLrcFile(target));
      return filename;
    },
    [audio?.name],
  );

  /** Stops the clock and hands over the file. */
  const finish = useCallback(() => {
    pause();
    const filename = saveLines(lines);
    toast.success(`All lines synchronized. Downloaded ${filename}.`);
  }, [lines, pause, saveLines]);

  /**
   * Stamps the current line. Once every line is stamped the same button reads
   * "Done", and that extra press is what downloads the file, so a mistimed
   * last line can still be undone before anything is saved.
   */
  const nextLine = useCallback(() => {
    if (done) {
      finish();
      return;
    }
    if (!isPlaying) return;
    const stamp = Math.max(0, now() - anticipation);
    const target = syncable[cursor];
    onLinesChange(
      lines.map((line, index) =>
        index === target ? { ...line, time: stamp } : line,
      ),
    );
  }, [
    anticipation,
    cursor,
    done,
    finish,
    isPlaying,
    lines,
    now,
    onLinesChange,
    syncable,
  ]);

  const undoFrom = useCallback(
    (lineIndex: number) => {
      const stamp = lines[lineIndex]?.time ?? null;
      onLinesChange(
        lines.map((line, index) =>
          index >= lineIndex ? { ...line, time: null } : line,
        ),
      );
      // Only real audio can rewind; music playing elsewhere cannot follow a
      // stopwatch seek, so leave the clock alone in that mode.
      if (stamp !== null && clock.usingAudio) {
        seek(Math.max(0, stamp - REWIND_SECONDS));
      }
    },
    [clock.usingAudio, lines, onLinesChange, seek],
  );

  const undoLast = useCallback(() => {
    if (currentLine !== null) undoFrom(currentLine);
  }, [currentLine, undoFrom]);

  /** Applies an inline edit. Blank text is treated as "leave it alone". */
  const commitEdit = useCallback(
    (index: number, raw: string) => {
      setEditingIndex(null);
      const text = raw.replace(/\s*[\r\n]+\s*/g, " ").trim();
      if (text === "" || text === lines[index]?.text) return;
      onLinesChange(
        lines.map((line, i) => (i === index ? { ...line, text } : line)),
      );
    },
    [lines, onLinesChange],
  );

  const togglePlayback = useCallback(() => {
    if (countdown !== null) {
      setCountdown(null);
      return;
    }
    if (isPlaying) {
      pause();
      return;
    }
    if (countdownSeconds > 0 && !started) {
      setCountdown(countdownSeconds);
      return;
    }
    void play();
  }, [countdown, countdownSeconds, isPlaying, pause, play, started]);

  // Countdown: beep once per second, then start playback.
  useEffect(() => {
    if (countdown === null) return;
    beep(countdown === 1 ? 1046 : 784, 0.09);
    const id = window.setTimeout(() => {
      if (countdown <= 1) {
        setCountdown(null);
        void play();
      } else {
        setCountdown(countdown - 1);
      }
    }, 1000);
    return () => window.clearTimeout(id);
  }, [countdown, play]);

  // Keyboard shortcuts.
  useEffect(() => {
    /** True when the key press belongs to a text field, menu or dialog. */
    const isTyping = (event: KeyboardEvent) => {
      const target = event.target instanceof Element ? event.target : null;
      if (
        target?.closest(
          "input, textarea, select, [contenteditable='true'], [role='listbox'], [role='dialog']",
        )
      ) {
        return true;
      }
      // A closed dropdown trigger still lets Enter / Space stamp lines, so
      // changing the anticipation mid-song does not break the flow. Arrow
      // keys stay with the dropdown so it can be opened from the keyboard.
      const combobox = target?.closest("[role='combobox']");
      if (combobox) {
        const open = combobox.getAttribute("aria-expanded") === "true";
        return open || event.key.startsWith("Arrow");
      }
      return false;
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) {
        return;
      }
      if (isTyping(event)) return;
      switch (event.key) {
        case "Enter":
        case " ":
        case "ArrowDown":
        case "ArrowRight":
          event.preventDefault();
          if (isPlaying) nextLine();
          else togglePlayback();
          return;
        case "Backspace":
        case "ArrowUp":
        case "ArrowLeft":
          event.preventDefault();
          undoLast();
          return;
        case "p":
        case "P":
          event.preventDefault();
          togglePlayback();
          return;
      }
    };
    // Buttons activate on Space *keyup*. Without this, a Space press after
    // clicking Next Line with the mouse would stamp twice.
    const onKeyUp = (event: KeyboardEvent) => {
      if (event.key === " " && !isTyping(event)) event.preventDefault();
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [isPlaying, nextLine, togglePlayback, undoLast]);

  function resetAll() {
    onLinesChange(lines.map((line) => ({ ...line, time: null })));
    setCountdown(null);
    pause();
    seek(0);
    setResetOpen(false);
    toast("Synchronization reset");
  }

  function save() {
    toast.success(`Saved ${saveLines(lines)}`);
  }

  function stateFor(index: number): LineState {
    const pos = position.get(index);
    if (pos === undefined) return "blank";
    if (pos >= cursor) return "upcoming";
    return pos === cursor - 1 ? "current" : "done";
  }

  let startContent: ReactNode;
  let startLabel: string;
  if (countdown !== null) {
    startContent = (
      <span className="text-lg font-bold text-primary tabular-nums">
        {countdown}
      </span>
    );
    startLabel = "Cancel countdown";
  } else if (isPlaying) {
    startContent = (
      <>
        <Pause />
        <ClockDisplay clock={clock} />
      </>
    );
    startLabel = "Pause";
  } else {
    startContent = (
      <>
        <Play />
        {started ? "Continue" : "START"}
      </>
    );
    startLabel = started ? "Continue" : "Start";
  }

  const status = [
    `${cursor} / ${syncable.length} lines`,
    audio
      ? clock.duration
        ? formatClock(clock.duration)
        : null
      : "stopwatch",
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {audio ? (
        <audio {...clock.audioProps} src={audio.url} preload="auto" />
      ) : null}

      <section
        aria-label="Synchronizer"
        className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl bg-gradient-to-b from-neutral-500 via-neutral-600 to-neutral-800 shadow-lg ring-1 ring-black/20 dark:from-neutral-800 dark:via-neutral-900 dark:to-neutral-950 dark:ring-white/10"
      >
        <div
          ref={listRef}
          className="min-h-0 flex-1 overflow-y-auto px-1 py-3 [scrollbar-color:rgba(255,255,255,0.35)_transparent] [scrollbar-width:thin] sm:px-2"
        >
          {clock.error ? (
            <p
              role="alert"
              className="mb-4 flex items-center gap-2 rounded-md bg-rose-500/20 px-3 py-2 text-sm text-rose-100 ring-1 ring-rose-400/40"
            >
              <TriangleAlert className="size-4 shrink-0" />
              {clock.error}
            </p>
          ) : null}
          <ol className="space-y-0.5">
            {lines.map((line, index) => (
              <LyricRow
                key={index}
                index={index}
                text={line.text}
                time={line.time}
                state={stateFor(index)}
                showDot={showDots}
                editable={showDots}
                editing={editingIndex === index}
                rewindSeconds={clock.usingAudio ? REWIND_SECONDS : 0}
                onUndo={() => undoFrom(index)}
                onEdit={() => setEditingIndex(index)}
                onCommit={(text) => commitEdit(index, text)}
                onCancel={() => setEditingIndex(null)}
              />
            ))}
          </ol>
        </div>

        <div
          aria-label="Playback controls"
          className="flex flex-wrap items-center gap-2 border-t border-white/10 bg-neutral-950/85 px-3 py-3"
        >
          <ToolbarButton
            onClick={() => {
              pause();
              onEditor();
            }}
          >
            <PencilLine />
            Editor
          </ToolbarButton>

          <ToolbarButton
            onClick={() => setResetOpen(true)}
            disabled={!started && !isPlaying && countdown === null}
          >
            <RotateCcw />
            Reset
          </ToolbarButton>

          <Tooltip>
            <TooltipTrigger
              render={<ToolbarButton onClick={onPickAudio} className="max-w-36" />}
            >
              <FileAudio />
              <span className="truncate">{audio ? audio.name : "Audio"}</span>
            </TooltipTrigger>
            <TooltipContent>
              {audio
                ? `${audio.name} · click to change`
                : "Load an audio file (MP3, M4A, OGG, WAV…)"}
            </TooltipContent>
          </Tooltip>

          <div className="flex items-stretch">
            <Select
              value={String(countdownSeconds)}
              onValueChange={(value) => {
                if (value !== null) setCountdownSeconds(Number(value));
              }}
              items={COUNTDOWN_OPTIONS}
            >
              <SelectTrigger
                aria-label="Countdown before playback starts"
                title="Countdown before playback starts"
                className={SELECT_TRIGGER_CLASS}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {COUNTDOWN_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <ToolbarButton
              onClick={togglePlayback}
              disabled={audio !== null && !clock.ready}
              aria-label={startLabel}
              className="min-w-28 rounded-l-none border-l-0"
            >
              {startContent}
            </ToolbarButton>
          </div>

          <div className="flex items-stretch">
            <Select
              value={String(anticipation)}
              onValueChange={(value) => {
                if (value !== null) setAnticipation(Number(value));
              }}
              items={ANTICIPATION_OPTIONS}
            >
              <SelectTrigger
                aria-label="Anticipation subtracted from each timestamp"
                title="Anticipation: each stamp is moved this much earlier"
                className={SELECT_TRIGGER_CLASS}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ANTICIPATION_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <ToolbarButton
              onClick={nextLine}
              disabled={!done && !isPlaying}
              title={done ? "Download the .lrc" : undefined}
              className={cn(
                "min-w-28 rounded-l-none border-l-0",
                done && READY_CLASS,
              )}
            >
              {done ? (
                <>
                  <Check />
                  Done
                </>
              ) : (
                <>
                  <ChevronRight />
                  Next Line
                </>
              )}
            </ToolbarButton>
          </div>

          <div className="ml-auto flex items-center gap-3">
            <span className="hidden text-xs text-neutral-400 tabular-nums lg:inline">
              {status}
            </span>
            <ToolbarButton
              onClick={save}
              disabled={!hasProgress}
              aria-label="Save .lrc"
              title="Save .lrc"
              className={cn(done && READY_CLASS)}
            >
              <Download />
              <span className="hidden lg:inline">Save .lrc</span>
            </ToolbarButton>
          </div>
        </div>
      </section>

      <p className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span>
          <Kbd>Enter</Kbd> / <Kbd>Space</Kbd> next line
        </span>
        <span>
          <Kbd>Backspace</Kbd> undo last line
        </span>
        <span>
          <Kbd>P</Kbd> play / pause
        </span>
      </p>

      <ConfirmDialog
        open={resetOpen}
        onOpenChange={setResetOpen}
        title="Reset synchronization?"
        description="Every timestamp will be cleared and playback returns to the start. Your lyrics stay as they are."
        confirmLabel="Reset"
        destructive
        onConfirm={resetAll}
      />
    </div>
  );
}

/** Running clock shown inside the START button while playing. */
function ClockDisplay({ clock }: { clock: Clock }) {
  const time = useClockTime(clock);
  return (
    <span className="font-mono text-primary tabular-nums">
      {formatClock(time)}
    </span>
  );
}
