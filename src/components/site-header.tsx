"use client";

import type { ComponentType, ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  AudioLines,
  CircleHelp,
  ClipboardPaste,
  Download,
  FileAudio,
  Play,
  Undo2,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Kbd } from "@/components/ui/kbd";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "Editor" },
  { href: "/sync", label: "Synchronize" },
] as const;

export function SiteHeader() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-neutral-900 text-white">
      <div className="mx-auto flex h-14 w-full max-w-5xl items-center gap-4 px-4">
        <Link href="/" className="text-base font-semibold tracking-tight">
          <span className="text-primary">LRC</span> Generator
        </Link>
        <nav className="ml-auto flex items-center gap-1">
          {NAV.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm text-neutral-300 transition-colors hover:bg-white/10 hover:text-white",
                  active && "bg-primary/15 text-primary hover:text-primary",
                )}
              >
                {item.label}
              </Link>
            );
          })}
          <HelpDialog />
        </nav>
      </div>
    </header>
  );
}

type Step = {
  icon: ComponentType<{ className?: string }>;
  title: string;
  body: ReactNode;
};

const STEPS: Step[] = [
  {
    icon: ClipboardPaste,
    title: "Paste your lyrics",
    body: (
      <>
        Copy them from Genius or anywhere else. <strong>Strip sections</strong>{" "}
        removes headers like <code>[Verse 1]</code> and <code>[Chorus]</code>.
      </>
    ),
  },
  {
    icon: FileAudio,
    title: "Load your song",
    body: (
      <>
        Click <strong>Synchronize</strong>, then <strong>Audio</strong>. No
        file? START runs a stopwatch so you can sync to music playing
        elsewhere.
      </>
    ),
  },
  {
    icon: Play,
    title: "Stamp each line",
    body: (
      <>
        Press <strong>START</strong>, then hit <strong>Next Line</strong> the
        moment each line is sung. The button becomes the running clock; click
        it to pause. The dropdown beside Next Line shifts every stamp a little
        earlier, and the one beside START gives you a countdown.
      </>
    ),
  },
  {
    icon: Undo2,
    title: "Fix a mistake",
    body: (
      <>
        Pause and click the dot in front of a line to clear it and everything
        after it. Playback rewinds two seconds before that line so you can try
        again.
      </>
    ),
  },
  {
    icon: Download,
    title: "Save the file",
    body: (
      <>
        Stamping the last line downloads the .lrc automatically. Keep it next
        to your audio with the same file name so players pick it up.
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

function HelpDialog() {
  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button
            variant="ghost"
            size="sm"
            className="text-neutral-300 hover:bg-white/10 hover:text-white"
          />
        }
      >
        <CircleHelp />
        Help
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
          <X />
          <span className="sr-only">Close</span>
        </DialogClose>
        <div className="border-b bg-muted/40 px-6 pt-5 pr-12 pb-4">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
                <AudioLines className="size-5" />
              </span>
              <DialogTitle className="text-lg">How to make an LRC file</DialogTitle>
            </div>
          </DialogHeader>
        </div>

        <ol className="space-y-4 px-6 py-5">
          {STEPS.map((step, index) => (
            <li key={step.title} className="flex gap-4">
              <span className="relative flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                <step.icon className="size-4" />
                <span className="absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
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
          <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
            {SHORTCUTS.map((shortcut) => (
              <div
                key={shortcut.action}
                className="flex items-center justify-between gap-3"
              >
                <dt className="text-muted-foreground">{shortcut.action}</dt>
                <dd className="flex shrink-0 items-center gap-1">
                  {shortcut.keys.map((key) => (
                    <Kbd key={key}>{key}</Kbd>
                  ))}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="flex justify-end border-t px-6 py-4">
          <DialogClose render={<Button />}>Got it</DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  );
}
