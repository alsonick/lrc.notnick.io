"use client";

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
  rewindSeconds: number;
  onUndo: () => void;
};

export function LyricRow({
  index,
  text,
  time,
  state,
  showDot,
  rewindSeconds,
  onUndo,
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
      <span className="min-w-0 flex-1 break-words">{text}</span>
      {stamped && time !== null ? (
        <span className="shrink-0 font-mono text-xs font-normal text-white/40 tabular-nums">
          {formatTime(time)}
        </span>
      ) : null}
    </li>
  );
}
