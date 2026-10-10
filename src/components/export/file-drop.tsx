"use client";

import {
  useEffect,
  useRef,
  useState,
  type ComponentType,
  type DragEvent as ReactDragEvent,
} from "react";
import { UploadCloud, X } from "react-feather";

import { Button } from "@/components/ui/button";
import { readTextFile, stripExtension } from "@/lib/file";
import { cn } from "@/lib/utils";

/** An .lrc file picked to edit and convert. */
export type LrcFile = {
  /** File name without its extension. */
  base: string;
  text: string;
};

/** Lyrics take a few kilobytes; anything past this was picked by mistake. */
const MAX_LRC_BYTES = 1024 * 1024;

/**
 * Browsers repeat dragover at least every ~550ms while a file is held over
 * the page. Once none has come for this long, the drag has left or ended.
 */
const DRAG_IDLE_MS = 700;

/** True when a drag carries files, rather than text or a link. */
function hasFiles(event: { dataTransfer: DataTransfer | null }): boolean {
  return event.dataTransfer?.types.includes("Files") ?? false;
}

/** The text of an .lrc (or .txt) file, or why it can't be opened. */
export async function readLrcFile(
  file: File,
): Promise<LrcFile | { error: string }> {
  if (!/\.(lrc|txt)$/i.test(file.name)) {
    return { error: "That isn't an .lrc file." };
  }
  if (file.size > MAX_LRC_BYTES) {
    return { error: "That file is too big to be lyrics." };
  }
  let text: string;
  try {
    text = await readTextFile(file);
  } catch {
    return { error: "Couldn't read that file." };
  }
  if (text.includes("\0")) return { error: "That file isn't text." };
  if (text.trim() === "") return { error: "That file is empty." };
  return {
    base: stripExtension(file.name) || "lyrics",
    // The editor's textarea keeps \n line breaks only.
    text: text.replace(/\r\n?/g, "\n"),
  };
}

/** What a drag over the dialog carries, as far as a page can tell mid-drag. */
export type DragKind = "audio" | "other";

function dragKind(dataTransfer: DataTransfer): DragKind {
  const audio = [...dataTransfer.items].some(
    (item) => item.kind === "file" && item.type.startsWith("audio/"),
  );
  return audio ? "audio" : "other";
}

/**
 * Lets a dialog take a file dropped anywhere on it: spread `popupProps` on
 * its content. `dragging` says what's held over it, so the right drop area
 * can light up.
 */
export function useDialogDrop(open: boolean, onDrop: (file: File) => void) {
  const popupRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<DragKind | null>(null);

  // Each opening starts without a leftover highlight.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setDragging(null);
  }

  // Dropped anywhere but on the dialog, the browser would open the file in
  // place of the app, audio and all, so those drops are refused while it's
  // up. The highlight follows dragover rather than dragleave, which fires for
  // every child crossed and not always when a drag is called off.
  useEffect(() => {
    if (!open) return;
    let idle: number | undefined;
    function onDragOver(event: DragEvent) {
      if (!hasFiles(event) || !event.dataTransfer) return;
      event.preventDefault();
      const inside = popupRef.current?.contains(event.target as Node) ?? false;
      event.dataTransfer.dropEffect = inside ? "copy" : "none";
      setDragging(inside ? dragKind(event.dataTransfer) : null);
      window.clearTimeout(idle);
      if (inside) {
        idle = window.setTimeout(() => setDragging(null), DRAG_IDLE_MS);
      }
    }
    function onDrop(event: DragEvent) {
      if (!hasFiles(event)) return;
      event.preventDefault();
      window.clearTimeout(idle);
      setDragging(null);
    }
    window.addEventListener("dragover", onDragOver);
    window.addEventListener("drop", onDrop);
    return () => {
      window.clearTimeout(idle);
      window.removeEventListener("dragover", onDragOver);
      window.removeEventListener("drop", onDrop);
    };
  }, [open]);

  return {
    dragging,
    popupProps: {
      ref: popupRef,
      onDrop(event: ReactDragEvent) {
        if (!hasFiles(event)) return;
        event.preventDefault();
        const file = event.dataTransfer.files[0];
        if (file) onDrop(file);
      },
    },
  };
}

type Icon = ComponentType<{ className?: string }>;

/**
 * A place to click for a file or drop one on. `error` stands in for the hint
 * until the next attempt. `large` suits the main file of a dialog.
 *
 * Mid-drag only the one-line `label` and colours may change. Anything that
 * resizes the zone would shift the centred dialog under the pointer, and a
 * drop on an element the browser hasn't cleared for dropping yet is lost.
 */
export function DropZone({
  label,
  hint,
  error,
  highlighted,
  accept,
  onFile,
  icon: Icon = UploadCloud,
  large = false,
}: {
  label: string;
  hint: string;
  error?: string | null;
  /** A matching file is being dragged over the dialog. */
  highlighted: boolean;
  accept: string;
  onFile: (file: File) => void;
  icon?: Icon;
  large?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <>
      {/* The text changes mid-drag, so the inner parts ignore the pointer:
          otherwise a drop could land on a part that just appeared and that
          the browser hasn't cleared for dropping yet. */}
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        data-dragging={highlighted || undefined}
        className={cn(
          "group flex w-full items-center gap-2.5 rounded-lg border border-dashed border-foreground/20 p-2.5 text-left transition-colors outline-none **:pointer-events-none hover:border-foreground/35 hover:bg-muted/50 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring data-dragging:border-primary data-dragging:bg-primary/5",
          large && "flex-col justify-center gap-3 px-4 py-8 text-center",
        )}
      >
        <span
          className={cn(
            "flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground transition-colors group-hover:text-foreground group-data-dragging:bg-primary/15 group-data-dragging:text-primary",
            large && "size-10 rounded-xl",
          )}
        >
          <Icon aria-hidden className={large ? "size-5" : "size-4"} />
        </span>
        <span className="min-w-0">
          <span className="block text-sm font-medium">{label}</span>
          <span
            className={cn(
              "block text-xs text-muted-foreground",
              error && !highlighted && "text-destructive",
            )}
          >
            {error || hint}
          </span>
        </span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          // Lets the same file be picked again after an error.
          event.target.value = "";
          if (file) onFile(file);
        }}
      />
      <p role="alert" className="sr-only">
        {error}
      </p>
    </>
  );
}

/** A file already picked, in place of its drop area, with a way to drop it. */
export function PickedFile({
  icon: Icon,
  name,
  detail,
  removeLabel,
  onRemove,
}: {
  icon: Icon;
  name: string;
  detail: string;
  removeLabel: string;
  onRemove: () => void;
}) {
  return (
    <div className="flex items-center gap-2.5 rounded-lg bg-background p-2.5 shadow-xs ring-1 ring-foreground/10 dark:bg-input/30">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary/15 text-primary">
        <Icon aria-hidden className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-mono text-xs font-medium" title={name}>
          {name}
        </p>
        <p className="truncate text-xs text-muted-foreground">{detail}</p>
      </div>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={onRemove}
        aria-label={removeLabel}
        title={removeLabel}
      >
        <X aria-hidden />
      </Button>
    </div>
  );
}
