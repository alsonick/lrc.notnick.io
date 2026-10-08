# LRC Generator

Make timed `.lrc` lyric files in the browser: paste the lyrics, play the song,
tap a key as each line starts, download the file.
Live at [lrc.notnick.io](https://lrc.notnick.io).

Everything runs client-side. Lyrics are kept in memory only, so closing or
reloading the site starts with a blank editor. The audio file stays in memory
too and is never uploaded. The one thing that leaves the browser is a short
log entry each time a file is downloaded, which anyone can switch off (see
[Settings](#settings)).

## Editor

Paste lyrics from Genius or anywhere else, then tidy them with the toolbar:

- **Strip sections** removes `[Verse 1]`, `[Chorus]` and other headers, plus
  the leftovers Genius adds when copying.
- **Strip tags** removes existing `[mm:ss.xx]` time tags and metadata lines.
- **Strip parentheses** removes asides such as `(Let's go)` and drops lines
  that were nothing but one.
- **lowercase** / **UPPERCASE** change the case. **Original** restores the
  pasted casing.
- **Reset** clears the editor.

Each of these shows a toast with an Undo button.

Below the text: **Copy**, **Download .lrc** (once something is synced) and
**Synchronize**. Pasting an existing `.lrc` works; its timestamps are kept,
and metadata lines such as `[ar: Artist]` are never stamped.

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
- Once every line is stamped, Next Line reads **Done**. Click it to stop and
  choose: **Edit** opens the file for a last look (see below), and **Cancel**
  downloads the `.lrc` as it is. Files are named after the audio file.
  **Save .lrc** downloads the `.lrc` again any time.
- **Editor** goes back to the editor with every stamp intact.

Keep the `.lrc` next to the audio with the same file name and most players
pick it up.

### Edit

A panel slides in from the right with the `.lrc` and the `.srt` it converts to
side by side, both as editable text with their time tags highlighted.

- Lines without a timestamp, and timestamps earlier than the line above, are
  marked. The footer explains the one under the caret and **Next** / **Show**
  walks through the rest, for whichever side you're working in.
- The caret on one side tints the matching lines on the other. **Revert**
  undoes every edit made to the `.lrc` since the panel opened (and
  `Cmd/Ctrl+Z` undoes the revert).
- The subtitles follow the `.lrc` until you edit them. From then on they are
  their own text: press Enter for a second row in a subtitle, change its
  times, or **Add** a new one after the caret (it starts where that one ends,
  or shares its time when the next follows with no gap). Changes to the `.lrc`
  no longer reach them until **Revert** on that side rebuilds them from it.
- Blocks that can't become a subtitle (an unreadable time range, an end before
  the start, no text, text without a time range) are marked and left out.
- **Download as LRC** saves the text as it is, minus blank lines.
- **Download as SRT** saves the subtitles, numbered afresh. Hand edits to them
  live only in the panel, so closing before downloading them asks first.
- When converting from the `.lrc`, each subtitle lasts until the next line
  starts; a timestamp on its own line, like `[01:02.00]`, ends the one before
  it early; the last one stays up until the song ends when the audio is known
  (loaded in the synchronizer, or added in the **Upload** dialog), and for five
  seconds when it isn't. The length is measured by decoding the audio, which is
  exact even for MP3s whose header only lets players estimate it. Untimed lines
  are left out, `[offset: …]` is applied, and a line with several timestamps
  becomes one subtitle per timestamp.
- Closing the panel keeps the edits in the lyrics, with a toast to undo them.
- **Upload** in the header opens an existing `.lrc` on any page, without
  syncing anything first. The song's audio can be added there too; it's
  optional, but recommended so the last subtitle runs until the song ends.
  An uploaded file stands on its own: downloads are named after it, its edits
  only go into them, and the lyrics in the editor stay as they are.

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

The same lines as `.srt`:

```
1
00:00:12,400 --> 00:00:15,920
I've been walking down this road

2
00:00:15,920 --> 00:00:20,920
Looking for a place to call my own
```

## Settings

The gear in the header opens the settings, which apply as they're changed and
are saved in the browser. **Done** confirms with a toast when any were changed.

- **Theme**: light, dark, or whatever the device is set to.
- **Log**: the download log, on until it's switched off. While it's on, every
  download of an `.lrc` or `.srt` reports:
  - which of the two was saved, and how many of each so far in this visit;
  - the saved file's name, how many lyric lines or subtitles it holds, and
    whether it was changed in the Edit panel first;
  - where the lyrics came from: synced in the app, saved from the editor, or
    an uploaded `.lrc`;
  - the audio file's name and length, if one was loaded (that is what lets the
    last subtitle end with the song);
  - the theme;
  - how long the page had been open;
  - the browser (its user agent, as feedback also sends), its language, and
    the host name of the site that linked here, if any.

  The lyrics and the audio themselves are never sent. Anything else that logs
  from the browser should check `isLoggingEnabled()` in `src/lib/settings.ts`
  first, as `src/lib/report-download.ts` does.

**Privacy Policy** in the footer, and the link in the Log switch's hint, open
the privacy policy at `/privacy`. It summarises what the log sends, so update
`src/app/privacy/page.tsx` (and its dates) whenever that changes.

## Running locally

```bash
pnpm install
pnpm dev
```

Then open http://localhost:3000. `pnpm build` and `pnpm start` serve the
production build; `pnpm lint` runs ESLint.

The **Feedback** button in the header posts to a Discord webhook. Copy
`.env.example` to `.env.local` and set `DISCORD_WEBHOOK_URL` (Discord: Server
Settings > Integrations > Webhooks > New Webhook). Without it the form shows
"Feedback isn't set up on this server yet."

The download log (see [Settings](#settings)) posts to a webhook of its own:
set `LOGGING` the same way, ideally to a different channel. Without it nothing
is logged.

## Stack

Next.js 16 (App Router), React 19, Tailwind CSS 4, shadcn/ui on Base UI,
next-themes, sonner and lucide. LRC parsing lives in `src/lib/lrc.ts`, SRT
conversion in `src/lib/srt.ts`, the shared lyrics store in
`src/lib/lyrics-store.ts`, the audio / stopwatch clock in
`src/hooks/use-clock.ts`, and the download log in `src/lib/session-log.ts`.
