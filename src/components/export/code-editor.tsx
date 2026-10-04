"use client";

import {
  memo,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  type Ref,
} from "react";

import { cn } from "@/lib/utils";

/** A run of characters in a line and how to colour it. */
export type CodeToken = { text: string; className?: string };

/**
 * Colours one line. `kind` and `issue` are the line's entries in `kinds` and
 * `issues`. The tokens must join back into exactly the line, and only colour
 * and decoration may vary, or the two layers drift apart.
 */
export type Tokenize = (
  line: string,
  kind: string | undefined,
  issue: string | undefined,
) => CodeToken[];

export type CodeEditorHandle = {
  textarea: HTMLTextAreaElement | null;
  /** Puts the caret at the start of a line and scrolls it to the middle. */
  revealLine: (line: number) => void;
  /**
   * Swaps in new text as a single edit the textarea can undo. The caret stays
   * on its line and the view where it was, unless `caretLine` moves both.
   */
  replaceText: (text: string, caretLine?: number) => void;
};

type Props = {
  ref?: Ref<CodeEditorHandle>;
  value: string;
  onChange: (value: string) => void;
  /** Must keep its identity between renders, or every line re-renders. */
  tokenize: Tokenize;
  /** What each line is, by index, for `tokenize`. */
  kinds?: readonly string[];
  /** Lines to flag, by index. */
  issues: ReadonlyMap<number, string>;
  /** The line with the caret, which gets a highlight. -1 for none. */
  activeLine: number;
  onActiveLineChange: (line: number) => void;
  /**
   * Lines tinted to show what a neighbouring editor's caret is on. They are
   * scrolled into view whenever they change.
   */
  linked?: { from: number; to: number } | null;
  onFocus?: () => void;
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
 * Scrolls `scroller` so the rows `from`..`to` sit in the middle, unless they
 * are already in full view. It moves the box itself; scrollIntoView could
 * move the page behind too.
 */
function showRows(scroller: HTMLElement, from: number, to: number, always = false) {
  const first = scroller.querySelector<HTMLElement>(`[data-line="${from}"]`);
  const last = scroller.querySelector<HTMLElement>(`[data-line="${to}"]`);
  if (!first || !last) return;
  const base = scroller.getBoundingClientRect().top - scroller.scrollTop;
  const top = first.getBoundingClientRect().top - base;
  const bottom = last.getBoundingClientRect().bottom - base;
  const visible =
    top >= scroller.scrollTop &&
    bottom <= scroller.scrollTop + scroller.clientHeight;
  if (visible && !always) return;
  const centred = (top + bottom) / 2 - scroller.clientHeight / 2;
  scroller.scrollTo({ top: Math.max(0, centred), behavior: "smooth" });
}

/**
 * A plain textarea with syntax highlighting, line numbers and markers for
 * lines that need a look. The textarea's own text is transparent and sits
 * over a coloured copy in a one-cell grid, so typing, selection, undo and IME
 * all stay native. The copy sets the height and the outer box scrolls both.
 */
export function CodeEditor({
  ref,
  value,
  onChange,
  tokenize,
  kinds,
  issues,
  activeLine,
  onActiveLineChange,
  linked = null,
  onFocus,
  placeholder,
  "aria-label": ariaLabel,
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lines = useMemo(() => value.split("\n"), [value]);
  const linkedFrom = linked?.from;
  const linkedTo = linked?.to;

  useEffect(() => {
    const scroller = scrollRef.current;
    if (!scroller || linkedFrom === undefined || linkedTo === undefined) return;
    showRows(scroller, linkedFrom, linkedTo);
  }, [linkedFrom, linkedTo]);

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
        showRows(scroller, target, target, true);
      },
      replaceText(text, caretLine) {
        const textarea = textareaRef.current;
        const scroller = scrollRef.current;
        if (!textarea || !scroller) return;
        const { scrollTop } = scroller;
        const line =
          caretLine ?? lineAt(textarea.value, textarea.selectionStart);
        textarea.focus({ preventScroll: true });
        textarea.select();
        // Setting the value would wipe the textarea's undo history;
        // execCommand records the swap there, so Cmd+Z brings the edits back.
        if (!document.execCommand("insertText", false, text)) onChange(text);
        const caret = offsetOfLine(text, line);
        const target = lineAt(text, caret);
        textarea.setSelectionRange(caret, caret);
        onActiveLineChange(target);
        // The browser scrolls to wherever the insert ended; stay put instead.
        scroller.scrollTop = scrollTop;
        if (caretLine !== undefined) {
          // The rows only match the new text after the next render.
          requestAnimationFrame(() => showRows(scroller, target, target));
        }
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
              kind={kinds?.[index]}
              issue={issues.get(index)}
              active={index === activeLine}
              linked={
                linked !== null && index >= linked.from && index <= linked.to
              }
              tokenize={tokenize}
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
          onFocus={onFocus}
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
  kind,
  issue,
  active,
  linked,
  tokenize,
}: {
  index: number;
  text: string;
  kind: string | undefined;
  issue: string | undefined;
  active: boolean;
  linked: boolean;
  tokenize: Tokenize;
}) {
  return (
    <div
      data-line={index}
      className={cn(
        "flex",
        active && "bg-foreground/5",
        linked && "bg-primary/10",
      )}
    >
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
            "\u200b"
          : tokenize(text, kind, issue).map((token, i) => (
              <span key={i} className={token.className}>
                {token.text}
              </span>
            ))}
      </span>
    </div>
  );
});
