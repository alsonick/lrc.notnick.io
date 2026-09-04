/**
 * Helpers for parsing, transforming and serializing LRC-style lyrics.
 *
 * The editor text is the source of truth: every line may start with one or
 * more `[mm:ss.xx]` time tags. `parseLyrics` turns that text into
 * `LyricLine[]` and `serializeLyrics` turns it back.
 */

export type LyricLine = {
  /** Line text without any leading time tags. */
  text: string;
  /** Position in seconds, or null when the line has not been synchronized. */
  time: number | null;
};

export type TransformResult = {
  text: string;
  /** How many tags / lines were removed or changed. Informational only. */
  count: number;
};

const TIME_TAG = String.raw`\[(\d{1,3}):(\d{2})(?:[.:](\d{1,3}))?\]`;
const TIME_TAG_RE = new RegExp(TIME_TAG);
const TIME_TAG_GLOBAL_RE = new RegExp(TIME_TAG, "g");
const LEADING_TIME_TAGS_RE = new RegExp(String.raw`^(?:\s*${TIME_TAG})+\s*`);
/** Enhanced-LRC word tags such as `<00:12.34>`. */
const WORD_TAG_GLOBAL_RE = /<\d{1,3}:\d{2}(?:[.:]\d{1,3})?>/g;
/** Metadata lines such as `[ti: Title]`, `[ar: Artist]`, `[offset: 500]`. */
const ID_TAG_LINE_RE =
  /^\s*\[(?:ti|ar|al|au|by|offset|re|ve|length|lr|la|tool|#)\s*:[^\]]*\]\s*$/i;
/** A line that is nothing but a single bracketed group, e.g. `[Chorus]`. */
const BRACKET_ONLY_LINE_RE = /^\s*\[[^[\]]*\]\s*$/;
/** Leftovers that come along when copying lyrics off Genius. */
const GENIUS_JUNK_RE =
  /^\s*(?:you might also like|\d*embed|see .+ liveget tickets.*)\s*$/i;

function toLines(text: string): string[] {
  return text.replace(/\r\n?/g, "\n").split("\n");
}

function pad2(n: number): string {
  return n.toString().padStart(2, "0");
}

/** `mm:ss.xx` (the inside of an LRC tag) for a position in seconds. */
export function formatTime(seconds: number): string {
  const total = Math.max(0, Math.round(seconds * 100));
  const minutes = Math.floor(total / 6000);
  const secs = Math.floor((total % 6000) / 100);
  const hundredths = total % 100;
  return `${pad2(minutes)}:${pad2(secs)}.${pad2(hundredths)}`;
}

/** `mm:ss.d` for a live counter. Tenths keep the display readable. */
export function formatClock(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds * 10));
  const minutes = Math.floor(total / 600);
  const secs = Math.floor((total % 600) / 10);
  const tenths = total % 10;
  return `${pad2(minutes)}:${pad2(secs)}.${tenths}`;
}

function tagToSeconds(min: string, sec: string, frac?: string): number {
  const fraction = frac ? Number(`0.${frac}`) : 0;
  return Number(min) * 60 + Number(sec) + fraction;
}

export function parseLyrics(text: string): LyricLine[] {
  return toLines(text).map((line) => {
    const leading = LEADING_TIME_TAGS_RE.exec(line);
    if (!leading) return { text: line.trim(), time: null };
    const first = TIME_TAG_RE.exec(leading[0]);
    return {
      text: line.slice(leading[0].length).trim(),
      time: first ? tagToSeconds(first[1], first[2], first[3]) : null,
    };
  });
}

function lineToLrc(line: LyricLine): string {
  return line.time === null
    ? line.text
    : `[${formatTime(line.time)}]${line.text}`;
}

/** Round-trips `parseLyrics` output back into editor text. */
export function serializeLyrics(lines: LyricLine[]): string {
  return lines.map(lineToLrc).join("\n");
}

/** Content for a downloadable `.lrc` file. Blank untimed lines are dropped. */
export function buildLrcFile(lines: LyricLine[]): string {
  return (
    lines
      .filter((line) => line.time !== null || line.text !== "")
      .map(lineToLrc)
      .join("\n") + "\n"
  );
}

