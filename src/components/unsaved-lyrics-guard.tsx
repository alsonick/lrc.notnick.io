"use client";

import { useEffect } from "react";

import { useLyricsText } from "@/lib/lyrics-store";

/**
 * Lyrics only live in memory, so a reload or close would lose them. While
 * there are any, the browser asks first (in its own words: pages can't set
 * the message). Moving between the editor and the synchronizer is left alone.
 */
export function UnsavedLyricsGuard() {
  const hasLyrics = useLyricsText().trim() !== "";

  useEffect(() => {
    if (!hasLyrics) return;
    function onBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
      // Older browsers only ask when returnValue is set.
      event.returnValue = "";
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [hasLyrics]);

  return null;
}
