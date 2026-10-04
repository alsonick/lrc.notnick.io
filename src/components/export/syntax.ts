import type { CodeToken, Tokenize } from "@/components/export/code-editor";
import { tokenizeLrcLine, type LrcToken } from "@/lib/lrc";
import {
  tokenizeSrtLine,
  type SrtLineKind,
  type SrtToken,
} from "@/lib/srt";
import { cn } from "@/lib/utils";

/*
 * How the export panel's two editors colour their files. Only colour and
 * decoration: anything that changed a glyph's width would pull the coloured
 * text out from under the caret.
 */

/** Green for times, darker in light mode so it stays readable on white. */
const TIME = "text-green-700 dark:text-primary";
const MUTED = "text-muted-foreground/70";
const WARNING = "text-amber-600 dark:text-amber-400";
const SQUIGGLE =
  "underline decoration-amber-500 decoration-wavy decoration-1 underline-offset-[5px]";

const LRC_CLASS: Record<LrcToken["kind"], string | undefined> = {
  text: undefined,
  bracket: MUTED,
  time: TIME,
  word: "text-green-700/70 dark:text-primary/70",
  meta: "text-sky-700 dark:text-sky-400",
};

/** `issue` is an `LrcIssue` kind: the stamp or the lyric gets the squiggle. */
export const lrcSyntax: Tokenize = (line, _kind, issue) =>
  tokenizeLrcLine(line).map(
    (token): CodeToken => ({
      text: token.text,
      className: cn(
        LRC_CLASS[token.kind],
        issue === "order" && token.kind === "time" && [SQUIGGLE, WARNING],
        issue === "untimed" && token.kind === "text" && SQUIGGLE,
      ),
    }),
  );

const SRT_CLASS: Record<SrtToken["kind"], string | undefined> = {
  text: undefined,
  index: MUTED,
  time: TIME,
  arrow: MUTED,
  bad: SQUIGGLE,
};

/** `kind` is an `SrtLineKind`. A flagged time range turns amber. */
export const srtSyntax: Tokenize = (line, kind, issue) =>
  tokenizeSrtLine(line, (kind ?? "text") as SrtLineKind).map(
    (token): CodeToken => ({
      text: token.text,
      className: cn(
        SRT_CLASS[token.kind],
        issue && token.kind === "time" && [SQUIGGLE, WARNING],
      ),
    }),
  );