/** Drops blank lines at both ends of the lyrics. */
export function trimBlankEdges(lines: LyricLine[]): LyricLine[] {
  const isBlank = (line: LyricLine) => line.text === "" && line.time === null;
  let start = 0;
  let end = lines.length;
  while (start < end && isBlank(lines[start])) start += 1;
  while (end > start && isBlank(lines[end - 1])) end -= 1;
  return lines.slice(start, end);
}

export function isSectionHeader(line: string): boolean {
  return (
    BRACKET_ONLY_LINE_RE.test(line) &&
    !TIME_TAG_RE.test(line) &&
    !ID_TAG_LINE_RE.test(line)
  );
}

function tidyBlankLines(lines: string[]): string[] {
  const out: string[] = [];
  for (const line of lines) {
    const blank = line.trim() === "";
    if (blank && (out.length === 0 || out[out.length - 1].trim() === "")) {
      continue;
    }
    out.push(line);
  }
  while (out.length > 0 && out[out.length - 1].trim() === "") out.pop();
  return out;
}

/** Removes `[Verse 1]`, `[Chorus]`… headers and Genius copy-paste leftovers. */
export function stripSections(text: string): TransformResult {
  const kept: string[] = [];
  let count = 0;
  for (const line of toLines(text)) {
    if (isSectionHeader(line) || GENIUS_JUNK_RE.test(line)) {
      count += 1;
      continue;
    }
    kept.push(line);
  }
  return { text: tidyBlankLines(kept).join("\n"), count };
}

/** Removes every time tag (`[mm:ss.xx]`, `<mm:ss.xx>`) and metadata line. */
export function stripTags(text: string): TransformResult {
  const out: string[] = [];
  let count = 0;
  for (const line of toLines(text)) {
    if (ID_TAG_LINE_RE.test(line)) {
      count += 1;
      continue;
    }
    const timeTags = line.match(TIME_TAG_GLOBAL_RE)?.length ?? 0;
    const wordTags = line.match(WORD_TAG_GLOBAL_RE)?.length ?? 0;
    if (timeTags + wordTags === 0) {
      out.push(line);
      continue;
    }
    count += timeTags + wordTags;
    const next = line
      .replace(TIME_TAG_GLOBAL_RE, "")
      .replace(WORD_TAG_GLOBAL_RE, " ")
      .replace(/[ \t]{2,}/g, " ")
      .trim();
    // A line that was only a time tag disappears entirely.
    if (next === "" && line.trim() !== "") continue;
    out.push(next);
  }
  return { text: out.join("\n"), count };
}

/** Changes the case of lyric text while leaving time tags and metadata alone. */
export function changeCase(
  text: string,
  mode: "lower" | "upper",
): TransformResult {
  let count = 0;
  const out = toLines(text).map((line) => {
    if (ID_TAG_LINE_RE.test(line)) return line;
    const prefix = LEADING_TIME_TAGS_RE.exec(line)?.[0] ?? "";
    const body = line.slice(prefix.length);
    const changed = mode === "lower" ? body.toLowerCase() : body.toUpperCase();
    if (changed !== body) count += 1;
    return prefix + changed;
  });
  return { text: out.join("\n"), count };
}

/**
 * Puts case-changed lines back the way they were written in `original`.
 * Lines are matched by their text ignoring case and leading time tags, so
 * stamps added later survive and lines that were edited since are left alone.
 */
export function restoreOriginalCase(text: string, original: string): string {
  const originals = new Map<string, string>();
  for (const line of toLines(original)) {
    if (ID_TAG_LINE_RE.test(line)) continue;
    const prefix = LEADING_TIME_TAGS_RE.exec(line)?.[0] ?? "";
    const body = line.slice(prefix.length);
    const key = body.toLowerCase();
    if (key.trim() !== "" && !originals.has(key)) originals.set(key, body);
  }
  return toLines(text)
    .map((line) => {
      if (ID_TAG_LINE_RE.test(line)) return line;
      const prefix = LEADING_TIME_TAGS_RE.exec(line)?.[0] ?? "";
      const body = line.slice(prefix.length);
      const restored = originals.get(body.toLowerCase());
      return restored === undefined ? line : prefix + restored;
    })
    .join("\n");
}

export function countSyncable(lines: LyricLine[]): number {
  return lines.filter((line) => line.text !== "").length;
}

export function countSynced(lines: LyricLine[]): number {
  return lines.filter((line) => line.text !== "" && line.time !== null).length;
}
