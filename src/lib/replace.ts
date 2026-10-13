/**
 * Find and replace for the lyrics editor. It only looks at the lyrics
 * themselves: time tags and metadata lines such as `[ar: Artist]` are never
 * matched, so a search for "12" can't damage `[00:12.40]`.
 */

import { tokenizeLrcLine, type TransformResult } from "@/lib/lrc";

/** What counts as the inside of a word. Apostrophes do: "don" isn't in "don't". */
const WORD_CHAR = String.raw`[\p{L}\p{N}'’]`;
const LETTER_OR_DIGIT = /[\p{L}\p{N}]/u;

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * The pattern for a search. Where the search begins or ends with a letter or
 * a digit it has to meet the edge of a word there, so "ya" doesn't match
 * inside "yard"; a search such as "…" or "in'" is free at that end.
 * The first group is the character before the match, to be put back.
 */
function patternFor(term: string, matchCase: boolean): RegExp {
  const first = term[0];
  const last = term[term.length - 1];
  const before = LETTER_OR_DIGIT.test(first) ? `(^|[^\\p{L}\\p{N}'’])` : "()";
  const after = LETTER_OR_DIGIT.test(last) ? `(?!${WORD_CHAR})` : "";
  return new RegExp(
    before + escapeRegExp(term) + after,
    matchCase ? "gu" : "giu",
  );
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function isUpperCase(letter: string): boolean {
  return letter !== letter.toLowerCase() && letter === letter.toUpperCase();
}

/**
 * Runs a search over every lyric in `text`. `replace` is given each match,
 * with whether its line is written in capitals and whether it is the first
 * word of its line, and returns what to put in its place. `tidy` closes the
 * gaps left behind when words are taken out altogether.
 */
function run(
  text: string,
  find: string,
  matchCase: boolean,
  replace: (found: string, shouted: boolean, opensLine: boolean) => string,
  tidy = false,
): TransformResult {
  const term = find.trim();
  if (term === "") return { text, count: 0 };
  const pattern = patternFor(term, matchCase);
  let count = 0;

  const lines = text.split("\n").map((line) => {
    const tokens = tokenizeLrcLine(line);
    const words = tokens
      .filter((token) => token.kind === "text")
      .map((token) => token.text)
      .join("");
    const shouted = /\p{Lu}/u.test(words) && !/\p{Ll}/u.test(words);
    /** Whether a word has already gone by on this line. */
    let started = false;

    return tokens
      .map((token) => {
        if (token.kind !== "text") return token.text;
        const startedBefore = started;
        started ||= LETTER_OR_DIGIT.test(token.text);
        const replaced = token.text.replace(
          pattern,
          (match: string, lead: string, offset: number) => {
            count += 1;
            const earlier = token.text.slice(0, offset) + lead;
            const opensLine = !startedBefore && !LETTER_OR_DIGIT.test(earlier);
            return lead + replace(match.slice(lead.length), shouted, opensLine);
          },
        );
        if (!tidy || replaced === token.text) return replaced;
        // No doubled spaces, and none at an end that had none before.
        let words = replaced.replace(/ {2,}/g, " ");
        if (!token.text.startsWith(" ")) words = words.replace(/^ +/, "");
        if (!token.text.endsWith(" ")) words = words.replace(/ +$/, "");
        return words;
      })
      .join("");
  });

  return { text: lines.join("\n"), count };
}

/** How many times `find` appears in the lyrics. */
export function countMatches(text: string, find: string): number {
  return run(text, find, false, (found) => found).count;
}

/**
 * Replaces every `find` in the lyrics with `replacement`, whatever its case,
 * and fits the replacement to its surroundings: in capitals on a line that is
 * all capitals, and with a capital where it now opens a line that did.
 *
 * When the two differ only in case ("The" to "the"), that is the whole point
 * of the change, so only exact matches are replaced, exactly as typed.
 */
export function replaceWords(
  text: string,
  find: string,
  replacement: string,
): TransformResult {
  const term = find.trim();
  if (term.toLowerCase() === replacement.toLowerCase()) {
    return run(text, term, true, () => replacement);
  }

  return run(
    text,
    term,
    false,
    (found, shouted, opensLine) => {
      if (shouted) return replacement.toUpperCase();
      if (opensLine && isUpperCase(found.charAt(0))) {
        return capitalize(replacement);
      }
      return replacement;
    },
    replacement === "",
  );
}
