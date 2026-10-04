"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
  type ReactNode,
  type RefObject,
} from "react";
import {
  AlertTriangle,
  Check,
  CheckCircle,
  Download,
  Edit,
  FileText,
  Film,
  Info,
  Plus,
  RotateCcw,
} from "react-feather";

import { ConfirmDialog } from "@/components/confirm-dialog";
import {
  CodeEditor,
  type CodeEditorHandle,
} from "@/components/export/code-editor";
import { lrcSyntax, srtSyntax } from "@/components/export/syntax";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { downloadTextFile } from "@/lib/file";
import {
  buildLrcFileFromText,
  findLrcIssues,
  formatClock,
  type LrcIssue,
} from "@/lib/lrc";
import {
  addSrtCue,
  buildSrtFile,
  LAST_CUE_SECONDS,
  lrcToSrtCues,
  parseSrt,
  type SrtIssue,
} from "@/lib/srt";

type Format = "lrc" | "srt";

/** How long a download button shows its check mark. */
const SAVED_MS = 2000;

const SRT_PLACEHOLDER = `1
00:00:12,400 --> 00:00:15,920
Each subtitle is a time range and its text`;

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The LRC text to edit, read each time the panel opens. */
  text: string;
  /** File name without its extension. */
  fileBase: string;
  /** Length of the song in seconds, if known, so the last subtitle ends in time. */
  duration: number | null;
  /** Receives the edited text as the panel closes, for edits that outlive it. */
  onApply?: (text: string) => void;
  /** Where focus goes when the panel closes. */
  finalFocus?: RefObject<HTMLElement | null>;
};

/** A line the footer has something to say about. */
type StatusIssue = { line: number; message: string };

function describeLrcIssue(issue: LrcIssue, following: boolean): string {
  const line = `Line ${issue.line + 1}`;
  if (issue.kind === "order") return `${line} starts before the line above it.`;
  return following
    ? `${line} has no timestamp, so the SRT leaves it out.`
    : `${line} has no timestamp, so players skip it.`;
}

function describeSrtIssue(issue: SrtIssue): string {
  const line = `Line ${issue.line + 1}`;
  switch (issue.kind) {
    case "timing":
      return `${line} isn't a time range like 00:00:12,400 --> 00:00:15,920, so its subtitle is left out.`;
    case "range":
      return `${line} ends before it starts, so its subtitle is left out.`;
    case "empty":
      return `${line} has no text under it, so it's left out.`;
    case "stray":
      return `${line} has no time range above it, so it's left out.`;
    case "order":
      return `${line} starts before the subtitle above it.`;
  }
}

/**
 * The panel Done opens on the right: an LRC file and the SRT it converts to,
 * both as editable text. The subtitles follow the LRC until they are edited
 * by hand; from then on they are their own text, until Revert rebuilds them.
 */
