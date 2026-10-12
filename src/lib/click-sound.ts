/**
 * The click played when moving between pages (`public/click.mp3`). See
 * `navigation-sound.tsx` for when it plays, and the Sound setting for the
 * switch and the volume.
 */

import { clickVolume, isClickSoundEnabled } from "@/lib/settings";

const CLICK_SRC = "/click.mp3";

let context: AudioContext | null = null;
let buffer: AudioBuffer | null = null;
let loading: Promise<void> | null = null;

/**
 * Fetches and decodes the click ahead of time, so the first one isn't late.
 * Decoding doesn't need a playing context, so this can run before anyone has
 * touched the page.
 */
export function prepareClick(): Promise<void> {
  loading ??= (async () => {
    try {
      const response = await fetch(CLICK_SRC);
      const bytes = await response.arrayBuffer();
      buffer = await new OfflineAudioContext(1, 1, 44_100).decodeAudioData(
        bytes,
      );
    } catch {
      // No sound, then. Navigation carries on without it.
    }
  })();
  return loading;
}

/**
 * Starts the audio context. Browsers only allow that from inside a click or
 * a key press, so this is called on the first one; after it, a click can be
 * played at any moment, such as when a page change finishes.
 */
export function unlockClick() {
  try {
    context ??= new AudioContext();
    if (context.state === "suspended") void context.resume();
  } catch {
    // Web Audio is optional.
  }
}

/** A click that can't start within this long of being asked for is dropped. */
const LATE_MS = 300;

/**
 * Plays the click at the volume from the settings, unless sound is switched
 * off there. `force` plays it regardless, for the settings' own preview.
 */
export function playClick({ force = false }: { force?: boolean } = {}) {
  if (!force && !isClickSoundEnabled()) return;
  unlockClick();
  const audio = context;
  const sound = buffer;
  if (!audio || !sound) {
    // Not decoded yet: have it ready for next time rather than play it late.
    void prepareClick();
    return;
  }
  const start = () => {
    try {
      const source = audio.createBufferSource();
      const gain = audio.createGain();
      source.buffer = sound;
      gain.gain.value = clickVolume();
      source.connect(gain).connect(audio.destination);
      source.start();
    } catch {
      // Web Audio is optional.
    }
  };
  if (audio.state === "running") {
    start();
    return;
  }
  // Safari is still waking the context up on the first click. Wait for it,
  // but not for long: a click that turns up late is worse than none.
  const asked = performance.now();
  audio.resume().then(
    () => {
      if (performance.now() - asked < LATE_MS) start();
    },
    () => {},
  );
}
