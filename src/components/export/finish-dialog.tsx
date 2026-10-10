"use client";

import { useRef, type ComponentType } from "react";
import { ArrowRight, Edit, FileText, Film } from "react-feather";

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

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** File name without its extension. */
  fileBase: string;
  lineCount: number;
  /** Cancel: download the .lrc as it is. */
  onDownload: () => void;
  onEdit: () => void;
};

/**
 * What Done asks once every line is stamped: open the file to edit it and
 * convert it to SRT, or Cancel to download the .lrc as it is. Esc or a click
 * outside only closes the dialog, so an accidental Done saves nothing.
 */
export function FinishDialog({
  open,
  onOpenChange,
  fileBase,
  lineCount,
  onDownload,
  onEdit,
}: Props) {
  const editRef = useRef<HTMLButtonElement>(null);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        initialFocus={editRef}
        className="sm:max-w-md"
      >
        <DialogHeader>
          <DialogTitle>Edit and convert to SRT?</DialogTitle>
          <DialogDescription>
            Every line is synced. Polish the lyrics and timestamps, then
            download them as .lrc or as .srt subtitles.
          </DialogDescription>
        </DialogHeader>

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

        <DialogFooter>
          <DialogClose
            render={<Button variant="outline" />}
            onClick={onDownload}
          >
            Cancel
          </DialogClose>
          <Button ref={editRef} onClick={onEdit}>
            <Edit aria-hidden />
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
        <Icon aria-hidden className="size-4" />
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
