"use client";

import { useRef, type MouseEvent } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
/** Apply a choice this long after it is made, even if the menu never reports closing. */
const CLOSE_GRACE = 400;

/**
 * Light / dark / system picker. The choice is applied once the menu has
 * closed, revealed by a circle that grows out of the spot that was clicked.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const { theme, resolvedTheme, systemTheme, setTheme } = useTheme();
  const pending = useRef<{ theme: Theme; origin: Point } | null>(null);
  const fallback = useRef<number | null>(null);

  function choose(next: Theme, origin: Point) {
    pending.current = { theme: next, origin };
    // Normally applied from onOpenChangeComplete; the timer covers a close
    // animation that never reports completion.
    window.clearTimeout(fallback.current ?? undefined);
    fallback.current = window.setTimeout(applyPending, CLOSE_GRACE);
  }

  function applyPending() {
    window.clearTimeout(fallback.current ?? undefined);
    fallback.current = null;
    const request = pending.current;
    pending.current = null;
    if (!request) return;
    const next = request.theme === "system" ? systemTheme : request.theme;
    if (!next || next === resolvedTheme) {
      // Nothing visible changes (say, "System" while the OS is already dark).
      setTheme(request.theme);
      return;
    }
    switchTheme(next, () => setTheme(request.theme), request.origin);
  }

  return (
    <DropdownMenu
      onOpenChangeComplete={(open) => {
        if (!open) applyPending();
      }}
    >
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Change theme"
            className={cn("relative", className)}
          />
        }
      >
        <Sun className="size-4 scale-100 rotate-0 transition-transform duration-300 dark:scale-0 dark:-rotate-90" />
        <Moon className="absolute size-4 scale-0 rotate-90 transition-transform duration-300 dark:scale-100 dark:rotate-0" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-36">
        <DropdownMenuRadioGroup value={theme ?? "system"}>
          {OPTIONS.map((option) => (
            <DropdownMenuRadioItem
              key={option.value}
              value={option.value}
              closeOnClick
              onClick={(event) => choose(option.value, pointOf(event))}
            >
              <option.icon className="text-muted-foreground" />
              {option.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Where the reveal starts: the pointer, or the item itself for keyboard use. */
function pointOf(event: MouseEvent<HTMLElement>): Point {
  const { clientX, clientY } = event;
  if (
    Number.isFinite(clientX) &&
    Number.isFinite(clientY) &&
    (clientX !== 0 || clientY !== 0)
  ) {
    return { x: clientX, y: clientY };
  }
  const rect = event.currentTarget.getBoundingClientRect();
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
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
  const transition = document.startViewTransition(() => {
    flip(next);
    persist();
  });
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

/** Changes the theme in one step, with every CSS transition suppressed. */
function flip(next: Resolved) {
  const root = document.documentElement;
  root.classList.add("theme-switching");
  setThemeClass(next);
  // Force a full style pass while transitions are off, so nothing eases
  // between the old and new colours afterwards.
  void root.offsetHeight;
  root.classList.remove("theme-switching");
}
