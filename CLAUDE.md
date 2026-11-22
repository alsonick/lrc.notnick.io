# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

pnpm only (`packageManager` is pinned in package.json; Node 20.19+).

```bash
pnpm install              # also runs `prisma generate` (postinstall)
pnpm dev                  # http://localhost:3000
pnpm build                # prisma generate && next build
pnpm lint                 # ESLint (flat config, eslint-config-next)
pnpm exec tsc --noEmit    # typecheck; there is no script for it
pnpm prisma migrate deploy  # create tables once DATABASE_URL is set
```

There is no test suite. Verify changes with lint, the typecheck and by running the app.

The Prisma client is generated into `src/generated/prisma` (gitignored) and imported as `@/generated/prisma/client`. If imports from it fail, run `pnpm prisma generate`. `prisma.config.ts` reads `.env.local`, then `.env`, as Next does.

All env vars are optional (see `.env.example`); the app runs fully with none of them set.

## What this is

LRC Generator (lrc.notnick.io): paste lyrics, play a song, press a key at the start of each line to stamp it, then download `.lrc` and/or `.srt`. Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4, shadcn/ui on Base UI, Prisma 7 on Postgres.

Nearly everything runs in the browser. The privacy promise (README, `/privacy`) is that lyrics and audio never leave the browser. Don't add anything that sends or persists them. If you change what is logged, update `src/app/privacy/page.tsx` to match.

## Architecture

### Shared in-memory state (`src/lib/lyrics-store.ts`)

A module-level external store (read through `useSyncExternalStore`) holds the lyrics text, the pre-case-change "original" text, and the loaded audio file (an object URL, plus its duration once decoded). It is **deliberately not persisted**: it survives client-side navigation between `/` and `/sync`, but a reload starts blank. That is why `UnsavedLyricsGuard` adds a `beforeunload` prompt. Older versions kept lyrics in localStorage, and the store clears those keys on load.

### Lyrics model (`src/lib/lrc.ts`)

The editor text is the source of truth. Each line may start with `[mm:ss.xx]` tags. `parseLyrics` turns it into `LyricLine[]` (`{ text, time }`) and `serializeLyrics` turns it back. Note that `parseLyrics` keeps **only the first** leading tag on a line. Metadata lines (`[ar: …]`, `[offset: …]`) and blank lines are never stamped (`isLyric`). The cleanup transforms (`stripSections`, `stripTags`, `stripParentheses`, `changeCase`) return `{ text, count }`, and the editor offers Undo through a toast (`UNDO_TOAST_MS`).

### Editor → Synchronize flow

- `/` renders `components/editor/lyrics-editor.tsx`, which reads and writes the store directly.
- `/sync` renders `SyncPage`, which waits for `useHydrated()` before mounting `Synchronizer`, so its initial state comes from the real store and not the empty server snapshot.
- `Synchronizer` owns `LyricLine[]` state and mirrors every change back into the store with `serializeLyrics`, so stamps survive going back to the editor.
- `SyncSession` (the bulk of the sync UI) is keyed by the audio URL. Loading a new file remounts it, which resets the clock and countdown while the lines keep their stamps.
- Keyboard shortcuts are window-level listeners in `sync-session.tsx`. An `isTyping` guard leaves inputs, dialogs, open comboboxes and keyboard-focused buttons alone. Shortcuts can be switched off in Settings (`areShortcutsEnabled`), for speech-input users.

### Clock (`src/hooks/use-clock.ts`)

One `Clock` interface over either an `<audio>` element or a stopwatch (for music playing elsewhere). `clock.position` only updates on pause, seek or end. Use `clock.now()` inside event handlers, and `useClockTime(clock)` (which updates every animation frame) only in small leaf components, so the whole page doesn't re-render at 60fps.

### Edit panel (`src/components/export/`)

`ExportPanel` shows the `.lrc` (left) and the `.srt` (right) as editable text in `CodeEditor`. It works on **raw text** (`buildLrcFileFromText`, `findLrcIssues`, `parseSrt`), not on `LyricLine[]`. The SRT is derived from the LRC (`lrcToSrtCues` in `src/lib/srt.ts`) until it is edited by hand; after that it is independent text. The panel opens from two places:
- the sync page's `FinishDialog` (Done → Edit);
- the header's Upload button (`EditFileButton`), which opens an existing `.lrc` and, optionally, its audio. This path never touches the editor store.

The last subtitle ends at the song's exact length, which `src/lib/audio.ts` measures by decoding the file. Without audio it falls back to `LAST_CUE_SECONDS`.

### Server side

The server code is small, and every part of it degrades when unconfigured:
- `src/lib/db.ts` exports `db`, which is `null` without `DATABASE_URL`. Every caller must handle null. `Count` is a single row (`COUNT_ID = 1`), seeded by the first migration. Increment it with the `countRequest(client)` transaction helper.
- `/api/log` and `/api/count`: the browser calls `reportDownload()` (`src/lib/report-download.ts`) on every saved file. This is fire-and-forget with `keepalive`. When the visitor has turned logging off (`isLoggingEnabled()`), it posts only a bare `/api/count`. Otherwise `/api/log` stores a `Download` row and increments `Count` in one transaction, and posts to the `LOGGING` Discord webhook. The request shape lives in `src/lib/session-log.ts` and is shared by client and server: change `SessionLog`, `validateSessionLog` and `buildSessionLogPayload` together.
- The Discord bot (LRC-Generator-Bot, its own repo) writes to the same database: a `Download` row with `source: discord` and one more on `Count` for each file it converts. It keeps a copy of `prisma/schema.prisma` but never migrates, so migrations stay here: deploy them before the bot relies on them, and copy schema changes over to it. It also posts each conversion to the `LOGGING` webhook, worded like `buildSessionLogPayload`; the privacy page's "Discord Bot" section describes both.
- `/api/feedback` and `/api/reviews` forward to Discord webhooks. Both check `isDiscordWebhookUrl`, reply 204 to honeypot submissions without sending anything, and disable mentions in the payload.
- `/usage` is a server component that reads the count with `revalidate = 60`.

### Client settings and persistence

- All localStorage keys are prefixed `lrc.notnick.io:`.
- `src/lib/settings.ts` holds the readers for the Settings dialog (theme, shortcuts, decorations, click sound, logging). They are SSR-safe and wrapped in try/catch, and default to **on** unless the stored value is `"false"`.
- A write must call `announceSettingsChange()`. Readers subscribe through `useSyncExternalStore(subscribeToSettings, …)`, which also picks up changes from other tabs.
- Per-component preferences (volume, countdown, anticipation, split position) use `usePersistedState`. It reads synchronously, so use it only in components that render after hydration.

## Conventions

- **UI primitives are Base UI, not Radix** (shadcn style `base-nova`). Compose with the `render` prop (`<DialogClose render={<Button variant="outline" />}>`), not `asChild`.
- Icons come from `react-feather`, even though `components.json` says lucide.
- Tailwind 4 is configured in `src/app/globals.css` (there is no tailwind config file). Use the `bg-canvas` page token and the `--ease-spring` easing. Some global CSS targets `.app-shell`, the layout wrapper.
- `/` and `/sync` are desktop-only: `DesktopOnly` in `mobile-notice.tsx` hides them below `sm` with CSS. Every other page must work at phone width.
- Page metadata outside the home page sets `description: null` (so it doesn't inherit the home description), a `canonical`, and an `openGraph.url`.
- Comments and UI copy are plain, non-technical English, and comments explain why. Match that tone.
- Commits use `feat:` / `fix:` / `chore:` prefixes. Features land through PR branches.
