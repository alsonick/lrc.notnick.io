"use client";

import {
  memo,
  useImperativeHandle,
  useMemo,
  useRef,
  type Ref,
} from "react";

import {
  tokenizeLrcLine,
  type LrcIssue,
  type LrcToken,
} from "@/lib/lrc";
import { cn } from "@/lib/utils";

export type LrcCodeEditorHandle = {
  textarea: HTMLTextAreaElement | null;
  /** Puts the caret at the start of a line and scrolls it to the middle. */
  revealLine: (line: number) => void;
  /**
   * Swaps in new text as a single edit the textarea can undo, keeping the
   * caret on the same line and the view where it was.
   */
  replaceText: (text: string) => void;
};

type Props = {
  ref?: Ref<LrcCodeEditorHandle>;
  value: string;
  onChange: (value: string) => void;
  /** Lines to flag, by index. */
  issues: ReadonlyMap<number, LrcIssue["kind"]>;
  /** The line with the caret, which gets a highlight. */
  activeLine: number;
  onActiveLineChange: (line: number) => void;
  placeholder?: string;
  "aria-label"?: string;
};

/**
 * Both layers must lay text out identically, so only colour and decoration
 * may differ between them. Ligatures and kerning are off because the coloured
 * layer splits the text into spans and could otherwise shape it differently.
 */
const TEXT_CLASS =
  "font-mono text-sm leading-6 whitespace-pre-wrap wrap-break-word [font-kerning:none] [font-variant-ligatures:none]";

const TOKEN_CLASS: Record<LrcToken["kind"], string | undefined> = {
  text: undefined,
  bracket: "text-muted-foreground/70",
  time: "text-green-700 dark:text-primary",
  word: "text-green-700/70 dark:text-primary/70",
  meta: "text-sky-700 dark:text-sky-400",
};

const SQUIGGLE =
  "underline decoration-amber-500 decoration-wavy decoration-1 underline-offset-[5px]";

/** Index of the line that `offset` falls on. */
function lineAt(text: string, offset: number): number {
  let line = 0;
  let newline = text.indexOf("\n");
  while (newline !== -1 && newline < offset) {
    line += 1;
    newline = text.indexOf("\n", newline + 1);
  }
  return line;
}

/** Where `line` starts in `text`, clamped to the last line. */
function offsetOfLine(text: string, line: number): number {
  let offset = 0;
  for (let current = 0; current < line; current += 1) {
    const next = text.indexOf("\n", offset);
    if (next === -1) break;
    offset = next + 1;
  }
  return offset;
}

/**
 * A plain textarea with LRC syntax highlighting, line numbers and markers
 * for lines that need a look. The textarea's own text is transparent and sits
 * over a coloured copy in a one-cell grid, so typing, selection, undo and IME
 * all stay native. The copy sets the height and the outer box scrolls both.
 */