export function ExportPanel({
  open,
  onOpenChange,
  text,
  fileBase,
  duration,
  onApply,
  finalFocus,
}: Props) {
  const lrcRef = useRef<CodeEditorHandle>(null);
  const srtRef = useRef<CodeEditorHandle>(null);
  /** The file as it was when the panel opened. */
  const [original, setOriginal] = useState("");
  const [draft, setDraft] = useState("");
  /** The subtitles once edited by hand; null while they follow the LRC. */
  const [srtDraft, setSrtDraft] = useState<string | null>(null);
  /** The hand-edited subtitles as last downloaded, to know what's unsaved. */
  const [savedSrt, setSavedSrt] = useState<string | null>(null);
  /** The editor being worked in, which the footer reports on. */
  const [side, setSide] = useState<Format>("lrc");
  const [lrcLine, setLrcLine] = useState(0);
  const [srtLine, setSrtLine] = useState(0);
  /** The format just downloaded, whose button shows a check for a moment. */
  const [saved, setSaved] = useState<Format | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const [confirmClose, setConfirmClose] = useState(false);

  // Each opening starts from `text` as it is then. The drafts outlive the
  // close so the panel keeps showing them while it slides away.
  const [wasOpen, setWasOpen] = useState(false);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setOriginal(text);
      setDraft(text);
      setSrtDraft(null);
      setSavedSrt(null);
      setSide("lrc");
      setLrcLine(0);
      setSrtLine(0);
      setSaved(null);
      setAnnouncement("");
      setConfirmClose(false);
    }
  }

  const lrcIssues = useMemo(() => findLrcIssues(draft), [draft]);
  const lrcIssueByLine = useMemo(
    () => new Map(lrcIssues.map((issue) => [issue.line, issue.kind])),
    [lrcIssues],
  );
  const derivedCues = useMemo(
    () => lrcToSrtCues(draft, duration),
    [draft, duration],
  );
  // Without the file's closing line break, which would show as an empty line.
  const derivedSrt = useMemo(
    () => buildSrtFile(derivedCues).trimEnd(),
    [derivedCues],
  );
  const following = srtDraft === null;
  const srtText = srtDraft ?? derivedSrt;
  const srt = useMemo(() => parseSrt(srtText), [srtText]);
  const srtIssueByLine = useMemo(
    () => new Map(srt.issues.map((issue) => [issue.line, issue.kind])),
    [srt],
  );
  const edited = draft !== original;
  const srtUnsaved = srtDraft !== null && srtDraft !== savedSrt;

  // While the subtitles follow the LRC, each of its lines makes one block, in
  // order, so the caret on one side points at a spot on the other.
  let lrcLinked: { from: number; to: number } | null = null;
  let srtLinked: { from: number; to: number } | null = null;
  if (following && side === "srt") {
    const at = srt.cues.findIndex(
      (cue) => srtLine >= cue.from && srtLine <= cue.to,
    );
    const source = derivedCues[at];
    if (source) lrcLinked = { from: source.line, to: source.line };
  } else if (following) {
    const block = srt.cues[derivedCues.findIndex((cue) => cue.line === lrcLine)];
    if (block) srtLinked = { from: block.from, to: block.to };
  }

  const status: StatusIssue[] =
    side === "lrc"
      ? lrcIssues.map((issue) => ({
          line: issue.line,
          message: describeLrcIssue(issue, following),
        }))
      : srt.issues.map((issue) => ({
          line: issue.line,
          message: describeSrtIssue(issue),
        }));
  let allClear: string | null = null;
  if (side === "lrc" && derivedCues.length > 0) {
    allClear = "Every line has a timestamp.";
  } else if (side === "srt" && srt.cues.length > 0) {
    allClear = "Every subtitle has a time range and text.";
  }

  useEffect(() => {
    if (saved === null) return;
    const id = window.setTimeout(() => setSaved(null), SAVED_MS);
    return () => window.clearTimeout(id);
  }, [saved]);

  function close() {
    if (edited) onApply?.(draft);
    onOpenChange(false);
  }

  function handleOpenChange(next: boolean) {
    if (next || !open) {
      onOpenChange(next);
    } else if (srtUnsaved) {
      // Hand edits to the subtitles live nowhere else, so ask first.
      setConfirmClose(true);
    } else {
      close();
    }
  }

  function download(format: Format) {
    const filename = `${fileBase}.${format}`;
    if (format === "lrc") {
      downloadTextFile(filename, buildLrcFileFromText(draft));
    } else {
      // Rebuilt from the blocks that read cleanly, numbered afresh.
      downloadTextFile(
        filename,
        buildSrtFile(srt.cues),
        "application/x-subrip;charset=utf-8",
      );
      setSavedSrt(srtDraft);
    }
    setSaved(format);
    setAnnouncement(`Downloaded ${filename}`);
  }

  /** Typing the subtitles back to what the LRC gives picks the link up again. */
  function changeSrt(next: string) {
    setSrtDraft(next === derivedSrt ? null : next);
  }

  function revertLrc() {
    if (lrcRef.current) lrcRef.current.replaceText(original);
    else setDraft(original);
  }

  function revertSrt() {
    if (srtRef.current) srtRef.current.replaceText(derivedSrt);
    else setSrtDraft(null);
  }

  /** A new subtitle after the one being worked on, or at the very end. */
  function addCue() {
    const after =
      side === "srt" ? srtLine : (srtLinked?.to ?? Number.MAX_SAFE_INTEGER);
    const next = addSrtCue(srtText, after);
    if (srtRef.current) srtRef.current.replaceText(next.text, next.line);
    else changeSrt(next.text);
  }

  function reveal(line: number) {
    (side === "lrc" ? lrcRef : srtRef).current?.revealLine(line);
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent
        initialFocus={() => lrcRef.current?.textarea ?? true}
        finalFocus={finalFocus}
        className="w-[calc(100vw-5rem)] sm:max-w-384"
      >
        <div className="flex shrink-0 items-center gap-3 border-b bg-muted/40 py-4 pr-14 pl-5">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <Edit className="size-5" />
          </span>
          {/* Two tight lines, about as tall as the icon beside them. */}
          <div className="min-w-0 space-y-0.5">
            <SheetTitle className="text-lg leading-6 font-semibold">
              Edit
            </SheetTitle>
            <SheetDescription>
              Fix any line or timestamp, then download it as .lrc or as .srt.
            </SheetDescription>
          </div>
        </div>

        <div className="grid min-h-0 flex-1 grid-rows-[minmax(0,3fr)_minmax(0,2fr)] lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:grid-rows-1">
          <section
            aria-label="LRC file"
            className="flex min-h-0 flex-col border-b lg:border-r lg:border-b-0"
          >
            <PaneHeader icon={FileText} name={`${fileBase}.lrc`}>
              {edited ? (
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span aria-hidden className="size-1.5 rounded-full bg-primary" />
                  Edited
                </span>
              ) : null}
              <Button
                variant="ghost"
                size="sm"
                disabled={!edited}
                onClick={revertLrc}
                title="Undo every edit made since this panel opened"
              >
                <RotateCcw />
                Revert
              </Button>
            </PaneHeader>
            <CodeEditor
              ref={lrcRef}
              value={draft}
              onChange={setDraft}
              tokenize={lrcSyntax}
              issues={lrcIssueByLine}
              activeLine={side === "lrc" ? lrcLine : -1}
              onActiveLineChange={setLrcLine}
              linked={lrcLinked}
              onFocus={() => setSide("lrc")}
              placeholder="[00:12.34]Every line starts with its timestamp"
              aria-label={`${fileBase}.lrc`}
            />
          </section>

          <section
            aria-label="SRT file"
            className="flex min-h-0 flex-col bg-muted/30 dark:bg-black/10"
          >
            <PaneHeader icon={Film} name={`${fileBase}.srt`}>
              <Button
                variant="ghost"
                size="sm"
                disabled={following}
                onClick={revertSrt}
                title="Rebuild the subtitles from the .lrc, dropping the edits made here"
              >
                <RotateCcw />
                Revert
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={addCue}
                title="Add a subtitle after this one. With no gap before the next, the two share this one's time."
              >
                <Plus />
                Add
              </Button>
              <span className="hidden text-xs text-muted-foreground tabular-nums xl:inline">
                {srt.cues.length}{" "}
                {srt.cues.length === 1 ? "subtitle" : "subtitles"}
              </span>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      aria-label="How subtitles are timed"
                    />
                  }
                >
                  <Info />
                </TooltipTrigger>
                <TooltipContent side="bottom" align="end" className="max-w-72">
                  <p className="leading-relaxed">
                    Each subtitle stays up until the next line starts. A
                    timestamp on its own line, like [01:02.00], ends the one
                    before it early.{" "}
                    {duration === null
                      ? `The last one lasts ${LAST_CUE_SECONDS} seconds, since the song's length isn't known.`
                      : `The last one stays up until the song ends, at ${formatClock(duration)}.`}{" "}
                    Edit the subtitles here and they stop following the .lrc
                    until you revert.
                  </p>
                </TooltipContent>
              </Tooltip>
            </PaneHeader>
            <CodeEditor
              ref={srtRef}
              value={srtText}
              onChange={changeSrt}
              tokenize={srtSyntax}
              kinds={srt.kinds}
              issues={srtIssueByLine}
              activeLine={side === "srt" ? srtLine : -1}
              onActiveLineChange={setSrtLine}
              linked={srtLinked}
              onFocus={() => setSide("srt")}
              placeholder={SRT_PLACEHOLDER}
              aria-label={`${fileBase}.srt`}
            />
            {/* Below the text, so appearing mid-edit doesn't push it down. */}
            {following ? null : (
              <p className="shrink-0 border-t bg-amber-500/10 px-4 py-2 text-xs text-amber-800 dark:text-amber-300">
                Edited by hand, so changes to the .lrc no longer reach these
                subtitles. Revert rebuilds them from it.
              </p>
            )}
          </section>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-2 border-t bg-muted/40 px-5 py-3">
          <FileStatus
            issues={status}
            activeLine={side === "lrc" ? lrcLine : srtLine}
            allClear={allClear}
            onReveal={reveal}
          />
          <div className="ml-auto flex items-center gap-2">
            <Button
              variant="outline"
              size="lg"
              disabled={draft.trim() === ""}
              onClick={() => download("lrc")}
            >
              {saved === "lrc" ? <Check /> : <Download />}
              Download as LRC
            </Button>
            <Button
              size="lg"
              disabled={srt.cues.length === 0}
              onClick={() => download("srt")}
            >
              {saved === "srt" ? <Check /> : <Download />}
              Download as SRT
            </Button>
          </div>
          <p role="status" className="sr-only">
            {announcement}
          </p>
        </div>

        <ConfirmDialog
          open={confirmClose}
          onOpenChange={setConfirmClose}
          title="Close without downloading the .srt?"
          description="The edits you made to the subtitles only exist in this panel. Download the .srt first to keep them."
          confirmLabel="Close anyway"
          destructive
          onConfirm={() => {
            setConfirmClose(false);
            close();
          }}
        />
      </SheetContent>
    </Sheet>
  );
}

