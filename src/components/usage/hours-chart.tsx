"use client";

import { useId } from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { cn } from "@/lib/utils";

import { formatCompact, formatHour } from "./format";

const config = {
  count: { label: "Downloads", color: "var(--chart-brand)" },
} satisfies ChartConfig;

/** Labels on the hour axis every few hours, so they don't crowd. */
const TICKS = [0, 3, 6, 9, 12, 15, 18, 21];

/** Every download ever, by the hour of the day (UTC) it was saved in. */
export function HoursChart({
  hours,
  className,
}: {
  /** 24 counts, from midnight UTC. */
  hours: number[];
  className?: string;
}) {
  const headingId = useId();
  const data = hours.map((count, hour) => ({ hour, count }));

  return (
    <section
      aria-labelledby={headingId}
      className={cn("flex flex-col rounded-2xl border bg-card p-5 shadow-xs sm:p-6", className)}
    >
      <h3 id={headingId} className="text-base font-bold tracking-tight">
        Time of day
      </h3>

      <ChartContainer
        config={config}
        className="mt-6 aspect-auto min-h-56 w-full flex-1"
      >
        <BarChart data={data} margin={{ top: 8, right: 0, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey="hour"
            ticks={TICKS}
            interval={0}
            tickLine={false}
            axisLine={false}
            tickMargin={10}
            tickFormatter={formatHour}
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
            cursor={{ radius: 4 }}
            content={
              <ChartTooltipContent
                hideIndicator
                labelFormatter={(_, payload) => {
                  const hour = Number(payload[0]?.payload?.hour ?? 0);
                  return `${formatHour(hour)}–${formatHour((hour + 1) % 24)} UTC`;
                }}
              />
            }
          />
          <Bar
            dataKey="count"
            fill="var(--color-count)"
            // Rounded at the top only: the bars grow from the axis.
            radius={[4, 4, 0, 0]}
            maxBarSize={24}
          />
        </BarChart>
      </ChartContainer>

      <table className="sr-only">
        <caption>Downloads by hour of the day (UTC)</caption>
        <thead>
          <tr>
            <th scope="col">Hour</th>
            <th scope="col">Downloads</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr key={row.hour}>
              <th scope="row">
                {formatHour(row.hour)} to {formatHour((row.hour + 1) % 24)}
              </th>
              <td>{row.count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
