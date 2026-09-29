"use client";

import { useEffect, useRef, useState, type ComponentType } from "react";
import { ArrowRight, Edit, FileText, Film, UploadCloud } from "react-feather";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { readTextFile, stripExtension } from "@/lib/file";
import { cn } from "@/lib/utils";

/** An .lrc file picked in the dialog, to edit in place of the synced lyrics. */
export type LrcFile = {
  /** File name without its extension. */
  base: string;
  text: string;
};

/** Lyrics take a few kilobytes; anything past this was picked by mistake. */
const MAX_FILE_BYTES = 1024 * 1024;

/**
 * Browsers repeat dragover at least every ~550ms while a file is held over
 * the page. Once none has come for this long, the drag has left or ended.
 */
const DRAG_IDLE_MS = 700;

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** File name without its extension. */
  fileBase: string;
  lineCount: number;
  /** Cancel: download the .lrc as it is. */
  onDownload: () => void;
  onEdit: () => void;
  onUpload: (file: LrcFile) => void;
};

/** True when a drag carries files, rather than text or a link. */
function hasFiles(event: { dataTransfer: DataTransfer | null }): boolean {
  return event.dataTransfer?.types.includes("Files") ?? false;
}

/** The text of an .lrc (or .txt) file, or why it can't be opened. */
async function readLrcFile(
  file: File,
): Promise<{ text: string } | { error: string }> {
  if (!/\.(lrc|txt)$/i.test(file.name)) {
    return { error: "That isn't an .lrc file." };
  }
  if (file.size > MAX_FILE_BYTES) {
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
  // The editor's textarea keeps \n line breaks only.
  return { text: text.replace(/\r\n?/g, "\n") };
}

/**
 * What Done asks once every line is stamped: open the file to edit it and
 * convert it to SRT, pick an .lrc of your own to edit instead, or Cancel to
 * download the .lrc as it is. Esc or a click outside only closes the dialog,
 * so an accidental Done saves nothing.
 */
export function FinishDialog({
  open,
  onOpenChange,
  fileBase,
  lineCount,
  onDownload,
  onEdit,
  onUpload,
}: Props) {
  const editRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  /** A file is being dragged over the dialog. */
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Each opening starts clean, without the last attempt's error.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setDragging(false);
      setError(null);
    }
  }

  // The dialog takes a file dropped anywhere on it. Dropped anywhere else,
  // the browser would open it in place of the app, audio and all, so those
  // drops are refused. The highlight follows dragover rather than dragleave,
  // which fires for every child crossed and not always when a drag is called
  // off.
  useEffect(() => {
    if (!open) return;
    let idle: number | undefined;
    function onDragOver(event: DragEvent) {
      if (!hasFiles(event) || !event.dataTransfer) return;
      event.preventDefault();
      const inside = popupRef.current?.contains(event.target as Node) ?? false;
      event.dataTransfer.dropEffect = inside ? "copy" : "none";
      setDragging(inside);
      window.clearTimeout(idle);
      if (inside) {
        idle = window.setTimeout(() => setDragging(false), DRAG_IDLE_MS);
      }
    }
    function onDrop(event: DragEvent) {
      if (!hasFiles(event)) return;
      event.preventDefault();
      window.clearTimeout(idle);
      setDragging(false);
    }
    window.addEventListener("dragover", onDragOver);
    window.addEventListener("drop", onDrop);
    return () => {
      window.clearTimeout(idle);
      window.removeEventListener("dragover", onDragOver);
      window.removeEventListener("drop", onDrop);
    };
  }, [open]);

  async function openFile(file: File | undefined) {
    if (!file) return;
    const result = await readLrcFile(file);
    if ("error" in result) {
      setError(result.error);
      return;
    }
    onUpload({ base: stripExtension(file.name) || "lyrics", text: result.text });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        ref={popupRef}
        showCloseButton={false}
        initialFocus={editRef}
        className="sm:max-w-md"
        onDrop={(event) => {
          if (!hasFiles(event)) return;
          event.preventDefault();
          void openFile(event.dataTransfer.files[0]);
        }}
      >
        <DialogHeader>
          <DialogTitle>Edit and convert to SRT?</DialogTitle>
          <DialogDescription>
            Every line is synced. Polish the lyrics and timestamps, then
            download them as .lrc or as .srt subtitles.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-2">
          <div className="flex items-center gap-2 rounded-lg bg-muted/60 p-2 ring-1 ring-foreground/5 dark:bg-muted/40">
            <FileCard
              icon={FileText}
              name={`${fileBase}.lrc`}
              detail={`${lineCount} ${lineCount === 1 ? "line" : "lines"}`}
            />
            <ArrowRight
              aria-hidden
              className="size-4 shrink-0 text-muted-foreground"
            />
            <FileCard icon={Film} name={`${fileBase}.srt`} detail="Subtitles" />
          </div>

          {/* The whole dialog takes the drop; this is where it says so. Its
              text changes mid-drag, so the inner parts ignore the pointer:
              otherwise a drop could land on a part that just appeared and
              that the browser hasn't cleared for dropping yet. */}
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            data-dragging={dragging || undefined}
            className="group flex w-full items-center gap-2.5 rounded-lg border border-dashed border-foreground/20 p-2.5 text-left transition-colors outline-none **:pointer-events-none hover:border-foreground/35 hover:bg-muted/50 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 data-dragging:border-primary data-dragging:bg-primary/5"
          >
            <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground transition-colors group-hover:text-foreground group-data-dragging:bg-primary/15 group-data-dragging:text-primary">
              <UploadCloud className="size-4" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-medium">
                {dragging ? "Drop to open it" : "Upload an .lrc file instead"}
              </span>
              <span
                className={cn(
                  "block text-xs text-muted-foreground",
                  error && !dragging && "text-destructive",
                )}
              >
                {dragging
                  ? "It opens in the editor."
                  : (error ?? "Drop it here or click to choose a file.")}
              </span>
            </span>
          </button>
          <input
            ref={inputRef}
            type="file"
            accept=".lrc,.txt"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              // Lets the same file be picked again after an error.
              event.target.value = "";
              void openFile(file);
            }}
          />
          <p role="alert" className="sr-only">
            {error}
          </p>
        </div>

        <DialogFooter>
          <DialogClose
            render={<Button variant="outline" />}
            onClick={onDownload}
          >
            Cancel
          </DialogClose>
          <Button ref={editRef} onClick={onEdit}>
            <Edit />
            Edit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function FileCard({
  icon: Icon,
  name,
  detail,
}: {
  icon: ComponentType<{ className?: string }>;
  name: string;
  detail: string;
}) {
  return (
    <div className="flex min-w-0 flex-1 items-center gap-2.5 rounded-md bg-background px-2.5 py-2 shadow-xs ring-1 ring-foreground/10 dark:bg-input/30">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary/15 text-primary">
        <Icon className="size-4" />
      </span>
      <div className="min-w-0">
        <p className="truncate font-mono text-xs font-medium" title={name}>
          {name}
        </p>
        <p className="text-xs text-muted-foreground">{detail}</p>
      </div>
    </div>
  );
}
