/**
 * Preferences set in the Settings dialog. They are saved in localStorage like
 * the synchronizer's volume and countdown, so they outlast a visit.
 */

/** Where next-themes saves the theme: "light", "dark" or "system". */
export const THEME_KEY = "lrc.notnick.io:theme";

/** The saved theme; "system" when nothing is saved or storage can't be read. */
export function readTheme(): "light" | "dark" | "system" {
  try {
    const stored = window.localStorage.getItem(THEME_KEY);
    if (stored === "light" || stored === "dark") return stored;
  } catch {
    // Storage may be unavailable, and then the theme follows the device.
  }
  return "system";
}

/** Where the "Keyboard shortcuts" switch is saved, as JSON `true` or `false`. */
export const SHORTCUTS_KEY = "lrc.notnick.io:shortcuts";

/**
 * Whether the synchronizer's single-key shortcuts are on, which they are
 * unless someone switched them off. People who use speech input need that
 * switch: stray words would otherwise stamp lines and pause the song.
 */
export function areShortcutsEnabled(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(SHORTCUTS_KEY) !== "false";
  } catch {
    return true;
  }
}

const SETTINGS_EVENT = "lrc.notnick.io:settings";

/** Tells the rest of the page that a setting was just saved. */
export function announceSettingsChange() {
  window.dispatchEvent(new Event(SETTINGS_EVENT));
}

/** For `useSyncExternalStore`: a setting saved on this page or in another tab. */
export function subscribeToSettings(listener: () => void) {
  window.addEventListener(SETTINGS_EVENT, listener);
  window.addEventListener("storage", listener);
  return () => {
    window.removeEventListener(SETTINGS_EVENT, listener);
    window.removeEventListener("storage", listener);
  };
}

/** Where the "Log" switch is saved, as JSON `true` or `false`. On until it's switched off. */
export const LOG_KEY = "lrc.notnick.io:log";

/**
 * Whether logging is on for this visitor, which it is unless they switched it
 * off. Anything that logs from the browser checks this first and stays quiet
 * when it's false (see `report-download.ts`). Always true on the server,
 * which can't see the setting.
 */
export function isLoggingEnabled(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(LOG_KEY) !== "false";
  } catch {
    return true;
  }
}
