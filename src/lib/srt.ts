/**
 * Converts LRC text into SubRip (`.srt`) subtitles.
 *
 * LRC only says when each line starts, so a subtitle lasts until the next
 * time in the file. A time tag with no text after it ends the line before it
 * early (handy for instrumental breaks). Nothing follows the last line, so it
 * runs to the end of the song when the song's length is known, or for a fixed
 * few seconds when it isn't.
 */

import { inspectLrcLine } from "@/lib/lrc";

/** How long the last subtitle stays up when the song's length isn't known. */
export const LAST_CUE_SECONDS = 5;

export type SrtCue = {
  /** Seconds from the start of the song. */
  start: number;
  end: number;
  text: string;
  /** Index of the LRC line the cue comes from. */
  line: number;
};

function pad(n: number, width: number): string {
  return n.toString().padStart(width, "0");
}

/** `hh:mm:ss,mmm`, the SRT timestamp format. */
export function formatSrtTime(seconds: number): string {
  const total = Math.max(0, Math.round(seconds * 1000));
  const hours = Math.floor(total / 3_600_000);
  const minutes = Math.floor((total % 3_600_000) / 60_000);
  const secs = Math.floor((total % 60_000) / 1000);
  return `${pad(hours, 2)}:${pad(minutes, 2)}:${pad(secs, 2)},${pad(total % 1000, 3)}`;
}

/**
 * One cue per time tag, in time order. Untimed lines and metadata are left
 * out, `[offset: …]` is applied, and a line with several tags (a repeated
 * chorus) becomes one cue per tag. `duration` is the song's length in
 * seconds, if known: the last cue then ends with the song.
 */
export function lrcToSrtCues(
  text: string,
  duration: number | null = null,
): SrtCue[] {
  let offset = 0;
  const stamps: { time: number; text: string; line: number }[] = [];
  text
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .forEach((raw, line) => {
      const info = inspectLrcLine(raw);
      if (info.kind === "meta" && info.offset !== null) offset = info.offset;
      if (info.kind !== "timed") return;
      for (const time of info.times) stamps.push({ time, text: info.text, line });
    });
  // Stable, so lines stamped at the same moment keep their order.
  stamps.sort((a, b) => a.time - b.time);

  const cues: SrtCue[] = [];
  stamps.forEach((stamp, index) => {
    if (stamp.text === "") return;
    let next = index + 1;
    while (next < stamps.length && stamps[next].time <= stamp.time) next += 1;
    // A positive offset shows the lyrics earlier.
    const start = Math.max(0, stamp.time - offset);
    let end: number;
    if (next < stamps.length) {
      end = stamps[next].time - offset;
    } else if (duration !== null && duration > start) {
      end = duration;
    } else {
      // No length, or one that ends before this line starts (the audio is
      // probably for another song): fall back to a fixed spell.
      end = start + LAST_CUE_SECONDS;
    }
    // Nothing to show when the offset pushes the whole line before 0:00.
    if (end <= start) return;
    cues.push({ start, end, text: stamp.text, line: stamp.line });
  });
  return cues;
}

/** Content for a downloadable `.srt` file. Subtitles are numbered from 1. */
export function buildSrtFile(
  cues: Pick<SrtCue, "start" | "end" | "text">[],
): string {
  const blocks = cues.map(
    (cue, index) =>
      `${index + 1}\n${formatSrtTime(cue.start)} --> ${formatSrtTime(cue.end)}\n${cue.text}`,
  );
  return blocks.length === 0 ? "" : `${blocks.join("\n\n")}\n`;
}

/*
 * SRT text edited by hand. A file is a run of blocks separated by blank
 * lines: an optional number, a time range, then one or more lines of text.
 */

/** How long a subtitle added by hand lasts until its times are edited. */
export const NEW_CUE_SECONDS = 2;

const SRT_TIME = String.raw`(\d{1,3}):(\d{2}):(\d{2})[,.](\d{1,3})`;
const SRT_TIMING_RE = new RegExp(
  String.raw`^\s*${SRT_TIME}\s*-->\s*${SRT_TIME}\s*$`,
);

/** What a line of SRT text is. `stray` is text that no time range covers. */
export type SrtLineKind =
  | "blank"
  | "index"
  | "timing"
  | "badTiming"
  | "text"
  | "stray";

/** A subtitle read back from SRT text. */
export type SrtBlock = {
  start: number;
  end: number;
  /** One or more lines, joined with `\n`. */
  text: string;
  /** First and last line of the block in the text. */
  from: number;
  to: number;
};

/** A block that can't become a subtitle, or probably isn't what was meant. */
export type SrtIssue = {
  /** Index of the line in the text. */
  line: number;
  /**
   * `timing`: not a readable time range. `range`: ends before it starts.
   * `empty`: no text under it. `stray`: text without a time range above it.
   * `order`: starts before the subtitle above (kept, but worth a look).
   */
  kind: "timing" | "range" | "empty" | "stray" | "order";
};

function srtSeconds(h: string, m: string, s: string, frac: string): number {
  return Number(h) * 3600 + Number(m) * 60 + Number(s) + Number(`0.${frac}`);
}

/**
 * Reads SRT text. `cues` holds only the blocks fit for a file; the rest are
 * in `issues`, and `kinds` says what each line is.
 */
