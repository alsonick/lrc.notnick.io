"use client";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

import { formatCount, formatShare } from "./format";

/**
 * The background colour of each part, in order. Written out in full so
 * Tailwind finds them; the colours themselves are the `--chart-*` tokens.
 */
const PART_COLORS = ["bg-chart-1", "bg-chart-2", "bg-chart-3", "bg-chart-4", "bg-chart-5"];

/** Parts narrower than this don't print their share: it wouldn't fit. */
const MIN_LABELLED_SHARE = 0.18;

export type SharePart = { label: string; value: number };

/**
 * One whole split into its parts: a bar with each part's share, and a list
 * underneath with every name, count and share. The list is what carries the
 * numbers, so nothing depends on telling the colours apart.
 */
export function ShareBar({
  title,
  description,
  parts,
  className,
}: {
  title: string;
  description?: string;
  /** In a fixed order, so a part keeps its colour whatever its size. */
  parts: SharePart[];
  className?: string;
}) {
  const total = parts.reduce((sum, part) => sum + part.value, 0);
  const summary = parts
    .map((part) => `${part.label}: ${formatShare(part.value, total)}`)
    .join(", ");

  return (
    <section
      className={cn("flex flex-col rounded-2xl border bg-card p-5 shadow-xs sm:p-6", className)}
    >
      <h3 className="text-base font-bold tracking-tight">{title}</h3>
      {description && (
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      )}

      <div
        role="img"
        aria-label={total === 0 ? "No downloads yet" : summary}
        className="mt-5 flex h-7 gap-0.5"
      >
        {total === 0 ? (
          <div className="flex-1 rounded-sm bg-muted" />
        ) : (
          parts.map((part, index) =>
            part.value === 0 ? null : (
              <Tooltip key={part.label}>
                <TooltipTrigger
                  render={<div />}
                  className={cn(
                    "flex min-w-1 items-center rounded-sm px-2 text-xs whitespace-nowrap font-semibold text-white tabular-nums transition-[filter] hover:brightness-110",
                    PART_COLORS[index],
                  )}
                  style={{ flexGrow: part.value, flexBasis: 0 }}
                >
                  {part.value / total >= MIN_LABELLED_SHARE &&
                    formatShare(part.value, total)}
                </TooltipTrigger>
                <TooltipContent>
                  {part.label}: {formatCount(part.value)} (
                  {formatShare(part.value, total)})
                </TooltipContent>
              </Tooltip>
            ),
          )
        )}
      </div>

      <ul className="mt-5 grid gap-2.5 text-sm">
        {parts.map((part, index) => (
          <li key={part.label} className="flex items-center gap-2.5">
            <span
              aria-hidden
              className={cn("size-2.5 shrink-0 rounded-[3px]", PART_COLORS[index])}
            />
            <span className="min-w-0 flex-1 truncate">{part.label}</span>
            <span className="text-muted-foreground tabular-nums">
              {formatCount(part.value)}
            </span>
            <span className="w-10 text-right font-semibold tabular-nums">
              {formatShare(part.value, total)}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
