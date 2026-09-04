# LRC Generator

Make synchronized `.lrc` lyric files in the browser. Paste lyrics, play your
song, and stamp each line as it is sung.

Built with Next.js (App Router), React 19, Tailwind CSS 4 and shadcn/ui.

## Workflow

1. **Editor** (`/`): paste lyrics from anywhere. Use *Strip sections* to drop
   `[Verse 1]` / `[Chorus]` headers, *Strip tags* to remove existing time
   tags, and *lowercase* / *UPPERCASE* to change case. Every edit is saved to
   localStorage.
2. **Synchronize** (`/sync`): load an audio file with *Audio* (or use the
   built-in stopwatch and play the song elsewhere), press *START*, then press
   *Next Line* (or `Enter` / `Space`) each time a line begins. The START button
   turns into the running clock; click it to pause and it becomes *Continue*.
3. While paused, a dot appears before every stamped line. Click a dot to undo
   that line and everything after it; playback rewinds two seconds before it.
   `Backspace` undoes the last line.
4. Stamping the last line downloads the `.lrc` automatically, named after the
   audio file. *Save .lrc* downloads it again at any time.

The select next to *Next Line* is an anticipation offset subtracted from each
stamp; the select next to *START* is a countdown before playback begins.

## Development

```bash
pnpm install
pnpm dev
```

Then open http://localhost:3000. `pnpm build` produces a static production
build and `pnpm lint` runs ESLint.