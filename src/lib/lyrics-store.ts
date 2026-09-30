/**
 * Tiny external store shared by the editor and the synchronizer.
 *
 * Everything here lives in memory only. The lyrics and the audio file survive
 * client-side navigation between the two pages, but closing or reloading the
 * site starts over with a blank editor.
 */

import { useSyncExternalStore } from "react";

type Listener = () => void;
const listeners = new Set<Listener>();

let lyricsText = "";
/** How the lyrics were written before a case change; null when unchanged. */
let originalCase: string | null = null;

// Earlier versions kept the lyrics in localStorage. Clear what they left.
if (typeof window !== "undefined") {
  try {
    window.localStorage.removeItem("lrc.notnick.io:lyrics");
    window.localStorage.removeItem("lrc.notnick.io:original-case");
  } catch {
    // Storage may be unavailable, in which case nothing was kept there.
  }
}

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function readText(): string {
  return lyricsText;
}

export function setLyricsText(next: string) {
  if (next === lyricsText) return;
  lyricsText = next;
  emit();
}

export function useLyricsText(): string {
  return useSyncExternalStore(subscribe, readText, () => "");
}

function readOriginalCase(): string | null {
  return originalCase;
}

/** Remembers how the lyrics were written before a case change. */
export function setOriginalCase(next: string | null) {
  if (next === originalCase) return;
  originalCase = next;
  emit();
}

export function useOriginalCase(): string | null {
  return useSyncExternalStore(subscribe, readOriginalCase, () => null);
}

/** False during server render and hydration, true once the client store is live. */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}

export type AudioSource = {
  file: File;
  /** Object URL for the file. Revoked when the file is replaced. */
  url: string;
  name: string;
};

let audioSource: AudioSource | null = null;

export function setAudioFile(file: File | null) {
  if (audioSource) URL.revokeObjectURL(audioSource.url);
  audioSource = file
    ? { file, url: URL.createObjectURL(file), name: file.name }
    : null;
  emit();
}

export function useAudioSource(): AudioSource | null {
  return useSyncExternalStore(
    subscribe,
    () => audioSource,
    () => null,
  );
}
