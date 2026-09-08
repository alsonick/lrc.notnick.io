"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";

import { formatTime } from "@/lib/lrc";
import { cn } from "@/lib/utils";

export type LineState = "blank" | "upcoming" | "done" | "current";

type Props = {
  index: number;
  text: string;
  time: number | null;
  state: LineState;
  /** Show the undo dot in front of stamped lines (only while paused). */
  showDot: boolean;
  /** Let the text be clicked to edit it (only while paused). */
  editable: boolean;
  /** This line is currently being edited. */
  editing: boolean;
  rewindSeconds: number;
  onUndo: () => void;
  onEdit: () => void;
  onCommit: (text: string) => void;
  onCancel: () => void;
};

export function LyricRow({
  index,
  text,
  time,
  state,
  showDot,
  editable,
  editing,
  rewindSeconds,
  onUndo,
  onEdit,
  onCommit,
  onCancel,
}: Props) {
  if (state === "blank") return <li aria-hidden className="h-3" />;

  const stamped = state === "done" || state === "current";

  return (
    <li
      data-line={index}
      className={cn(
        "flex items-center gap-2 rounded-md px-2 py-1 text-lg font-semibold leading-snug transition-colors sm:text-xl",
        state === "upcoming" && "text-neutral-400",
        state === "done" && "text-white/85",
        state === "current" && "bg-primary/15 text-white",
      )}
    >
      <span className="flex w-5 shrink-0 items-center justify-center">
        {showDot && stamped ? (
          <button
            type="button"
            onClick={onUndo}
            aria-label={`Undo from "${text}"`}
            title={
              rewindSeconds > 0
                ? `Undo from here and rewind ${rewindSeconds}s before this line`
                : "Undo this line and everything after it"
            }
            className="group/dot flex size-6 items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-white/60"
          >
            <span
              aria-hidden
              className="size-2.5 rounded-full bg-primary shadow-sm transition-all group-hover/dot:scale-150 group-hover/dot:bg-rose-400"
            />
          </button>
        ) : null}
      </span>
      {editing ? (
        <LineEditor initial={text} onCommit={onCommit} onCancel={onCancel} />
      ) : editable ? (
        <button
          type="button"
          onClick={onEdit}
          aria-label={`Edit "${text}"`}
          className="-mx-1 min-w-0 flex-1 cursor-text rounded px-1 text-left break-words outline-none transition-colors hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-white/60"
        >
          {text}
        </button>
      ) : (
        <span className="min-w-0 flex-1 break-words">{text}</span>
      )}
      {stamped && time !== null ? (
        <span className="shrink-0 font-mono text-xs font-normal text-white/40 tabular-nums">
          {formatTime(time)}
        </span>
      ) : null}
    </li>
  );
}

/**
 * Inline textarea that stands in for a line's text while it is edited.
 * Blur or Enter commits, Escape cancels. Clicking anything else on the page
 * (another line, Continue, Editor…) blurs first, so the edit is never lost.
 */
function LineEditor({
  initial,
  onCommit,
  onCancel,
}: {
  initial: string;
  onCommit: (text: string) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState(initial);
  const ref = useRef<HTMLTextAreaElement>(null);
  const finished = useRef(false);

  /** Runs once: the blur caused by unmounting must not commit a second time. */
  function finish(commit: boolean) {
    if (finished.current) return;
    finished.current = true;
    if (commit) onCommit(draft);
    else onCancel();
  }

  // Grow with the text instead of scrolling inside the row.
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    element.style.height = "0px";
    element.style.height = `${element.scrollHeight}px`;
  }, [draft]);

  // Focus with the caret at the end, ready to fix or extend the line.
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    element.focus();
    element.setSelectionRange(element.value.length, element.value.length);
  }, []);

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      finish(true);
    } else if (event.key === "Escape") {
      event.preventDefault();
      finish(false);
    }
  }

  return (
    <textarea
      ref={ref}
      value={draft}
      rows={1}
      spellCheck={false}
      enterKeyHint="done"
      aria-label="Edit line"
      onChange={(event) => setDraft(event.target.value)}
      onKeyDown={onKeyDown}
      onBlur={() => finish(true)}
      className="-mx-1 min-w-0 flex-1 resize-none overflow-hidden rounded bg-white/10 px-1 py-0 text-white ring-1 ring-white/30 outline-none focus:ring-primary/70"
    />
  );
}
