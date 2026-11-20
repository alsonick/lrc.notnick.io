"use client";

import { useId, useState } from "react";
import { Radio } from "@base-ui/react/radio";
import { RadioGroup } from "@base-ui/react/radio-group";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";

import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { SEGMENTED_GROUP_CLASS, SEGMENTED_ITEM_CLASS } from "@/components/ui/segmented";
import type { DailyCount } from "@/lib/usage-stats";
import { cn } from "@/lib/utils";

import { formatCompact, formatDay, formatDownloads, formatLongDay } from "./format";

const RANGES = [
  { days: 7, label: "7 days" },
  { days: 30, label: "30 days" },
  { days: 90, label: "90 days" },
] as const;

type Range = (typeof RANGES)[number]["days"];

const config = {
  count: { label: "Downloads", color: "var(--chart-brand)" },
} satisfies ChartConfig;

/**
 * Downloads per day as a line with a soft fill under it, for the last week,
 * month or three months. Hovering (or the arrow keys, once it has focus)
 * shows each day's count.
 */
export function DownloadsChart({
  daily,
  firstDate,
  className,
}: {
  /** Oldest first, today last, with no gaps. */
  daily: DailyCount[];
  /** The first day on record. Days before it weren't counted, not empty. */
  firstDate: string | null;
  className?: string;
}) {
  const [range, setRange] = useState<Range>(30);
  const headingId = useId();
  const gradientId = `downloads-fill-${useId().replace(/:/g, "")}`;

  // Before the first download on record the line would sit at zero, which
  // would read as nobody using the site rather than nothing being counted.
  const shown = daily
    .slice(-range)
    .filter((day) => firstDate !== null && day.date >= firstDate);
  const total = shown.reduce((sum, day) => sum + day.count, 0);

  return (
    <section
      aria-labelledby={headingId}
      className={cn("rounded-2xl border bg-card p-5 shadow-xs sm:p-6", className)}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 id={headingId} className="text-base font-bold tracking-tight">
            Downloads per day
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {formatDownloads(total)} in the last {range} days
          </p>
        </div>
        <RadioGroup
          value={range}
          onValueChange={(value) => setRange(value as Range)}
          aria-label="Days shown"
          className={cn(SEGMENTED_GROUP_CLASS, "w-full sm:w-64")}
        >
          {RANGES.map((option) => (
            <Radio.Root
              key={option.days}
              value={option.days}
              className={SEGMENTED_ITEM_CLASS}
            >
              {option.label}
            </Radio.Root>
          ))}
        </RadioGroup>
      </div>

      <ChartContainer config={config} className="mt-6 aspect-auto h-64 w-full">
        <AreaChart data={shown} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <defs>
            {/* A wash of the line's colour that fades out toward the axis. */}
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-count)" stopOpacity={0.25} />
              <stop offset="100%" stopColor="var(--color-count)" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey="date"
            tickLine={false}
            axisLine={false}
            tickMargin={10}
            minTickGap={28}
            tickFormatter={formatDay}
          />
          <YAxis
            width={36}
            tickLine={false}
            axisLine={false}
            tickMargin={6}
            allowDecimals={false}
            tickFormatter={formatCompact}
          />
          <ChartTooltip
            cursor={{ strokeWidth: 1 }}
            content={
              <ChartTooltipContent
                indicator="line"
                labelFormatter={(_, payload) =>
                  formatLongDay(String(payload[0]?.payload?.date ?? ""))
                }
              />
            }
          />
          <Area
            dataKey="count"
            type="monotone"
            stroke="var(--color-count)"
            strokeWidth={2}
            fill={`url(#${gradientId})`}
            // Ringed in the card's colour so the dot stands off the line.
            activeDot={{ r: 5, strokeWidth: 2, stroke: "var(--card)" }}
            // Redrawing on every range change would flicker; the range
            // buttons are enough of a change.
            isAnimationActive={false}
          />
        </AreaChart>
      </ChartContainer>

      {/* The same numbers for screen readers, which can't read the line. */}
      <table className="sr-only">
        <caption>Downloads per day, last {range} days (UTC)</caption>
        <thead>
          <tr>
            <th scope="col">Day</th>
            <th scope="col">Downloads</th>
          </tr>
        </thead>
        <tbody>
          {shown.map((day) => (
            <tr key={day.date}>
              <th scope="row">{formatLongDay(day.date)}</th>
              <td>{day.count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