export function parseSrt(text: string): {
  cues: SrtBlock[];
  kinds: SrtLineKind[];
  issues: SrtIssue[];
} {
  const lines = text.replace(/\r\n?/g, "\n").split("\n");
  const kinds: SrtLineKind[] = [];
  const cues: SrtBlock[] = [];
  const issues: SrtIssue[] = [];
  /** The block whose text is being read. */
  let open: {
    start: number;
    end: number;
    timing: number;
    from: number;
    text: string[];
  } | null = null;
  /** Inside a block that has no usable time range. */
  let stray = false;
  /** Line of a number still waiting for its time range. */
  let pendingIndex = -1;
  let previousStart = -Infinity;

  const close = () => {
    if (!open) return;
    if (open.end <= open.start) {
      issues.push({ line: open.timing, kind: "range" });
    } else if (open.text.length === 0) {
      issues.push({ line: open.timing, kind: "empty" });
    } else {
      if (open.start < previousStart) {
        issues.push({ line: open.timing, kind: "order" });
      }
      previousStart = open.start;
      cues.push({
        start: open.start,
        end: open.end,
        text: open.text.join("\n"),
        from: open.from,
        to: open.timing + open.text.length,
      });
    }
    open = null;
  };

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (line.trim() === "") {
      kinds.push("blank");
      close();
      stray = false;
      pendingIndex = -1;
    } else if (open) {
      kinds.push("text");
      open.text.push(line.trim());
    } else if (stray) {
      kinds.push("stray");
    } else {
      const timing = SRT_TIMING_RE.exec(line);
      if (timing) {
        kinds.push("timing");
        open = {
          start: srtSeconds(timing[1], timing[2], timing[3], timing[4]),
          end: srtSeconds(timing[5], timing[6], timing[7], timing[8]),
          timing: i,
          from: pendingIndex === -1 ? i : pendingIndex,
          text: [],
        };
        pendingIndex = -1;
      } else if (line.includes("-->")) {
        kinds.push("badTiming");
        issues.push({ line: i, kind: "timing" });
        stray = true;
        pendingIndex = -1;
      } else if (
        pendingIndex === -1 &&
        /^\s*\d+\s*$/.test(line) &&
        (lines[i + 1] ?? "").includes("-->")
      ) {
        kinds.push("index");
        pendingIndex = i;
      } else {
        kinds.push("stray");
        issues.push({ line: i, kind: "stray" });
        stray = true;
      }
    }
  }
  close();
  issues.sort((a, b) => a.line - b.line);
  return { cues, kinds, issues };
}

/** A run of characters in one line of SRT text, for syntax highlighting. */
export type SrtToken = {
  kind: "text" | "index" | "time" | "arrow" | "bad";
  text: string;
};

/** Like `tokenizeLrcLine`: the tokens join back into exactly the line. */
export function tokenizeSrtLine(line: string, kind: SrtLineKind): SrtToken[] {
  if (kind === "index") return [{ kind: "index", text: line }];
  if (kind === "badTiming" || kind === "stray") {
    return [{ kind: "bad", text: line }];
  }
  if (kind !== "timing") return [{ kind: "text", text: line }];
  const arrow = line.indexOf("-->");
  return [
    { kind: "time", text: line.slice(0, arrow) },
    { kind: "arrow", text: "-->" },
    { kind: "time", text: line.slice(arrow + 3) },
  ];
}

/**
 * Adds an empty subtitle after the one `line` is in (or at the end when
 * there's none above it) and renumbers every block. It starts where that one
 * ends; when the next subtitle follows with no gap, as lyrics do, the two
 * split that one's time instead, so nothing overlaps. Returns the new text
 * and the line the subtitle's own text goes on.
 */
export function addSrtCue(
  text: string,
  line: number,
): { text: string; line: number } {
  const lines = text.replace(/\r\n?/g, "\n").split("\n");
  const { cues } = parseSrt(text);
  let at = -1;
  cues.forEach((cue, index) => {
    if (cue.from <= line) at = index;
  });
  const before = at === -1 ? null : cues[at];
  const after = cues[at + 1] ?? null;
  let start = before ? before.end : 0;
  let end = start + NEW_CUE_SECONDS;
  if (before && after && after.start <= before.end) {
    const middle = Math.round((before.start + before.end) * 500) / 1000;
    const timingLine = before.to - before.text.split("\n").length;
    lines[timingLine] =
      `${formatSrtTime(before.start)} --> ${formatSrtTime(middle)}`;
    start = middle;
    end = before.end;
  } else if (after && after.start > start) {
    // A gap, but maybe a short one: stop at the next subtitle.
    end = Math.min(end, after.start);
  }
  const timing = `${formatSrtTime(start)} --> ${formatSrtTime(end)}`;

  let textLine: number;
  if (before) {
    const insertAt = before.to + 1;
    const block = ["", "0", timing, ""];
    // Keep a blank line between the new text line and whatever follows.
    if ((lines[insertAt] ?? "").trim() !== "") block.push("");
    lines.splice(insertAt, 0, ...block);
    textLine = insertAt + 3;
  } else if (text.trim() === "") {
    lines.splice(0, lines.length, "0", timing, "");
    textLine = 2;
  } else {
    lines.unshift("0", timing, "", "");
    textLine = 2;
  }

  // Number each block by its place, whatever its number said before.
  const { kinds } = parseSrt(lines.join("\n"));
  let blocks = 0;
  kinds.forEach((kind, index) => {
    if (kind === "index") lines[index] = String(blocks + 1);
    if (kind === "timing" || kind === "badTiming") blocks += 1;
  });
  return { text: lines.join("\n"), line: textLine };
}
