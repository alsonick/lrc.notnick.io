/**
 * Converts LRC text into SubRip (`.srt`) subtitles.
 *
 * LRC only says when each line starts, so a subtitle lasts until the next
 * time in the file. A time tag with no text after it ends the line before it
 * early (handy for instrumental breaks), and the last line gets a fixed
 * length because nothing follows it.
 */

import { inspectLrcLine } from "@/lib/lrc";

/** How long the last subtitle stays up, at most, since nothing follows it. */
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
 * chorus) becomes one cue per tag. `duration`, when the song's length is
 * known, keeps the last cue from running past the end.
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
    } else {
      end = start + LAST_CUE_SECONDS;
      if (duration !== null && duration > start) end = Math.min(end, duration);
    }
    // Nothing to show when the offset pushes the whole line before 0:00.
    if (end <= start) return;
    cues.push({ start, end, text: stamp.text, line: stamp.line });
  });
  return cues;
}

/** Content for a downloadable `.srt` file. */
export function buildSrtFile(cues: SrtCue[]): string {
  const blocks = cues.map(
    (cue, index) =>
      `${index + 1}\n${formatSrtTime(cue.start)} --> ${formatSrtTime(cue.end)}\n${cue.text}`,
  );
  return blocks.length === 0 ? "" : `${blocks.join("\n\n")}\n`;
}
