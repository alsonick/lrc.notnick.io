import type { DailyCount, UsageStats } from "@/lib/usage-stats";
import { cn } from "@/lib/utils";

import { DownloadsChart } from "./downloads-chart";
import { formatCount, formatLongDay } from "./format";
import { HoursChart } from "./hours-chart";
import { ShareBar } from "./share-bar";
import { StatTile } from "./stat-tile";

/** Downloads in the `days` days ending `daysAgo` days before today. */
function sumDays(daily: DailyCount[], days: number, daysAgo = 0): number {
  const end = daily.length - daysAgo;
  return daily
    .slice(Math.max(0, end - days), end)
    .reduce((sum, day) => sum + day.count, 0);
}

/** How many days, today included, have been on record since `firstDate`. */
function daysOnRecord(firstDate: string | null): number {
  if (!firstDate) return 0;
  const today = new Date().toISOString().slice(0, 10);
  const days = (Date.parse(today) - Date.parse(firstDate)) / 86_400_000;
  return Math.round(days) + 1;
}

/**
 * The downloads on record, as a row of numbers and then charts: per day, by
 * hour, by file type and by where the lyrics came from.
 */
export function UsageOverview({
  stats,
  className,
}: {
  stats: UsageStats;
  className?: string;
}) {
  const { daily } = stats;
  const lastWeek = sumDays(daily, 7);
  const lastMonth = sumDays(daily, 30);
  const recorded = daysOnRecord(stats.firstDate);
  // A change is only shown once the period before was counted in full, or
  // the days before the log began would read as a quiet spell.
  const compare = (days: number, current: number) =>
    recorded >= days * 2
      ? {
          current,
          previous: sumDays(daily, days, days),
          period: days === 7 ? "week" : `${days} days`,
        }
      : undefined;
  // Averaged over the days on record, for the same reason.
  const averageDays = Math.max(1, Math.min(30, recorded));

  return (
    <div className={cn("grid gap-4", className)}>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile
          label="Last 7 days"
          value={formatCount(lastWeek)}
          change={compare(7, lastWeek)}
          note="Not enough history to compare yet"
        />
        <StatTile
          label="Last 30 days"
          value={formatCount(lastMonth)}
          change={compare(30, lastMonth)}
          note="Not enough history to compare yet"
        />
        <StatTile
          label="Daily average"
          value={formatCount(Math.round(lastMonth / averageDays))}
          note={`Over the last ${averageDays === 1 ? "day" : `${averageDays} days`}`}
        />
        <StatTile
          label="Busiest day"
          value={formatCount(stats.busiestDay?.count ?? 0)}
          note={stats.busiestDay ? formatLongDay(stats.busiestDay.date) : "None yet"}
        />
      </div>

      <DownloadsChart daily={daily} firstDate={stats.firstDate} />

      <div className="grid gap-4 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <HoursChart hours={stats.hours} />
        <div className="grid gap-4">
          <ShareBar
            title="File type"
            parts={[
              { label: ".lrc lyrics", value: stats.formats.lrc },
              { label: ".srt subtitles", value: stats.formats.srt },
            ]}
          />
          <ShareBar
            title="Where the lyrics came from"
            parts={[
              { label: "Synced in the app", value: stats.sources.sync },
              { label: "Saved from the editor", value: stats.sources.editor },
              { label: "Uploaded an .lrc", value: stats.sources.upload },
            ]}
          />
        </div>
      </div>
    </div>
  );
}
