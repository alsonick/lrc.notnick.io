/**
 * Shared rules for the download log: what the browser reports each time a
 * file is saved (see `report-download.ts`), and how the `/api/log` route
 * words it for a Discord webhook.
 */

import { SITE_NAME, THEME_COLOR } from "@/lib/constants";

export type DownloadFormat = "lrc" | "srt";
/** Where the lyrics came from: synced here, the editor as it is, or an uploaded .lrc. */
export type DownloadSource = "sync" | "editor" | "upload";

export type SessionLog = {
  format: DownloadFormat;
  source: DownloadSource;
  /** The saved file's name, and how many lyric lines or subtitles it holds. */
  filename: string;
  lines: number;
  /** Whether it was changed in the Edit panel before it was saved. */
  edited: boolean;
  /**
   * The audio that was loaded, if any. `seconds` is its length, which is what
   * lets the last subtitle run until the song ends; null when it isn't known.
   */
  audio: { name: string; seconds: number | null } | null;
  /** The theme setting, and whether that came out dark on screen. */
  theme: "light" | "dark" | "system";
  dark: boolean;
  /** Seconds since the page was opened. */
  sessionSeconds: number;
  /** Files saved since the page was opened, this one included. */
  saved: Record<DownloadFormat, number>;
  /** The browser's language, like "en-GB"; "" when it doesn't say. */
  language: string;
  /** Host name of the site the visitor arrived from; "" when there is none. */
  referrer: string;
};

const FILE_NAME_MAX_LENGTH = 200;
const USER_AGENT_MAX_LENGTH = 256;
const FORMATS: readonly DownloadFormat[] = ["lrc", "srt"];
const SOURCES: readonly DownloadSource[] = ["sync", "editor", "upload"];
const THEMES: readonly SessionLog["theme"][] = ["light", "dark", "system"];

const SOURCE_LABELS: Record<DownloadSource, string> = {
  sync: "Synced in the app",
  editor: "Saved from the editor",
  upload: "Uploaded an .lrc",
};

/** Checks an incoming request body and normalizes it; null when it isn't a log. */
export function validateSessionLog(body: unknown): SessionLog | null {
  if (typeof body !== "object" || body === null) return null;
  const {
    format,
    source,
    filename,
    lines,
    edited,
    audio,
    theme,
    dark,
    sessionSeconds,
    saved,
    language,
    referrer,
  } = body as Record<string, unknown>;
  if (!FORMATS.includes(format as DownloadFormat)) return null;
  if (!SOURCES.includes(source as DownloadSource)) return null;
  if (typeof filename !== "string" || typeof edited !== "boolean") return null;
  const lineCount = count(lines);
  if (lineCount === null) return null;
  if (!THEMES.includes(theme as SessionLog["theme"])) return null;
  if (typeof dark !== "boolean") return null;
  const session = seconds(sessionSeconds);
  if (session === null) return null;
  if (typeof saved !== "object" || saved === null) return null;
  const counts = saved as Record<string, unknown>;
  const lrc = count(counts.lrc);
  const srt = count(counts.srt);
  if (lrc === null || srt === null) return null;

  let loaded: SessionLog["audio"] = null;
  if (audio !== null && audio !== undefined) {
    if (typeof audio !== "object") return null;
    const { name, seconds: length } = audio as Record<string, unknown>;
    if (typeof name !== "string") return null;
    loaded = { name: cleanName(name), seconds: seconds(length) };
  }

  return {
    format: format as DownloadFormat,
    source: source as DownloadSource,
    filename: cleanName(filename),
    lines: lineCount,
    edited,
    audio: loaded,
    theme: theme as SessionLog["theme"],
    dark,
    sessionSeconds: session,
    saved: { lrc, srt },
    // Extras: a report is still worth having when one of these is off.
    language: matching(language, /^[A-Za-z0-9-]{1,35}$/),
    referrer: matching(referrer, /^[A-Za-z0-9.-]{1,253}$/).toLowerCase(),
  };
}

/** The value when it is text of the expected shape, otherwise "". */
function matching(value: unknown, shape: RegExp): string {
  return typeof value === "string" && shape.test(value) ? value : "";
}

/** A length of time in whole seconds, or null when it isn't one. */
function seconds(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? Math.round(value)
    : null;
}

function count(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) && value >= 0
    ? Math.min(value, 9999)
    : null;
}

/** One line of plain text, short enough for a Discord field. */
function cleanName(name: string): string {
  const text = name
    .replace(/[\s\u0000-\u001f\u007f]+/g, " ")
    .trim()
    .slice(0, FILE_NAME_MAX_LENGTH);
  return text || "(no name)";
}

/** "45s", "12m 04s" or "1h 02m". */
function formatSpan(total: number): string {
  const two = (value: number) => String(value).padStart(2, "0");
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  if (hours > 0) return `${hours}h ${two(minutes)}m`;
  if (minutes > 0) return `${minutes}m ${two(secs)}s`;
  return `${secs}s`;
}

/**
 * A file name as Discord code, so nothing in it reads as a link, a mention
 * or formatting.
 */
function asCode(text: string): string {
  return `\`${text.replace(/`/g, "'")}\``;
}

/** The JSON body Discord expects. Mentions are disabled so a file name can't ping anyone. */
export function buildSessionLogPayload(
  log: SessionLog,
  meta: { userAgent?: string } = {},
) {
  const themeName = log.theme[0].toUpperCase() + log.theme.slice(1);
  const audio = log.audio
    ? asCode(log.audio.name) +
      (log.audio.seconds === null ? "" : ` (${formatSpan(log.audio.seconds)})`)
    : "None";
  const saved = FORMATS.filter((format) => log.saved[format] > 0)
    .map((format) => `.${format} ×${log.saved[format]}`)
    .join(", ");

  return {
    username: `${SITE_NAME}`,
    embeds: [
      {
        title: `Downloaded .${log.format}`,
        color: parseInt(THEME_COLOR.slice(1), 16),
        fields: [
          { name: "File", value: asCode(log.filename), inline: true },
          { name: "Lines", value: String(log.lines), inline: true },
          { name: "Lyrics", value: SOURCE_LABELS[log.source], inline: true },
          {
            name: "Edited first",
            value: log.edited ? "Yes" : "No",
            inline: true,
          },
          {
            name: "Theme",
            value:
              log.theme === "system"
                ? `System (${log.dark ? "dark" : "light"})`
                : themeName,
            inline: true,
          },
          {
            name: "Session",
            value: formatSpan(log.sessionSeconds),
            inline: true,
          },
          { name: "Audio", value: audio },
          {
            name: "Saved this session",
            value: saved || `.${log.format} ×1`,
            inline: true,
          },
          { name: "Language", value: log.language || "Unknown", inline: true },
          { name: "Came from", value: log.referrer || "Direct", inline: true },
          ...(meta.userAgent
            ? [
                {
                  name: "Browser",
                  value: meta.userAgent.slice(0, USER_AGENT_MAX_LENGTH),
                },
              ]
            : []),
        ],
        timestamp: new Date().toISOString(),
      },
    ],
    allowed_mentions: { parse: [] as string[] },
  };
}
