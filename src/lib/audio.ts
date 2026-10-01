/**
 * Decoding a whole file holds every sample in memory (about 85 MB for four
 * minutes of stereo), so past this size the length comes from the file's own
 * header instead.
 */
const DECODE_LIMIT_BYTES = 50 * 1024 * 1024;

/** How long to wait for the browser to read a file's header. */
const METADATA_TIMEOUT_MS = 10_000;

/** True for a file the browser should treat as audio. */
export function isAudioFile(file: File): boolean {
  return (
    file.type.startsWith("audio/") ||
    /\.(mp3|m4a|aac|wav|ogg|oga|opus|flac|weba|aiff?)$/i.test(file.name)
  );
}

/**
 * The length of an audio file in seconds, or null if the browser can't read
 * it. Decoding counts every sample, which is exact even for MP3s without a
 * length header, where players only estimate from the bitrate.
 */
export async function measureAudioDuration(file: File): Promise<number | null> {
  if (file.size <= DECODE_LIMIT_BYTES) {
    try {
      // An offline context decodes without a click or a sound device.
      const context = new OfflineAudioContext(1, 1, 44_100);
      const buffer = await context.decodeAudioData(await file.arrayBuffer());
      if (buffer.duration > 0) return buffer.duration;
    } catch {
      // Web Audio can't decode it; the media element may still read it.
    }
  }
  return headerDuration(file);
}

/** The length the file states about itself, as an <audio> element reads it. */
function headerDuration(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const audio = new Audio();
    let settled = false;
    const finish = (seconds: number | null) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeout);
      URL.revokeObjectURL(url);
      audio.removeAttribute("src");
      resolve(seconds !== null && Number.isFinite(seconds) && seconds > 0 ? seconds : null);
    };
    const timeout = window.setTimeout(() => finish(null), METADATA_TIMEOUT_MS);
    audio.preload = "metadata";
    audio.onloadedmetadata = () => finish(audio.duration);
    audio.onerror = () => finish(null);
    audio.src = url;
  });
}
