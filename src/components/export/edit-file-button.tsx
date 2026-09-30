"use client";

import { useRef, useState } from "react";
import { UploadCloud } from "react-feather";

import { ExportPanel } from "@/components/export/export-panel";
import {
  LrcDropZone,
  useLrcDrop,
  type LrcFile,
} from "@/components/export/lrc-drop";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

/**
 * Header button for an .lrc you already have: pick or drop one and it opens
 * in the export panel to fix and convert to SRT, with nothing synced first.
 * The file stands on its own; the lyrics in the editor are left alone.
 */
export function EditFileButton({ className }: { className?: string }) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [file, setFile] = useState<LrcFile | null>(null);
  const drop = useLrcDrop(dialogOpen, (picked) => {
    setFile(picked);
    setDialogOpen(false);
    setPanelOpen(true);
  });

  return (
    <>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogTrigger
          ref={triggerRef}
          render={<Button variant="ghost" className={className} />}
        >
          <UploadCloud />
          Upload
        </DialogTrigger>
        <DialogContent {...drop.popupProps} className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit an .lrc file</DialogTitle>
            <DialogDescription>
              Fix any line or timestamp, then download it as .lrc or as .srt.
            </DialogDescription>
          </DialogHeader>
          <LrcDropZone drop={drop} label="Upload an .lrc file" large />
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              Cancel
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Always rendered: a panel that mounts already open skips its slide-in. */}
      <ExportPanel
        open={panelOpen}
        onOpenChange={setPanelOpen}
        text={file?.text ?? ""}
        fileBase={file?.base ?? "lyrics"}
        duration={null}
        finalFocus={triggerRef}
      />
    </>
  );
}
