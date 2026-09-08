# LRC Generator

Make timed `.lrc` lyric files in the browser: paste the lyrics, play the song,
tap a key as each line starts, download the file.
Live at [lrc.notnick.io](https://lrc.notnick.io).

Everything runs client-side. Lyrics are saved to localStorage; the audio file
stays in memory and is never uploaded.

## Editor

Paste lyrics from Genius or anywhere else, then tidy them with the toolbar:

- **Strip sections** removes `[Verse 1]`, `[Chorus]` and other headers, plus
  the leftovers Genius adds when copying.
- **Strip tags** removes existing `[mm:ss.xx]` time tags and metadata lines.
- **lowercase** / **UPPERCASE** change the case. **Original** restores the
  pasted casing.
- **Reset** clears the editor.

Each of these shows a toast with an Undo button.

Below the text: **Copy**, **Download .lrc** (once something is synced) and
**Synchronize**. Pasting an existing `.lrc` works; its timestamps are kept.

## Synchronize

- **Audio** loads a file. Without one, START runs a stopwatch so you can sync
  to music playing elsewhere.
- **START** begins playback, after the countdown picked in the dropdown beside
  it. The button becomes the running clock; click it to pause and it reads
  **Continue**.
- **Next Line** stamps the current line. The dropdown beside it shifts every
  stamp earlier by that amount, for anyone who tends to press late.
- While paused, click the dot in front of a stamped line to clear it and every
  line after it. With a file loaded, playback rewinds two seconds before that
  line.
- While paused, click a line's text to edit it. Click anywhere else, or
  Continue, to keep the change; `Esc` cancels. Timestamps are kept.
- Stamping the last line stops playback and downloads the `.lrc`, named after
  the audio file. **Save .lrc** downloads it again any time.
- **Editor** goes back to the editor with every stamp intact.

Keep the `.lrc` next to the audio with the same file name and most players
pick it up.

### Keyboard

| Key | Action |
| --- | --- |
| `Enter`, `Space`, `↓`, `→` | Next line (or start / continue) |
| `Backspace`, `↑`, `←` | Undo last line |
| `P` | Play / pause |

### Output

```
[00:12.40]I've been walking down this road
[00:15.92]Looking for a place to call my own
```

Blank lines show as spacing in the synchronizer and are left out of the file.

## Running locally

```bash
pnpm install
pnpm dev
```

Then open http://localhost:3000. `pnpm build` and `pnpm start` serve the
production build; `pnpm lint` runs ESLint.

## Stack

Next.js 16 (App Router), React 19, Tailwind CSS 4, shadcn/ui on Base UI,
next-themes, sonner and lucide. LRC parsing lives in `src/lib/lrc.ts`, the
shared lyrics store in `src/lib/lyrics-store.ts`, and the audio / stopwatch
clock in `src/hooks/use-clock.ts`.
