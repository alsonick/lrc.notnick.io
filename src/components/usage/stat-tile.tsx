import { ArrowDownRight, ArrowUpRight, Minus } from "react-feather";

import { cn } from "@/lib/utils";

/**
 * One number with a label, and optionally how it moved since the period
 * before. The change is spelled out in words and an arrow as well as colour.
 */
export function StatTile({
  label,
  value,
  note,
  change,
  className,
}: {
  label: string;
  value: React.ReactNode;
  /** A quiet line under the number, like the date of the busiest day. */
  note?: React.ReactNode;
  /** This period against the one before it, both as counts. */
  change?: { current: number; previous: number; period: string };
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col rounded-2xl border bg-card p-5 shadow-xs",
        className,
      )}
    >
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <p className="mt-2 text-3xl font-black tracking-tight">{value}</p>
      {/* Pinned to the bottom, so the tiles in a row line up. */}
      <div className="mt-auto pt-2 text-sm text-muted-foreground">
        {change ? <Change {...change} /> : note}
      </div>
    </div>
  );
}

function Change({
  current,
  previous,
  period,
}: {
  current: number;
  previous: number;
  period: string;
}) {
  // A percentage of nothing means nothing, so with no earlier downloads the
  // tile only says what it is compared with.
  if (previous === 0) {
    return <span>{current > 0 ? `None in the ${period} before` : "None yet"}</span>;
  }

  const change = Math.round(((current - previous) / previous) * 100);
  if (change === 0) {
    return (
      <span className="inline-flex items-center gap-1">
        <Minus aria-hidden className="size-4" />
        Same as the {period} before
      </span>
    );
  }

  const up = change > 0;
  const Arrow = up ? ArrowUpRight : ArrowDownRight;
  return (
    <span className="inline-flex flex-wrap items-center gap-x-1">
      <span
        className={cn(
          "inline-flex items-center gap-0.5 font-semibold",
          // More use is good news: green going up, red going down.
          up
            ? "text-green-700 dark:text-green-400"
            : "text-red-700 dark:text-red-400",
        )}
      >
        <Arrow aria-hidden className="size-4" />
        {up ? "Up" : "Down"} {Math.abs(change)}%
      </span>
      on the {period} before
    </span>
  );
}
