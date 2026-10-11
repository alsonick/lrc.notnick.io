/**
 * Decorations: pumpkins falling through October and snow through December,
 * or whichever one is picked in the settings at any time of year.
 * `?decoration=halloween` or `?decoration=christmas` shows one for a visit.
 * See `seasonal-decoration.tsx` for where they are drawn.
 */

import { announceSettingsChange } from "@/lib/settings";

export type Decoration = "halloween" | "christmas";
/** What the picker in the settings offers. None is the Decorations switch, off. */
export type DecorationChoice = Decoration | "none";

/** Where a pick made in the settings is saved. */
const PICK_KEY = "lrc.notnick.io:decoration";

function isDecoration(value: unknown): value is Decoration {
  return value === "halloween" || value === "christmas";
}

/** What the calendar alone calls for. */
export function monthDecoration(date: Date): DecorationChoice {
  const month = date.getMonth() + 1;
  if (month === 10) return "halloween";
  if (month === 12) return "christmas";
  return "none";
}

function prefersLessMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * What shows when nobody has picked anything. People who asked their device
 * for less motion get nothing until they pick a decoration themselves.
 */
function defaultDecoration(): DecorationChoice {
  return prefersLessMotion() ? "none" : monthDecoration(new Date());
}

function savedPick(): Decoration | null {
  try {
    const saved = window.localStorage.getItem(PICK_KEY);
    return isDecoration(saved) ? saved : null;
  } catch {
    return null;
  }
}

function savePick(choice: Decoration | null) {
  try {
    if (choice === null) window.localStorage.removeItem(PICK_KEY);
    else window.localStorage.setItem(PICK_KEY, choice);
  } catch {
    // Without storage the pick still holds until the page is closed.
  }
}

let current: DecorationChoice | undefined;

/**
 * The decoration for this visit. Decided once, then kept, so one that came
 * from the address carries on across pages whose address no longer has it.
 * The address comes first, then a pick saved from the settings, then the
 * calendar.
 */
export function currentDecoration(): DecorationChoice {
  if (current === undefined) {
    const fallback = defaultDecoration();
    let saved = savedPick();
    // A pick the calendar has caught up with is no longer a pick: forgetting
    // it lets the next season's decoration arrive without being asked for.
    if (saved === fallback) {
      savePick(null);
      saved = null;
    }
    const query = new URLSearchParams(window.location.search).get("decoration");
    // An address can't start motion for someone who asked for less of it.
    const asked = !prefersLessMotion() && isDecoration(query) ? query : null;
    current = asked ?? saved ?? fallback;
  }
  return current;
}

/** A pick made in the settings: shown at once, and saved for next time. */
export function pickDecoration(choice: Decoration) {
  current = choice;
  savePick(choice === defaultDecoration() ? null : choice);
  announceSettingsChange();
}

/**
 * How long a decoration takes to fade away. It fades in over the same time
 * and on the same curve (see globals.css), so one swapped for the other is an
 * even crossfade.
 */
const FADE_MS = 600;
/** Overlays on their way out, by id, with the timer that will remove them. */
const leaving = new Map<string, number>();

/** Fades an overlay out, then takes it off the page. */
function fadeOut(id: string, after?: () => void) {
  const overlay = document.getElementById(id);
  if (!overlay) {
    after?.();
    return;
  }
  if (leaving.has(id)) return;
  overlay.setAttribute("data-leaving", "");
  leaving.set(
    id,
    window.setTimeout(() => {
      leaving.delete(id);
      overlay.remove();
      after?.();
    }, FADE_MS),
  );
}

/** Whether the overlay is on the page, calling it back if it was fading out. */
function keep(id: string): boolean {
  const overlay = document.getElementById(id);
  if (!overlay) return false;
  const timer = leaving.get(id);
  if (timer !== undefined) {
    window.clearTimeout(timer);
    leaving.delete(id);
    overlay.removeAttribute("data-leaving");
  }
  return true;
}

const CONTAINER_ID = "pumpkins";
const MAX_PUMPKINS = 30;
const MIN_PUMPKINS = 12;