function PaneHeader({
  icon: Icon,
  name,
  children,
}: {
  icon: ComponentType<{ className?: string }>;
  name: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex h-11 shrink-0 items-center gap-2 border-b px-4">
      <Icon className="size-4 shrink-0 text-muted-foreground" />
      <span className="min-w-0 truncate font-mono text-xs font-medium" title={name}>
        {name}
      </span>
      <div className="ml-auto flex shrink-0 items-center gap-2">{children}</div>
    </div>
  );
}

/**
 * The footer's word on the file being worked in: the problem on the caret's
 * line, how many lines need a look (with a button that walks through them),
 * or all clear.
 */
function FileStatus({
  issues,
  activeLine,
  allClear,
  onReveal,
}: {
  issues: StatusIssue[];
  activeLine: number;
  /** What to say when nothing is wrong; null to say nothing. */
  allClear: string | null;
  onReveal: (line: number) => void;
}) {
  if (issues.length === 0) {
    if (allClear === null) return null;
    return (
      <p className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
        <CheckCircle className="size-4 shrink-0 text-primary" />
        {allClear}
      </p>
    );
  }
  const current = issues.find((issue) => issue.line === activeLine);
  const next =
    issues.find((issue) => issue.line > activeLine) ??
    issues.find((issue) => issue !== current);
  const count = issues.length;
  return (
    <p className="flex min-w-0 items-center gap-2 text-sm text-amber-700 dark:text-amber-400">
      <AlertTriangle className="size-4 shrink-0" />
      {/* No ligatures: the font would draw the "-->" in a message as an arrow. */}
      <span className="min-w-0 truncate [font-variant-ligatures:none]">
        {current
          ? current.message
          : `${count} ${count === 1 ? "line needs" : "lines need"} a look`}
      </span>
      {next ? (
        <button
          type="button"
          onClick={() => onReveal(next.line)}
          className="shrink-0 rounded-sm font-medium underline underline-offset-4 outline-none hover:text-amber-900 focus-visible:ring-2 focus-visible:ring-ring/50 dark:hover:text-amber-300"
        >
          {current ? "Next" : "Show"}
        </button>
      ) : null}
    </p>
  );
}
