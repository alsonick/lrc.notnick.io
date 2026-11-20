"use client";

import { useEffect, useState, type ComponentType, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  Clipboard,
  CornerUpLeft,
  Download,
  Edit3,
  Heart,
  HelpCircle,
  Music,
  Play,
  X,
  type Icon,
} from "react-feather";

import { EditFileButton } from "@/components/export/edit-file-button";
import { FeedbackDialog } from "@/components/feedback-dialog";
import { Keycap } from "@/components/keycap";
import { Logo } from "@/components/logo";
import { SettingsDialog } from "@/components/settings-dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { SITE_NAME } from "@/lib/constants";
import { social } from "@/lib/social-links";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "Editor", icon: Edit3 },
  { href: "/sync", label: "Synchronize", icon: Activity },
] as const;

/** Keeps the Upload, Help, Feedback, Support and settings buttons on the same shape as the links. */
const NAV_BUTTON_CLASS =
  "rounded-md text-neutral-300 hover:bg-white/10 hover:text-white dark:hover:bg-white/10";

export function SiteHeader() {
  return (
    // While a theme switch blurs the page (see globals.css) the bar's colour
    // carries on past the screen's edges, or the blur would fade them out.
    <header className="sticky top-0 z-40 border-b border-white/10 bg-neutral-900 text-white [--ring:#30d158] in-[.theme-revealing]:shadow-[0_-1rem_0_1rem_var(--color-neutral-900)]">
      <div className="mx-auto flex h-14 w-full max-w-5xl items-center gap-3 px-4 sm:gap-4">
        <Link
          href="/"
          aria-label={SITE_NAME}
          className="press-bounce flex shrink-0 items-center"
        >
          <Logo className="size-7" />
        </Link>
        <nav
          aria-label="Main"
          className="ml-auto flex items-center gap-0.5 sm:gap-1"
        >
          {NAV.map((item) => (
            <NavLink key={item.href} {...item} />
          ))}
          {/* The file editor needs a desktop-sized screen, like the editor. */}
          <EditFileButton className={cn(NAV_BUTTON_CLASS, "max-sm:hidden")} />
          <HelpDialog />
          <FeedbackDialog className={NAV_BUTTON_CLASS} />
          <a
            href={social.paypal.link}
            target="_blank"
            rel="noopener noreferrer"
            title={social.paypal.title}
            className={cn(buttonVariants({ variant: "ghost" }), NAV_BUTTON_CLASS)}
          >
            <Heart aria-hidden />
            <span className="sr-only sm:not-sr-only">Support</span>
          </a>
          <SettingsDialog
            className={cn(
              NAV_BUTTON_CLASS,
              "aria-expanded:bg-white/15 aria-expanded:text-white",
            )}
          />
        </nav>
      </div>
    </header>
  );
}

/** A link to one of the site's pages, tinted while that page is open. */
function NavLink({
  href,
  label,
  icon: LinkIcon,
}: {
  href: string;
  label: string;
  icon: Icon;
}) {
  const active = usePathname() === href;

  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "inline-flex min-h-9 items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm text-neutral-300 transition-colors hover:bg-white/10 hover:text-white sm:px-3 [&_svg]:size-4 [&_svg]:shrink-0",
        active && "bg-primary/15 text-primary hover:text-primary",
      )}
    >
      <LinkIcon aria-hidden />
      {/* Icons only on a phone, so the whole bar fits. */}
      <span className="sr-only sm:not-sr-only">{label}</span>
    </Link>
  );
}

type Step = {
  icon: ComponentType<{ className?: string }>;
  title: string;
  body: ReactNode;
};

const STEPS: Step[] = [
  {
    icon: Clipboard,
    title: "Paste your lyrics",
    body: (
      <>
        Copy them from anywhere and paste them in.{" "}
        <strong>Strip sections</strong> and <strong>Strip tags</strong> clear
        out headers like [Chorus] and any old time stamps.
      </>
    ),
  },
  {
    icon: Music,
    title: "Load your song",
    body: (
      <>
        Click <strong>Synchronize</strong>, then <strong>Audio</strong> to pick
        a file. No file? START runs a stopwatch so you can sync to music
        playing in another app.
      </>
    ),
  },
  {
    icon: Play,
    title: "Stamp each line",
    body: (
      <>
        Press <strong>START</strong>, then hit <strong>Next Line</strong> (or
        Space) as each line is sung. The dropdowns add a countdown or shift
        stamps a little earlier.
      </>
    ),
  },
  {
    icon: CornerUpLeft,
    title: "Fix a mistake",
    body: (
      <>
        Pause and click the dot in front of a line to clear it and the ones
        after it. Playback rewinds up to two seconds so you can try it again.
      </>
    ),
  },
  {
    icon: Download,
    title: "Save the file",
    body: (
      <>
        Hit <strong>Done</strong>, then <strong>Edit</strong> to polish and
        save as .lrc or .srt, or <strong>Cancel</strong> to download the .lrc.
        Give it your audio&apos;s name so players find it.
      </>
    ),
  },
];

