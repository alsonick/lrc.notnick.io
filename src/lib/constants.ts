export const FULL_NAME = "Nicholas Njoki";

export const SITE_NAME = "LRC Generator";
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "https://lrc.notnick.io";
export const SITE_TITLE = "LRC Generator – Free Online LRC Generator";
export const SITE_DESCRIPTION =
  "A browser-based LRC generator for synced lyrics.";
export const THEME_COLOR = "#30d158";

/**
 * How long a toast that offers Undo stays up. Longer than the rest, so there
 * is time to read it and reach the button, by pointer or by keyboard.
 */
export const UNDO_TOAST_MS = 10_000;
