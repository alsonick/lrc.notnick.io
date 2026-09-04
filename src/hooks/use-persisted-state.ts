"use client";

import { useCallback, useState } from "react";

/**
 * `useState` backed by localStorage. Only use it in components that render on
 * the client after hydration, because the initial value is read synchronously.
 */
export function usePersistedState<T>(
  key: string,
  initial: T,
): [T, (value: T) => void] {
  const [value, setValue] = useState<T>(() => {
    if (typeof window === "undefined") return initial;
    try {
      const raw = window.localStorage.getItem(key);
      return raw === null ? initial : (JSON.parse(raw) as T);
    } catch {
      return initial;
    }
  });

  const set = useCallback(
    (next: T) => {
      setValue(next);
      try {
        window.localStorage.setItem(key, JSON.stringify(next));
      } catch {
        // Ignore storage failures.
      }
    },
    [key],
  );

  return [value, set];
}