const SHORTCUTS: { keys: string[]; action: string }[] = [
  { keys: ["Enter", "Space"], action: "Next line (or start)" },
  { keys: ["Backspace"], action: "Undo last line" },
  { keys: ["P"], action: "Play or pause" },
  { keys: ["↑", "↓"], action: "Undo / next line" },
];

/** The keycap in the list below that each key lights up. */
const SHORTCUT_KEYCAPS: Partial<Record<string, string>> = {
  Enter: "Enter",
  " ": "Space",
  Backspace: "Backspace",
  p: "P",
  P: "P",
  ArrowUp: "↑",
  ArrowDown: "↓",
};

/**
 * The shortcut list, whose keycaps sink while their key is held, as they do
 * on the sync page. The keys do nothing else here; it is only so people can
 * try them out.
 */
function ShortcutList() {
  const [pressed, setPressed] = useState<ReadonlySet<string>>(() => new Set());

  useEffect(() => {
    const setKeycapPressed = (key: string, down: boolean) => {
      const keycap = SHORTCUT_KEYCAPS[key];
      if (!keycap) return;
      setPressed((current) => {
        if (current.has(keycap) === down) return current;
        const next = new Set(current);
        if (down) next.add(keycap);
        else next.delete(keycap);
        return next;
      });
    };
    // The dialog opens with focus on its close button, so trying Enter or
    // Space would close it. Someone who opened the dialog from the keyboard,
    // or has moved around it with Tab, keeps those keys, so it can still be
    // worked without a mouse. (Checking each button for keyboard focus would
    // not do: any key press gives it keyboard focus.)
    let keyboardUser =
      document.activeElement?.matches(":focus-visible") ?? false;
    const swallow = (event: KeyboardEvent) => {
      const target = event.target instanceof Element ? event.target : null;
      return (
        !keyboardUser &&
        (event.key === "Enter" || event.key === " ") &&
        !!target?.closest("button")
      );
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Tab") keyboardUser = true;
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      setKeycapPressed(event.key, true);
      // Some browsers go back a page on Backspace, which would close the
      // dialog and leave the site.
      if (swallow(event) || event.key === "Backspace") event.preventDefault();
    };
    // Buttons act on Space when it is released, so that is held back too.
    const onKeyUp = (event: KeyboardEvent) => {
      setKeycapPressed(event.key, false);
      if (swallow(event)) event.preventDefault();
    };
    // A key released while the window is in the background never reports
    // its keyup, so let every keycap go when focus leaves.
    const onBlur = () => setPressed(new Set());
    // Listened for on the way down: the dialog stops the arrow keys before
    // they would bubble back up to the window.
    window.addEventListener("keydown", onKeyDown, true);
    window.addEventListener("keyup", onKeyUp, true);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onKeyDown, true);
      window.removeEventListener("keyup", onKeyUp, true);
      window.removeEventListener("blur", onBlur);
    };
  }, []);

  return (
    <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
      {SHORTCUTS.map((shortcut) => (
        <div
          key={shortcut.action}
          className="flex items-center justify-between gap-3"
        >
          <dt className="text-muted-foreground">{shortcut.action}</dt>
          <dd className="flex shrink-0 items-center gap-1">
            {shortcut.keys.map((key) => (
              <Keycap key={key} pressed={pressed.has(key)}>
                {key}
              </Keycap>
            ))}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function HelpDialog() {
  return (
    <Dialog>
      <DialogTrigger
        render={<Button variant="ghost" className={NAV_BUTTON_CLASS} />}
      >
        <HelpCircle aria-hidden />
        <span className="sr-only sm:not-sr-only">Help</span>
      </DialogTrigger>
      <DialogContent
        showCloseButton={false}
        className="max-h-[calc(100dvh-2rem)] gap-0 overflow-y-auto p-0 sm:max-w-xl"
      >
        {/* Rendered first so it is the initial focus target; otherwise the
            dialog scrolls down to the "Got it" button on open. */}
        <DialogClose
          render={
            <Button
              variant="ghost"
              size="icon-sm"
              className="absolute top-3 right-3"
            />
          }
        >
          <X aria-hidden />
          <span className="sr-only">Close</span>
        </DialogClose>
        <div className="border-b bg-muted/40 px-6 pt-5 pr-12 pb-4">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
                <Activity aria-hidden className="size-5" />
              </span>
              <DialogTitle className="text-lg">How to make an LRC file</DialogTitle>
            </div>
          </DialogHeader>
        </div>

        <ol className="space-y-4 px-6 py-5">
          {STEPS.map((step, index) => (
            <li key={step.title} className="flex gap-4">
              <span className="relative flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                <step.icon aria-hidden className="size-4" />
                <span
                  aria-hidden
                  className="absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground"
                >
                  {index + 1}
                </span>
              </span>
              <div className="space-y-1 pt-1">
                <p className="font-medium text-foreground">{step.title}</p>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {step.body}
                </p>
              </div>
            </li>
          ))}
        </ol>

        <div className="border-t bg-muted/40 px-6 py-4">
          <p className="mb-3 text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Keyboard shortcuts
          </p>
          <ShortcutList />
        </div>

        <div className="flex justify-end border-t px-6 py-4">
          <DialogClose render={<Button />}>Got it</DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  );
}
