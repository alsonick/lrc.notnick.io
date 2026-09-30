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
  RotateCcw,
} from "react-feather";

import {
  LrcCodeEditor,
  type LrcCodeEditorHandle,
} from "@/components/export/lrc-code-editor";
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
  type LrcIssue,
} from "@/lib/lrc";
import {
  buildSrtFile,
  formatSrtTime,
  LAST_CUE_SECONDS,
  lrcToSrtCues,
  type SrtCue,
} from "@/lib/srt";
import { cn } from "@/lib/utils";

type Format = "lrc" | "srt";

/** How long a download button shows its check mark. */
const SAVED_MS = 2000;

/** Green for times, darker in light mode so it stays readable on white. */
const TIME_CLASS = "text-green-700 dark:text-primary";

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

/**
 * The panel Done opens on the right: an LRC file as editable text beside a
 * live preview of the SRT it converts to.
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
  const editorRef = useRef<LrcCodeEditorHandle>(null);
  /** The file as it was when the panel opened. */
  const [original, setOriginal] = useState("");
  const [draft, setDraft] = useState("");
  const [activeLine, setActiveLine] = useState(0);
  /** The format just downloaded, whose button shows a check for a moment. */
  const [saved, setSaved] = useState<Format | null>(null);
  const [announcement, setAnnouncement] = useState("");

  // Each opening starts from `text` as it is then. The draft outlives the
  // close so the panel keeps showing it while it slides away.
  const [wasOpen, setWasOpen] = useState(false);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setOriginal(text);
      setDraft(text);
      setActiveLine(0);
      setSaved(null);
      setAnnouncement("");
    }
  }

  const issues = useMemo(() => findLrcIssues(draft), [draft]);
  const issueByLine = useMemo(
    () => new Map(issues.map((issue) => [issue.line, issue.kind])),
    [issues],
  );
  const cues = useMemo(() => lrcToSrtCues(draft, duration), [draft, duration]);
  const edited = draft !== original;

  useEffect(() => {
    if (saved === null) return;
    const id = window.setTimeout(() => setSaved(null), SAVED_MS);
    return () => window.clearTimeout(id);
  }, [saved]);

  function handleOpenChange(next: boolean) {
    if (open && !next && edited) onApply?.(draft);
    onOpenChange(next);
  }

  function download(format: Format) {
    const filename = `${fileBase}.${format}`;
    if (format === "lrc") {
      downloadTextFile(filename, buildLrcFileFromText(draft));
    } else {
      downloadTextFile(
        filename,
        buildSrtFile(cues),
        "application/x-subrip;charset=utf-8",
      );
    }
    setSaved(format);
    setAnnouncement(`Downloaded ${filename}`);
  }

  function revert() {
    if (editorRef.current) editorRef.current.replaceText(original);
    else setDraft(original);
  }

  function reveal(line: number) {
    editorRef.current?.revealLine(line);
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent
        initialFocus={() => editorRef.current?.textarea ?? true}
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
              Edit &amp; convert
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
                onClick={revert}
                title="Undo every edit made since this panel opened"
              >
                <RotateCcw />
                Revert
              </Button>
            </PaneHeader>
            <LrcCodeEditor
              ref={editorRef}
              value={draft}
              onChange={setDraft}
              issues={issueByLine}
              activeLine={activeLine}
              onActiveLineChange={setActiveLine}
              placeholder="[00:12.34]Every line starts with its timestamp"
              aria-label={`${fileBase}.lrc`}
            />
          </section>

          <section
            aria-label="SRT preview"
            className="flex min-h-0 flex-col bg-muted/30 dark:bg-black/10"
          >
            <PaneHeader icon={Film} name={`${fileBase}.srt`}>
              <span className="text-xs text-muted-foreground tabular-nums">
                {cues.length} {cues.length === 1 ? "subtitle" : "subtitles"}
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
                    before it early. The last one lasts up to{" "}
                    {LAST_CUE_SECONDS} seconds.
                  </p>
                </TooltipContent>
              </Tooltip>
            </PaneHeader>
            <SrtPreview cues={cues} activeLine={activeLine} onSelect={reveal} />
          </section>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-2 border-t bg-muted/40 px-5 py-3">
          <FileStatus
            issues={issues}
            activeLine={activeLine}
            ready={cues.length > 0}
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
              disabled={cues.length === 0}
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

function describeIssue(issue: LrcIssue): string {
  const line = `Line ${issue.line + 1}`;
  return issue.kind === "untimed"
    ? `${line} has no timestamp, so the SRT leaves it out.`
    : `${line} starts before the line above it.`;
}

/**
 * The footer's word on the file: the problem on the caret's line, how many
 * lines need a look (with a button that walks through them), or all clear.
 */
function FileStatus({
  issues,
  activeLine,
  ready,
  onReveal,
}: {
  issues: LrcIssue[];
  activeLine: number;
  ready: boolean;
  onReveal: (line: number) => void;
}) {
  if (issues.length === 0) {
    if (!ready) return null;
    return (
      <p className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
        <CheckCircle className="size-4 shrink-0 text-primary" />
        Every line has a timestamp.
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
      <span className="min-w-0 truncate">
        {current
          ? describeIssue(current)
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

/**
 * The subtitles the file converts to. The cue for the caret's line is
 * highlighted and kept in view; clicking a cue jumps to its line.
 */
function SrtPreview({
  cues,
  activeLine,
  onSelect,
}: {
  cues: SrtCue[];
  activeLine: number;
  onSelect: (line: number) => void;
}) {
  const listRef = useRef<HTMLDivElement>(null);

  // Scroll the list itself; scrollIntoView could move the page behind too.
  useEffect(() => {
    const list = listRef.current;
    const cue = list?.querySelector<HTMLElement>(`[data-line="${activeLine}"]`);
    if (!list || !cue) return;
    const top =
      cue.getBoundingClientRect().top -
      list.getBoundingClientRect().top +
      list.scrollTop;
    const bottom = top + cue.offsetHeight;
    if (top >= list.scrollTop && bottom <= list.scrollTop + list.clientHeight) {
      return;
    }
    const centred = top - list.clientHeight / 2 + cue.offsetHeight / 2;
    list.scrollTo({ top: Math.max(0, centred), behavior: "smooth" });
  }, [activeLine]);

  if (cues.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
        <span className="flex size-10 items-center justify-center rounded-xl bg-muted text-muted-foreground">
          <Film className="size-5" />
        </span>
        <p className="max-w-64 text-sm text-muted-foreground">
          No subtitles yet. Start a line with a timestamp like{" "}
          <code className="font-mono text-xs text-foreground">[00:12.34]</code>{" "}
          to add one.
        </p>
      </div>
    );
  }

  return (
    <div
      ref={listRef}
      className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-2 scrollbar-thin"
    >
      <ol className="space-y-0.5">
        {cues.map((cue, index) => (
          <li key={index} data-line={cue.line}>
            {/* Mouse shortcut only: the editor is where keyboard users move. */}
            <button
              type="button"
              tabIndex={-1}
              onClick={() => onSelect(cue.line)}
              className={cn(
                "grid w-full grid-cols-[2.25rem_minmax(0,1fr)] gap-x-2 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-foreground/5",
                cue.line === activeLine &&
                  "bg-primary/10 ring-1 ring-primary/25 ring-inset hover:bg-primary/10",
              )}
            >
              <span className="row-span-2 text-right font-mono text-xs leading-5 text-muted-foreground tabular-nums">
                {index + 1}
              </span>
              <span className="font-mono text-xs leading-5 tabular-nums">
                <span className={TIME_CLASS}>{formatSrtTime(cue.start)}</span>
                <span className="text-muted-foreground">{" --> "}</span>
                <span className={TIME_CLASS}>{formatSrtTime(cue.end)}</span>
              </span>
              <span className="text-sm leading-6 wrap-break-word">
                {cue.text}
              </span>
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
}
