/**
 * How the usage charts write numbers and days. Days arrive as "2026-11-20" in
 * UTC and are shown in UTC, so the server and the browser agree on them.
 */

const numberFormat = new Intl.NumberFormat("en-US");
const compactFormat = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
});

/** 1,284. */
export function formatCount(value: number): string {
  return numberFormat.format(value);
}

/** 1,284 in full up to 10,000, then 12.9K, so axis ticks stay short. */
export function formatCompact(value: number): string {
  return value < 10_000 ? numberFormat.format(value) : compactFormat.format(value);
}

/** "1 download" or "12 downloads". */
export function formatDownloads(value: number): string {
  return `${formatCount(value)} ${value === 1 ? "download" : "downloads"}`;
}

/** The share of a whole as "46%"; under 1% (but not none) shows as "<1%". */
export function formatShare(part: number, whole: number): string {
  if (whole === 0) return "0%";
  const share = (part / whole) * 100;
  return share > 0 && share < 1 ? "<1%" : `${Math.round(share)}%`;
}

function toDate(day: string): Date {
  return new Date(`${day}T00:00:00Z`);
}

/** "Nov 20". */
export function formatDay(day: string): string {
  return toDate(day).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

/** "Fri, Nov 20, 2026". */
export function formatLongDay(day: string): string {
  return toDate(day).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** "12am", "3pm". */
export function formatHour(hour: number): string {
  const twelve = hour % 12 === 0 ? 12 : hour % 12;
  return `${twelve}${hour < 12 ? "am" : "pm"}`;
}
