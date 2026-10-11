"use client";

import { useEffect, useSyncExternalStore } from "react";

import {
  currentDecoration,
  showDecoration,
  type DecorationChoice,
} from "@/lib/decorations";
import {
  areDecorationsEnabled,
  decorationOpacity,
  subscribeToSettings,
} from "@/lib/settings";

/**
 * Draws the decoration over the whole site: pumpkins in October, snow in
 * December, or whichever one was picked in the settings or asked for with
 * `?decoration=`. Nothing is drawn while decorations are switched off.
 */
export function SeasonalDecoration() {
  const enabled = useSyncExternalStore(
    subscribeToSettings,
    areDecorationsEnabled,
    () => true,
  );
  const opacity = useSyncExternalStore(
    subscribeToSettings,
    decorationOpacity,
    () => 1,
  );
  const decoration = useSyncExternalStore(
    subscribeToSettings,
    currentDecoration,
    () => "none" as DecorationChoice,
  );

  useEffect(() => {
    showDecoration(enabled ? decoration : "none");
  }, [decoration, enabled]);

  // The slider in the settings; globals.css applies it to both overlays.
  useEffect(() => {
    document.documentElement.style.setProperty(
      "--decoration-opacity",
      String(opacity),
    );
  }, [opacity]);

  return null;
}
