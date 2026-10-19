/**
 * Where playback goes when a line is undone in the synchronizer, so the song
 * picks up somewhere that makes sense for the line now waiting to be stamped.
 */

import type { LyricLine } from "@/lib/lrc";

/** How far playback goes back before an undone line, at most. */
export const REWIND_SECONDS = 2;

/**
 * Where to play from once the line at `lineIndex`, stamped at `stamp`, and
 * every line after it have been undone, with the song now at `position`.
 *
 * A little before that line, to give time to get ready for it, but never
 * further back than the line before it. That one keeps its stamp and becomes
 * the current line, so the song should pick up there at the earliest: on a
 * quick song a fixed rewind reaches back into the line before that, and the
 * music replays a line that's already done while the lyrics wait on the
 * next. Nor ever forward, which would skip part of the song.
 */
export function rewindPoint(
  lines: readonly LyricLine[],
  lineIndex: number,
  stamp: number,
  position: number,
): number {
  let earliest = 0;
  for (let index = lineIndex - 1; index >= 0; index -= 1) {
    const time = lines[index].time;
    if (time === null) continue;
    // A line before it stamped later than it (the anticipation was raised
    // in between, say) is no guide, so then only the usual rewind applies.
    if (time < stamp) earliest = time;
    break;
  }
  return Math.min(position, Math.max(earliest, stamp - REWIND_SECONDS));
}
