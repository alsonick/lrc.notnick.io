"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type RefObject,
  type SyntheticEvent,
} from "react";

/**
 * Time source for synchronization. With an audio URL it drives an `<audio>`
 * element; without one it is a plain stopwatch so lyrics can be synced to
 * music playing somewhere else.
 */
export type Clock = {
  /**
   * Last known position in seconds. Updated when playback pauses, ends or
   * seeks, not every frame. Use `useClockTime` for a live value.
   */
  position: number;
  isPlaying: boolean;
  duration: number | null;
  /** Audio metadata loaded (always true in stopwatch mode). */
  ready: boolean;
  error: string | null;
  usingAudio: boolean;
  /** Exact current position, safe to call from event handlers. */
  now: () => number;
  play: () => Promise<void>;
  pause: () => void;
  seek: (seconds: number) => void;
  audioProps: {
    ref: RefObject<HTMLAudioElement | null>;
    onPlay: () => void;
    onPause: () => void;
    onEnded: () => void;
    onSeeked: () => void;
    onLoadedMetadata: (event: SyntheticEvent<HTMLAudioElement>) => void;
    onError: () => void;
  };
};

export function useClock(audioUrl: string | null): Clock {
  const usingAudio = audioUrl !== null;
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const stopwatch = useRef<{ base: number; startedAt: number | null }>({
    base: 0,
    startedAt: null,
  });

  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState<number | null>(null);
  const [ready, setReady] = useState(!usingAudio);
  const [error, setError] = useState<string | null>(null);

  const now = useCallback((): number => {
    if (usingAudio) return audioRef.current?.currentTime ?? 0;
    const { base, startedAt } = stopwatch.current;
    return startedAt === null
      ? base
      : base + (performance.now() - startedAt) / 1000;
  }, [usingAudio]);

  const play = useCallback(async () => {
    if (usingAudio) {
      const element = audioRef.current;
      if (!element) return;
      try {
        await element.play();
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Playback failed.");
      }
      return;
    }
    if (stopwatch.current.startedAt === null) {
      stopwatch.current.startedAt = performance.now();
    }
    setIsPlaying(true);
  }, [usingAudio]);

  const pause = useCallback(() => {
    if (usingAudio) {
      audioRef.current?.pause();
      return;
    }
    const watch = stopwatch.current;
    if (watch.startedAt !== null) {
      watch.base += (performance.now() - watch.startedAt) / 1000;
      watch.startedAt = null;
    }
    setIsPlaying(false);
    setPosition(watch.base);
  }, [usingAudio]);

  const seek = useCallback(
    (seconds: number) => {
      const target = Math.max(0, seconds);
      if (usingAudio) {
        const element = audioRef.current;
        if (!element) return;
        element.currentTime = Number.isFinite(element.duration)
          ? Math.min(target, element.duration)
          : target;
        setPosition(element.currentTime);
        return;
      }
      const watch = stopwatch.current;
      watch.base = target;
      if (watch.startedAt !== null) watch.startedAt = performance.now();
      setPosition(target);
    },
    [usingAudio],
  );

  const audioProps: Clock["audioProps"] = {
    ref: audioRef,
    onPlay: () => {
      setError(null);
      setIsPlaying(true);
    },
    onPause: () => {
      setIsPlaying(false);
      setPosition(now());
    },
    onEnded: () => {
      setIsPlaying(false);
      setPosition(now());
    },
    onSeeked: () => setPosition(now()),
    onLoadedMetadata: (event) => {
      setDuration(event.currentTarget.duration);
      setReady(true);
    },
    onError: () => {
      setReady(false);
      setError(
        "Your browser can't play this audio file. Try an MP3, or sync with the stopwatch instead.",
      );
    },
  };

  return {
    position,
    isPlaying,
    duration,
    ready,
    error,
    usingAudio,
    now,
    play,
    pause,
    seek,
    audioProps,
  };
}

/**
 * Live position that refreshes every animation frame while the clock runs.
 * Keep it in a small leaf component so the rest of the page does not
 * re-render 60 times a second.
 */
export function useClockTime(
  clock: Pick<Clock, "isPlaying" | "now" | "position">,
): number {
  const { isPlaying, now, position } = clock;
  const [live, setLive] = useState(position);

  useEffect(() => {
    if (!isPlaying) return;
    let frame = requestAnimationFrame(function tick() {
      setLive(now());
      frame = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(frame);
  }, [isPlaying, now]);

  return isPlaying ? live : position;
}
