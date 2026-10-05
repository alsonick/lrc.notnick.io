"use client";

import { useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { Settings } from "react-feather";
import { toast } from "sonner";

import { ThemePicker } from "@/components/theme-picker";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { usePersistedState } from "@/hooks/use-persisted-state";
import { isLoggingEnabled, LOG_KEY, readTheme } from "@/lib/settings";

/** Every setting as it stands, to tell whether any of them was changed. */
function readSettings(): string {
  return `${readTheme()} ${isLoggingEnabled()}`;
}

/** Header button that opens the app's settings. Each one applies as it's changed. */
export function SettingsDialog({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  /** The settings as they were when the dialog opened. */
  const opened = useRef("");

  function changeOpen(next: boolean) {
    if (next) opened.current = readSettings();
    setOpen(next);
  }

  /** Settings apply as they're changed; Done says so if any were. */
  function confirmChanges() {
    if (readSettings() !== opened.current) {
      toast.success("Your changes have been applied");
    }
  }

  return (
    <Dialog open={open} onOpenChange={changeOpen}>
      <DialogTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            aria-label="Settings"
            className={className}
          />
        }
      >
        <Settings />
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        {/* The line under the title runs edge to edge, like the footer's. */}
        <DialogHeader className="-mx-4 border-b px-4 pb-4">
          <DialogTitle>Settings</DialogTitle>
        </DialogHeader>
        <SettingsList onNavigate={() => setOpen(false)} />
        <DialogFooter>
          <DialogClose render={<Button />} onClick={confirmChanges}>
            Done
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * The settings themselves. Kept apart from the dialog so it only mounts once
 * the dialog opens: saved values are read from the browser, which the server
 * render can't do. `onNavigate` runs when a link in it takes this tab to
 * another page, since the header (and so the dialog) would otherwise stay put
 * while the page under it changes.
 */
function SettingsList({ onNavigate }: { onNavigate: () => void }) {
  const [logging, setLogging] = usePersistedState(LOG_KEY, true);

  return (
    <div className="divide-y">
      <div className="space-y-2.5 pb-4">
        <SettingText
          id="settings-theme"
          title="Theme"
          hint="Light, dark, or whatever your device is set to."
        />
        <ThemePicker aria-labelledby="settings-theme" />
      </div>
      {/* A label, so the whole row flips the switch. */}
      <label className="flex cursor-pointer items-center justify-between gap-4 pt-4">
        <SettingText
          title="Log"
          hint={
            <>
              We only collect usage statistics, like file names and browser.
              Never your lyrics or audio.{" "}
              <Link
                href="/privacy"
                onNavigate={onNavigate}
                className="rounded-xs underline underline-offset-3 outline-none transition-colors hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                Privacy policy
              </Link>
            </>
          }
        />
        <Switch checked={logging} onCheckedChange={setLogging} />
      </label>
    </div>
  );
}

function SettingText({
  id,
  title,
  hint,
}: {
  id?: string;
  title: string;
  hint: ReactNode;
}) {
  return (
    <span className="block min-w-0 space-y-0.5">
      <span id={id} className="block text-sm font-medium">
        {title}
      </span>
      <span className="block text-xs text-muted-foreground">{hint}</span>
    </span>
  );
}
