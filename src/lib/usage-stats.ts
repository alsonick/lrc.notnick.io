/**
 * The numbers behind the charts on /usage, read from the Download table. For
 * server code only. Everything is counted in UTC, since the page is built on
 * the server and doesn't know the visitor's time zone.
 */

import type { DownloadSource } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import type { DownloadFormat } from "@/lib/session-log";

/** How many days the downloads chart can show, today included. */
export const DAYS_SHOWN = 90;

export type DailyCount = {
  /** The day in UTC, as "2026-11-20". */
  date: string;
  count: number;
};

export type UsageStats = {
  /** Every download on record. Saves by visitors with logging off aren't here. */
  total: number;
  /** The day of the first download on record, or null when there are none. */
  firstDate: string | null;
  /** One entry for each of the last `DAYS_SHOWN` days, oldest first, today last. */
  daily: DailyCount[];
  /** Downloads in each hour of the day (UTC), from midnight. Always 24 long. */
  hours: number[];
  formats: Record<DownloadFormat, number>;
  /** The site's sources, plus files converted by the Discord bot. */
  sources: Record<DownloadSource, number>;
  /** The day with the most downloads ever, or null when there are none. */
  busiestDay: DailyCount | null;
};

/** "2026-11-20" for a moment, in UTC. */
function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * The usage numbers, or null when there's no database or it can't be
 * reached, so the page still loads without the charts.
 */
export async function getUsageStats(): Promise<UsageStats | null> {
  if (!db) return null;

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const firstShown = new Date(today);
  firstShown.setUTCDate(firstShown.getUTCDate() - (DAYS_SHOWN - 1));

  try {
    // The days are grouped by Postgres, as there may be too many rows to
    // fetch. `createdAt` has no time zone and holds UTC, so the start is
    // passed the same way, and days come back as text to stay in UTC.
    const [perDay, perHour, busiest, groups, first] = await Promise.all([
      db.$queryRaw<DailyCount[]>`
        SELECT to_char(date_trunc('day', "createdAt"), 'YYYY-MM-DD') AS date,
               COUNT(*)::int AS count
        FROM "Download"
        WHERE "createdAt" >= ${firstShown.toISOString()}::timestamp
        GROUP BY 1`,
      db.$queryRaw<{ hour: number; count: number }[]>`
        SELECT EXTRACT(HOUR FROM "createdAt")::int AS hour,
               COUNT(*)::int AS count
        FROM "Download"
        GROUP BY 1`,
      db.$queryRaw<DailyCount[]>`
        SELECT to_char(date_trunc('day', "createdAt"), 'YYYY-MM-DD') AS date,
               COUNT(*)::int AS count
        FROM "Download"
        GROUP BY 1
        ORDER BY 2 DESC, 1 DESC
        LIMIT 1`,
      db.download.groupBy({
        by: ["format", "source"],
        _count: { _all: true },
      }),
      db.download.aggregate({ _min: { createdAt: true } }),
    ]);

    // Days with no downloads still get a point, at zero, so the line is
    // continuous and each day sits in the right place.
    const byDay = new Map(perDay.map((row) => [row.date, row.count]));
    const daily: DailyCount[] = [];
    for (let i = 0; i < DAYS_SHOWN; i++) {
      const day = new Date(firstShown);
      day.setUTCDate(day.getUTCDate() + i);
      const date = dayKey(day);
      daily.push({ date, count: byDay.get(date) ?? 0 });
    }

    const hours = Array.from({ length: 24 }, () => 0);
    for (const row of perHour) hours[row.hour] = row.count;

    const formats: Record<DownloadFormat, number> = { lrc: 0, srt: 0 };
    const sources: Record<DownloadSource, number> = {
      sync: 0,
      editor: 0,
      upload: 0,
      discord: 0,
    };
    let total = 0;
    for (const group of groups) {
      const count = group._count._all;
      formats[group.format] += count;
      sources[group.source] += count;
      total += count;
    }

    const firstAt = first._min.createdAt;
    return {
      total,
      firstDate: firstAt ? dayKey(firstAt) : null,
      daily,
      hours,
      formats,
      sources,
      busiestDay: busiest[0] ?? null,
    };
  } catch (error) {
    console.error("Couldn't read the usage numbers", error);
    return null;
  }
}
