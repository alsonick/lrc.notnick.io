"use client";

import {
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from "react";
import { cn } from "cn";

import { usePersistedState } from "@/hooks/use-persisted-state";

/** Where the first pane's share is saved, as a JSON number between 0 and 1. */
const SPLIT_KEY = "lrc.notnick.io:edit-split";

/** Tailwind's `lg`, from where the panes sit side by side instead of stacked. */
const SIDE_BY_SIDE = "(min-width: 64rem)";

/** The first pane's share until the divider is moved: 7 to 5. */
const DEFAULT_SPLIT = 7 / 12;

/** How far an arrow key moves the divider, as a share of the whole. */
const STEP = 0.05;

/**
 * The least room each pane gets, in rem: side by side, enough for its header
 * once the buttons are down to icons; stacked, the header and a few lines.
 * The grid holds to the widths too, so a split saved in a wider window can't
 * crush a pane in a narrower one.
 */
const MIN_WIDTH: [number, number] = [16, 26];
const MIN_HEIGHT: [number, number] = [8, 8];

function subscribe(listener: () => void) {
  const query = window.matchMedia(SIDE_BY_SIDE);
  query.addEventListener("change", listener);
  return () => query.removeEventListener("change", listener);
}

function isSideBySide() {
  return window.matchMedia(SIDE_BY_SIDE).matches;
}

/**
 * Two panes with a divider between them that drags, or moves with the arrow
 * keys, to share the room differently. Stacked on narrow screens and side by
 * side from `lg`. Double-clicking the divider puts it back.
 */
export function PaneSplit({
  label,
  controls,
  className,
  children: [first, second],
}: {
  /** Names the divider for screen readers. */
  label: string;
  /** The id of the first pane, which the divider sizes. */
  controls: string;
  className?: string;
  children: [ReactNode, ReactNode];
}) {
  const gridRef = useRef<HTMLDivElement>(null);
  const [saved, setSaved] = usePersistedState(SPLIT_KEY, DEFAULT_SPLIT);
  /** The share mid-drag, saved only on release; null when not dragging. */
  const [dragged, setDragged] = useState<number | null>(null);
  /** How far from the divider's middle it was grabbed, so it doesn't jump. */
  const grabOffset = useRef(0);
  const sideBySide = useSyncExternalStore(subscribe, isSideBySide, () => true);

  const split =
    dragged ??
    (typeof saved === "number" && saved > 0 && saved < 1
      ? saved
      : DEFAULT_SPLIT);

  /** `share` kept far enough from either end to leave each pane its minimum. */
  function clamp(share: number): number {
    const grid = gridRef.current;
    if (!grid) return share;
    const rem =
      parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
    const rect = grid.getBoundingClientRect();
    const size = sideBySide ? rect.width : rect.height;
    const [minFirst, minSecond] = sideBySide ? MIN_WIDTH : MIN_HEIGHT;
    const low = (minFirst * rem) / size;
    const high = 1 - (minSecond * rem) / size;
    // Too small to give both their minimum: leave the split as it is.
    if (low > high) return split;
    return Math.min(Math.max(share, low), high);
  }

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return;
    // No text selection starts under the pointer while it drags.
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    const handle = event.currentTarget.getBoundingClientRect();
    grabOffset.current = sideBySide
      ? event.clientX - (handle.left + handle.width / 2)
      : event.clientY - (handle.top + handle.height / 2);
    setDragged(split);
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    const grid = gridRef.current;
    if (!grid || !event.currentTarget.hasPointerCapture(event.pointerId)) {
      return;
    }
    const rect = grid.getBoundingClientRect();
    const share = sideBySide
      ? (event.clientX - grabOffset.current - rect.left) / rect.width
      : (event.clientY - grabOffset.current - rect.top) / rect.height;
    setDragged(clamp(share));
  }

  /** On release, or when the browser takes the pointer away. */
  function endDrag() {
    if (dragged === null) return;
    setSaved(dragged);
    setDragged(null);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const back = sideBySide ? "ArrowLeft" : "ArrowUp";
    const forward = sideBySide ? "ArrowRight" : "ArrowDown";
    let next: number;
    if (event.key === back) next = split - STEP;
    else if (event.key === forward) next = split + STEP;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = 1;
    else return;
    event.preventDefault();
    setSaved(clamp(next));
  }

  return (
    <div
      ref={gridRef}
      data-resizing={dragged !== null || undefined}
      style={
        {
          // In hundredths, not as shares of 1: once one pane is held at its
          // minimum, a grid counts the other's flex below 1 as 1, and fills
          // only part of what's left.
          "--first": `${split * 100}fr`,
          "--second": `${(1 - split) * 100}fr`,
          "--first-min": `${MIN_WIDTH[0]}rem`,
          "--second-min": `${MIN_WIDTH[1]}rem`,
        } as CSSProperties
      }
      className={cn(
        "group/split relative grid min-h-0 grid-rows-[minmax(0,var(--first))_minmax(0,var(--second))] lg:grid-cols-[minmax(var(--first-min),var(--first))_minmax(var(--second-min),var(--second))] lg:grid-rows-1",
        // The resize cursor holds over the editors too while dragging, which
        // would otherwise show their text cursor.
        "data-resizing:cursor-row-resize data-resizing:select-none data-resizing:**:cursor-[inherit] lg:data-resizing:cursor-col-resize",
        className,
      )}
    >
      {first}
      {/* Over the first pane's edge, half on either side of its border.
          Positioned in the first pane's cell, which leaves the panes' own
          placement alone. Both lines are given: an absolute item's missing
          end line is the grid's far edge, not the cell's. */}
      <div
        role="separator"
        tabIndex={0}
        aria-label={label}
        aria-controls={controls}
        aria-orientation={sideBySide ? "vertical" : "horizontal"}
        aria-valuenow={Math.round(split * 100)}
        aria-valuemin={0}
        aria-valuemax={100}
        title="Drag to resize. Double-click to reset."
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onLostPointerCapture={endDrag}
        onKeyDown={handleKeyDown}
        onDoubleClick={() => setSaved(DEFAULT_SPLIT)}
        className="group absolute right-0 bottom-0 left-0 z-10 col-start-1 col-end-2 row-start-1 row-end-2 flex h-2 translate-y-1/2 cursor-row-resize touch-none items-center justify-center outline-none select-none pointer-coarse:h-6 lg:top-0 lg:left-auto lg:h-auto lg:w-2 lg:translate-x-1/2 lg:translate-y-0 lg:cursor-col-resize lg:pointer-coarse:w-6"
      >
        {/* Lights up the whole edge while it's hovered, dragged or focused. */}
        <span
          aria-hidden
          className="absolute inset-x-0 top-1/2 h-0.5 -translate-y-1/2 bg-primary opacity-0 transition-opacity group-hover:opacity-100 group-hover:delay-150 group-focus-visible:opacity-100 group-data-resizing/split:opacity-100 motion-reduce:transition-none lg:inset-x-auto lg:inset-y-0 lg:left-1/2 lg:h-auto lg:w-0.5 lg:-translate-x-1/2 lg:translate-y-0"
        />
        {/* A grip, so the edge reads as something to drag. */}
        <span
          aria-hidden
          className="relative h-1 w-8 rounded-full bg-muted-foreground/40 transition-colors group-hover:bg-primary group-hover:delay-150 group-focus-visible:bg-primary group-data-resizing/split:bg-primary motion-reduce:transition-none lg:h-8 lg:w-1"
        />
      </div>
      {second}
    </div>
  );
}
