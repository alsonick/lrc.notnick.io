/**
 * Tiny external store shared by the editor and the synchronizer.
 *
 * The lyrics text is persisted to localStorage so a refresh never loses work.
 * The audio file only lives in memory (a File cannot be persisted cheaply),
 * but it survives client-side navigation between the two pages.
 */

import { useSyncExternalStore } from "react";

const TEXT_KEY = "lrc.notnick.io:lyrics";
const ORIGINAL_KEY = "lrc.notnick.io:original-case";

type Listener = () => void;
const listeners = new Set<Listener>();

let textCache: string | null = null;
/** `undefined` until first read; `null` when nothing is stored. */
let originalCache: string | null | undefined;

function emit() {
  for (const listener of listeners) listener();
}

function onStorage(event: StorageEvent) {
  if (event.key === TEXT_KEY) {
    textCache = event.newValue ?? "";
  } else if (event.key === ORIGINAL_KEY) {
    originalCache = event.newValue;
  } else {
    return;
  }
  emit();
}

function subscribe(listener: Listener) {
  if (listeners.size === 0) window.addEventListener("storage", onStorage);
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) window.removeEventListener("storage", onStorage);
  };
}

function readText(): string {
  if (textCache === null) {
    try {
      textCache = window.localStorage.getItem(TEXT_KEY) ?? "";
    } catch {
      textCache = "";
    }
  }
  return textCache;
}

export function setLyricsText(next: string) {
  if (next === readText()) return;
  textCache = next;
  try {
    window.localStorage.setItem(TEXT_KEY, next);
  } catch {
    // Storage may be unavailable (private mode, quota). Keep going in memory.
  }
  emit();
}

export function useLyricsText(): string {
  return useSyncExternalStore(subscribe, readText, () => "");
}

function readOriginalCase(): string | null {
  if (originalCache === undefined) {
    try {
      originalCache = window.localStorage.getItem(ORIGINAL_KEY);
    } catch {
      originalCache = null;
    }
  }
  return originalCache;
}

/** Remembers how the lyrics were written before a case change. */
export function setOriginalCase(next: string | null) {
  if (next === readOriginalCase()) return;
  originalCache = next;
  try {
    if (next === null) window.localStorage.removeItem(ORIGINAL_KEY);
    else window.localStorage.setItem(ORIGINAL_KEY, next);
  } catch {
    // Storage may be unavailable. Keep going in memory.
  }
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