export function LrcCodeEditor({
  ref,
  value,
  onChange,
  issues,
  activeLine,
  onActiveLineChange,
  placeholder,
  "aria-label": ariaLabel,
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lines = useMemo(() => value.split("\n"), [value]);

  useImperativeHandle(
    ref,
    () => ({
      get textarea() {
        return textareaRef.current;
      },
      revealLine(line) {
        const textarea = textareaRef.current;
        const scroller = scrollRef.current;
        if (!textarea || !scroller) return;
        const caret = offsetOfLine(textarea.value, line);
        const target = lineAt(textarea.value, caret);
        textarea.focus({ preventScroll: true });
        textarea.setSelectionRange(caret, caret);
        onActiveLineChange(target);
        const row = scroller.querySelector<HTMLElement>(
          `[data-line="${target}"]`,
        );
        if (!row) return;
        const top =
          row.getBoundingClientRect().top -
          scroller.getBoundingClientRect().top +
          scroller.scrollTop;
        const centred = top - scroller.clientHeight / 2 + row.offsetHeight / 2;
        scroller.scrollTo({ top: Math.max(0, centred), behavior: "smooth" });
      },
      replaceText(text) {
        const textarea = textareaRef.current;
        const scroller = scrollRef.current;
        if (!textarea || !scroller) return;
        const { scrollTop } = scroller;
        const line = lineAt(textarea.value, textarea.selectionStart);
        textarea.focus({ preventScroll: true });
        textarea.select();
        // Setting the value would wipe the textarea's undo history;
        // execCommand records the swap there, so Cmd+Z brings the edits back.
        if (!document.execCommand("insertText", false, text)) onChange(text);
        const caret = offsetOfLine(text, line);
        textarea.setSelectionRange(caret, caret);
        onActiveLineChange(lineAt(text, caret));
        // The browser scrolls to wherever the insert ended; stay put instead.
        scroller.scrollTop = scrollTop;
      },
    }),
    [onActiveLineChange, onChange],
  );

  /** Follows the caret (the end of a selection that's being extended). */
  function trackCaret(textarea: HTMLTextAreaElement) {
    const caret =
      textarea.selectionDirection === "backward"
        ? textarea.selectionStart
        : textarea.selectionEnd;
    const line = lineAt(textarea.value, caret);
    if (line !== activeLine) onActiveLineChange(line);
  }

  return (
    <div
      ref={scrollRef}
      className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain scrollbar-thin"
    >
      <div className="relative grid min-h-full grid-cols-1">
        {/* The gutter's background, full height even when the text is short. */}
        <div
          aria-hidden
          className="absolute inset-y-0 left-0 w-12 border-r bg-muted/50 dark:bg-muted/30"
        />
        <div
          aria-hidden
          className="pointer-events-none relative col-start-1 row-start-1 py-3 select-none"
        >
          {lines.map((line, index) => (
            <EditorRow
              key={index}
              index={index}
              text={line}
              active={index === activeLine}
              issue={issues.get(index)}
            />
          ))}
        </div>
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(event) => {
            onChange(event.target.value);
            trackCaret(event.target);
          }}
          onSelect={(event) => trackCaret(event.currentTarget)}
          placeholder={placeholder}
          aria-label={ariaLabel}
          spellCheck={false}
          autoCapitalize="off"
          autoComplete="off"
          autoCorrect="off"
          className={cn(
            TEXT_CLASS,
            "relative col-start-1 row-start-1 resize-none overflow-hidden bg-transparent py-3 pr-4 pl-15 text-transparent caret-foreground outline-none selection:bg-primary/25 selection:text-transparent placeholder:text-muted-foreground",
          )}
        />
      </div>
    </div>
  );
}

/**
 * One line of the coloured layer. Memoized so typing re-renders only the
 * line being edited (and the rows the caret leaves and enters).
 */
const EditorRow = memo(function EditorRow({
  index,
  text,
  active,
  issue,
}: {
  index: number;
  text: string;
  active: boolean;
  issue: LrcIssue["kind"] | undefined;
}) {
  return (
    <div data-line={index} className={cn("flex", active && "bg-foreground/5")}>
      <span
        className={cn(
          "relative w-12 shrink-0 pr-3 text-right font-mono text-xs leading-6 text-muted-foreground/60 tabular-nums",
          active && "text-foreground",
          issue && "text-amber-600 dark:text-amber-400",
        )}
      >
        {/* Level with the first line when a long line wraps. */}
        {issue ? (
          <span className="absolute top-3 left-1.5 size-1.5 -translate-y-1/2 rounded-full bg-amber-500" />
        ) : null}
        {index + 1}
      </span>
      <span className={cn(TEXT_CLASS, "min-w-0 flex-1 pr-4 pl-3")}>
        {text === ""
          ? // Keeps an empty line one line tall, like the textarea shows it.
            "​"
          : tokenizeLrcLine(text).map((token, i) => (
              <span
                key={i}
                className={cn(
                  TOKEN_CLASS[token.kind],
                  issue === "order" && token.kind === "time" && SQUIGGLE,
                  issue === "order" &&
                    token.kind === "time" &&
                    "text-amber-600 dark:text-amber-400",
                  issue === "untimed" && token.kind === "text" && SQUIGGLE,
                )}
              >
                {token.text}
              </span>
            ))}
      </span>
    </div>
  );
});