function randomInRange(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

/** Styled by `#pumpkins` in globals.css. */
const pumpkins = () => {
  // Only the first call builds the overlay, so the pumpkins keep falling
  // undisturbed across navigations.
  if (keep(CONTAINER_ID)) return;

  const container = document.createElement("div");
  container.id = CONTAINER_ID;
  container.setAttribute("aria-hidden", "true");

  // Fewer on a narrow screen, where the full set would crowd out the text.
  const count = Math.min(
    MAX_PUMPKINS,
    Math.max(MIN_PUMPKINS, Math.round(window.innerWidth / 40)),
  );

  for (let i = 0; i < count; i++) {
    const pumpkin = document.createElement("span");
    pumpkin.textContent = "🎃";
    pumpkin.style.fontSize = `${randomInRange(14, 30).toFixed(0)}px`;
    pumpkin.style.opacity = randomInRange(0.4, 1).toFixed(2);
    pumpkin.style.animationDuration = `${randomInRange(10, 30).toFixed(1)}s`;
    // A negative delay starts each pumpkin part-way down, so the screen is
    // already full rather than waiting for the first ones to fall in.
    pumpkin.style.animationDelay = `-${randomInRange(0, 30).toFixed(1)}s`;
    pumpkin.style.setProperty("--x", `${randomInRange(0, 100).toFixed(2)}vw`);
    pumpkin.style.setProperty(
      "--drift",
      `${randomInRange(-10, 10).toFixed(2)}vw`,
    );
    pumpkin.style.setProperty(
      "--spin",
      `${randomInRange(-180, 180).toFixed(0)}deg`,
    );
    container.appendChild(pumpkin);
  }

  document.body.appendChild(container);
};

function removePumpkins() {
  fadeOut(CONTAINER_ID);
}

const SNOW_SRC = "https://app.embed.im/snow.js";
/** The id that script gives the overlay it builds. */
const SNOW_ID = "embedim--snow";
/** Long enough for a slow connection; after this the old decoration stops waiting. */
const SNOW_WAIT_MS = 5000;
let snowWanted = false;

/**
 * Fetches the snow script ahead of time, without running it, so that picking
 * Christmas a moment later doesn't have to wait for the network.
 */
export function prepareSnow() {
  if (
    document.getElementById(SNOW_ID) ||
    document.querySelector(`link[href="${SNOW_SRC}"], script[src="${SNOW_SRC}"]`)
  ) {
    return;
  }
  const link = document.createElement("link");
  link.rel = "preload";
  link.as = "script";
  link.href = SNOW_SRC;
  document.head.appendChild(link);
}

/**
 * Loads Embed.im's snow, which draws its own overlay as soon as it runs.
 * `onReady` is called once the snow is on the page, or isn't going to be.
 */
function snow(onReady: () => void) {
  snowWanted = true;
  if (keep(SNOW_ID)) {
    onReady();
    return;
  }
  let script = document.querySelector<HTMLScriptElement>(
    `script[src="${SNOW_SRC}"]`,
  );
  if (!script) {
    script = document.createElement("script");
    script.src = SNOW_SRC;
    script.defer = true;
    // It may arrive after the snow was switched off again.
    script.addEventListener("load", () => {
      if (!snowWanted) removeSnow();
    });
    document.body.appendChild(script);
  }
  let told = false;
  const ready = () => {
    if (told) return;
    told = true;
    window.clearTimeout(timer);
    onReady();
  };
  const timer = window.setTimeout(ready, SNOW_WAIT_MS);
  script.addEventListener("load", ready, { once: true });
  script.addEventListener("error", ready, { once: true });
}

function removeSnow() {
  snowWanted = false;
  fadeOut(SNOW_ID, () => {
    // Without its tag the script can be loaded, and so run, again later.
    if (!snowWanted) {
      document.querySelector(`script[src="${SNOW_SRC}"]`)?.remove();
    }
  });
}

let showing: DecorationChoice = "none";

/**
 * Puts one decoration on the page and fades out the other. The old one only
 * starts to leave once the new one has arrived, so the page is never left
 * bare in between while the snow script loads.
 */
export function showDecoration(choice: DecorationChoice) {
  showing = choice;
  if (choice === "halloween") {
    pumpkins();
    removeSnow();
  } else if (choice === "christmas") {
    snow(() => {
      // Unless something else was picked while it loaded.
      if (showing === "christmas") removePumpkins();
    });
  } else {
    removePumpkins();
    removeSnow();
  }
}
