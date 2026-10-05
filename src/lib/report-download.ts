/**
 * The browser's side of the download log (see `session-log.ts`): each time a
 * file is saved, `/api/log` is told what this visit has looked like so far.
 */

import type {
  DownloadFormat,
  DownloadSource,
  SessionLog,
} from "@/lib/session-log";
import { isLoggingEnabled, readTheme } from "@/lib/settings";

/** Files saved since the page was opened. */
const saved: Record<DownloadFormat, number> = { lrc: 0, srt: 0 };

/** A file that was just saved, as the place that saved it knows it. */
export type SavedFile = {
  format: DownloadFormat;
  filename: string;
  /** Lyric lines or subtitles in the file. */
  lines: number;
  /** Whether it was changed in the Edit panel first. */
  edited?: boolean;
  source: DownloadSource;
  /** The song that was loaded, with its length when that is known. */
  audio: { name: string; duration: number | null } | null;
};

/**
 * Reports a file that was just saved. Nothing is sent for visitors who
 * switched logging off in the settings.
 */
export function reportDownload({
  format,
  filename,
  lines,
  edited = false,
  source,
  audio,
}: SavedFile) {
  saved[format] += 1;
  if (!isLoggingEnabled()) return;

  const log: SessionLog = {
    format,
    source,
    filename,
    lines,
    edited,
    audio: audio && { name: audio.name, seconds: audio.duration },
    theme: readTheme(),
    dark: document.documentElement.classList.contains("dark"),
    // This clock starts when the page is opened, so it covers the whole visit.
    sessionSeconds: Math.round(performance.now() / 1000),
    saved: { ...saved },
    language: navigator.language ?? "",
    referrer: readReferrer(),
  };
  // Never in the download's way: nothing waits on it and a failure is dropped.
  void fetch("/api/log", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(log),
    keepalive: true,
  }).catch(() => {});
}

/** The site that linked here, by host name; "" for none or for this site. */
function readReferrer(): string {
  try {
    const host = new URL(document.referrer).hostname;
    return host === window.location.hostname ? "" : host;
  } catch {
    return "";
  }
}
