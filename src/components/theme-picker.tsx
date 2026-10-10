"use client";

import { useRef } from "react";
import { Radio } from "@base-ui/react/radio";
import { RadioGroup } from "@base-ui/react/radio-group";
import { Monitor, Moon, Sun } from "react-feather";
import { useTheme } from "next-themes";

import { cn } from "@/lib/utils";

const OPTIONS = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
] as const;

type Theme = (typeof OPTIONS)[number]["value"];
type Resolved = "light" | "dark";
type Point = { x: number; y: number };

/** How long the new theme takes to spread across the page. */
const REVEAL_DURATION = 550;
const REVEAL_EASING = "cubic-bezier(0.4, 0, 0.2, 1)";
/** Crossfade length for browsers without the View Transitions API. */
const FADE_DURATION = 350;
/** Reveals still playing: quick switches overlap, and the last one tidies up. */
let reveals = 0;

/**
 * Light / dark / system as one row of choices. The new theme is revealed by
 * a circle that grows out of the spot that was clicked. Only render it on the
 * client (in a dialog, say): the saved theme isn't known during hydration.
 */
export function ThemePicker({
  className,
  "aria-labelledby": labelledBy,
}: {
  className?: string;
  "aria-labelledby"?: string;
}) {
  const { theme, resolvedTheme, systemTheme, setTheme } = useTheme();
  const groupRef = useRef<HTMLDivElement>(null);

  function choose(next: Theme, origin: Point) {
    const resolved = next === "system" ? systemTheme : next;
    if (!resolved || resolved === resolvedTheme) {
      // Nothing visible changes (say, "System" while the OS is already dark).
      setTheme(next);
      return;
    }
    switchTheme(resolved, () => setTheme(next), origin);
  }

  return (
    <RadioGroup
      ref={groupRef}
      value={theme ?? "system"}
      onValueChange={(value, details) =>
        choose(value as Theme, pointOf(details.event, groupRef.current))
      }
      aria-labelledby={labelledBy}
      className={cn("grid grid-cols-3 gap-1 rounded-lg bg-muted p-1", className)}
    >
      {OPTIONS.map((option) => (
        <Radio.Root
          key={option.value}
          value={option.value}
          className="flex cursor-pointer items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-sm font-medium text-muted-foreground transition-colors outline-none select-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring data-checked:bg-background data-checked:text-foreground data-checked:shadow-xs dark:data-checked:bg-input/60 [&_svg]:size-4 [&_svg]:shrink-0"
        >
          <option.icon aria-hidden />
          {option.label}
        </Radio.Root>
      ))}
    </RadioGroup>
  );
}

/**
 * Where the reveal starts: the pointer, or the middle of the picker when the
 * choice was made from the keyboard.
 */
function pointOf(event: Event, picker: HTMLElement | null): Point {
  if (event instanceof MouseEvent && (event.clientX !== 0 || event.clientY !== 0)) {
    return { x: event.clientX, y: event.clientY };
  }
  const rect = picker?.getBoundingClientRect();
  return rect
    ? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
    : { x: window.innerWidth / 2, y: window.innerHeight / 2 };
}

/**
 * Flips the document to `next` and calls `persist` so next-themes stores the
 * choice (it re-applies the same class, which changes nothing on screen).
 */
function switchTheme(next: Resolved, persist: () => void, origin: Point) {
  const root = document.documentElement;
  const reduceMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;

  if (reduceMotion) {
    flip(next);
    persist();
    return;
  }

  if (typeof document.startViewTransition !== "function") {
    root.classList.add("theme-fading");
    setThemeClass(next);
    persist();
    window.setTimeout(
      () => root.classList.remove("theme-fading"),
      FADE_DURATION + 50,
    );
    return;
  }

  const { x, y } = origin;
  const radius = Math.hypot(
    Math.max(x, window.innerWidth - x),
    Math.max(y, window.innerHeight - y),
  );
  // Set before the old theme's picture is taken, so the blur behind the
  // dialog is in it (see globals.css).
  reveals += 1;
  root.classList.add("theme-revealing");
  const transition = document.startViewTransition(() => {
    flip(next);
    persist();
  });
  const settle = () => {
    reveals -= 1;
    if (reveals > 0) return;
    withoutTransitions(() => root.classList.remove("theme-revealing"));
  };
  transition.finished.then(settle, settle);
  transition.ready
    .then(() =>
      root.animate(
        {
          clipPath: [
            `circle(0px at ${x}px ${y}px)`,
            `circle(${radius}px at ${x}px ${y}px)`,
          ],
        },
        {
          duration: REVEAL_DURATION,
          easing: REVEAL_EASING,
          pseudoElement: "::view-transition-new(root)",
        },
      ),
    )
    .catch(() => {
      // The transition was skipped (another one started); the theme is set.
    });
}

function setThemeClass(next: Resolved) {
  const root = document.documentElement;
  root.classList.remove("light", "dark");
  root.classList.add(next);
  root.style.colorScheme = next;
}

/** Changes the theme in one step. */
function flip(next: Resolved) {
  withoutTransitions(() => setThemeClass(next));
}

/** Makes a style change with every CSS transition suppressed. */
function withoutTransitions(change: () => void) {
  const root = document.documentElement;
  root.classList.add("theme-switching");
  change();
  // Force a full style pass while transitions are off, so nothing eases
  // between the old and new styles afterwards.
  void root.offsetHeight;
  root.classList.remove("theme-switching");
}
