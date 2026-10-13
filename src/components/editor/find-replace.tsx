"use client";

import { useMemo, useState } from "react";
import { Repeat, Search } from "react-feather";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { countMatches } from "@/lib/replace";

type Props = {
  /** The lyrics, to say how many matches there are while the search is typed. */
  text: string;
  disabled: boolean;
  onReplace: (find: string, replacement: string) => void;
};

/**
 * Find a word and swap every one of them for another, from the bottom left
 * of the editor. An empty "Replace with" takes the word out. See
 * `replace.ts` for what counts as a match.
 */
export function FindReplace({ text, disabled, onReplace }: Props) {
  const [find, setFind] = useState("");
  const [replacement, setReplacement] = useState("");
  const count = useMemo(() => countMatches(text, find), [text, find]);
  const searching = find.trim() !== "";

  return (
    <form
      aria-label="Find and replace"
      onSubmit={(event) => {
        // Enter in either box does the same as the button.
        event.preventDefault();
        if (!disabled && count > 0) onReplace(find, replacement);
      }}
      className="flex flex-wrap items-center gap-2"
    >
      <div className="relative">
        <Search
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 transform-none text-muted-foreground"
        />
        <Input
          value={find}
          onChange={(event) => setFind(event.target.value)}
          placeholder="Find"
          aria-label="Find"
          autoComplete="off"
          spellCheck={false}
          disabled={disabled}
          className="w-36 bg-background pl-8"
        />
      </div>
      <Input
        value={replacement}
        onChange={(event) => setReplacement(event.target.value)}
        placeholder="Replace with"
        aria-label="Replace with"
        autoComplete="off"
        spellCheck={false}
        disabled={disabled}
        className="w-36 bg-background"
      />
      <Button type="submit" variant="outline" disabled={disabled || count === 0}>
        <Repeat aria-hidden />
        Replace all
      </Button>
      {/* Says how many there are before anything is changed. */}
      <p
        aria-live="polite"
        className="text-xs text-muted-foreground tabular-nums"
      >
        {searching
          ? count === 0
            ? "No matches"
            : `${count} ${count === 1 ? "match" : "matches"}`
          : ""}
      </p>
    </form>
  );
}
