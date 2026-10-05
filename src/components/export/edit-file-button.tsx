"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { Edit, FileText, Music, UploadCloud } from "react-feather";

import { ExportPanel } from "@/components/export/export-panel";
import {
  DropZone,
  PickedFile,
  readLrcFile,
  useDialogDrop,
  type LrcFile,
} from "@/components/export/file-drop";
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
import { isAudioFile, measureAudioDuration } from "@/lib/audio";
import { countSyncable, formatClock, parseLyrics } from "@/lib/lrc";
import { reportDownload } from "@/lib/report-download";

type PickedLrc = LrcFile & { name: string; lines: number };
/** `duration` is null while the file is being measured. */
type PickedAudio = { name: string; duration: number | null };

/**
 * Header button for an .lrc you already have: pick it, and optionally the
 * song's audio so the last subtitle runs to the end, then open it in the
 * export panel to fix and convert, with nothing synced first. The file
 * stands on its own; the lyrics in the editor are left alone.
 */
export function EditFileButton({ className }: { className?: string }) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const editRef = useRef<HTMLButtonElement>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [lrc, setLrc] = useState<PickedLrc | null>(null);
  const [audio, setAudio] = useState<PickedAudio | null>(null);
  const [lrcError, setLrcError] = useState<string | null>(null);
  const [audioError, setAudioError] = useState<string | null>(null);
  /** Bumped by every audio pick, so a slow measurement can't land on a newer one. */
  const audioPick = useRef(0);

  // With the lyrics picked, Edit is the next step. A layout effect, so focus
  // lands before the dialog notices its drop area (which may have had focus)
  // is gone and pulls focus back to itself.
  useLayoutEffect(() => {
    if (lrc) editRef.current?.focus();
  }, [lrc]);

  function changeDialogOpen(open: boolean) {
    if (open) {
      setLrc(null);
      setAudio(null);
      setLrcError(null);
      setAudioError(null);
      audioPick.current += 1;
    }
    setDialogOpen(open);
  }

  async function pickLrc(file: File) {
    const result = await readLrcFile(file);
    if ("error" in result) {
      setLrcError(result.error);
      return;
    }
    setLrcError(null);
    const lines = countSyncable(parseLyrics(result.text));
    setLrc({ ...result, name: file.name, lines });
  }

  async function pickAudio(file: File) {
    if (!isAudioFile(file)) {
      setAudioError("That isn't an audio file.");
      return;
    }
    audioPick.current += 1;
    const pick = audioPick.current;
    setAudioError(null);
    setAudio({ name: file.name, duration: null });
    const duration = await measureAudioDuration(file);
    if (pick !== audioPick.current) return;
    if (duration === null) {
      setAudio(null);
      setAudioError("Couldn't tell how long that audio is.");
      return;
    }
    setAudio({ name: file.name, duration });
  }

  function removeAudio() {
    audioPick.current += 1;
    setAudio(null);
  }

  function openPanel() {
    setDialogOpen(false);
    setPanelOpen(true);
  }

  // Each file goes where it belongs, wherever on the dialog it's dropped.
  const drop = useDialogDrop(dialogOpen, (file) => {
    void (isAudioFile(file) ? pickAudio(file) : pickLrc(file));
  });

  return (
    <>
      <Dialog open={dialogOpen} onOpenChange={changeDialogOpen}>
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

          <div className="grid gap-2">
            {lrc ? (
              <PickedFile
                icon={FileText}
                name={lrc.name}
                detail={`${lrc.lines} ${lrc.lines === 1 ? "line" : "lines"}`}
                removeLabel="Remove the .lrc file"
                onRemove={() => setLrc(null)}
              />
            ) : (
              <DropZone
                large
                highlighted={drop.dragging === "other"}
                label={
                  drop.dragging === "other"
                    ? "Drop to add it"
                    : "Upload an .lrc file"
                }
                hint="Drop it here or click to choose a file."
                error={lrcError}
                accept=".lrc,.txt"
                onFile={(file) => void pickLrc(file)}
              />
            )}
            {audio ? (
              <PickedFile
                icon={Music}
                name={audio.name}
                detail={
                  audio.duration === null
                    ? "Measuring its length…"
                    : `${formatClock(audio.duration)} · the last subtitle ends here`
                }
                removeLabel="Remove the audio"
                onRemove={removeAudio}
              />
            ) : (
              <DropZone
                icon={Music}
                highlighted={drop.dragging === "audio"}
                label={
                  drop.dragging === "audio"
                    ? "Drop to add the audio"
                    : "Add the song's audio (optional)"
                }
                hint="Recommended if you want the last subtitle line to last until the last timestamp of the audio (until the audio ends)."
                error={audioError}
                accept="audio/*"
                onFile={(file) => void pickAudio(file)}
              />
            )}
          </div>

          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              Cancel
            </DialogClose>
            <Button ref={editRef} disabled={!lrc} onClick={openPanel}>
              <Edit />
              Edit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Always rendered: a panel that mounts already open skips its slide-in.
          It follows the audio's length live, in case Edit beat the measuring. */}
      <ExportPanel
        open={panelOpen}
        onOpenChange={setPanelOpen}
        text={lrc?.text ?? ""}
        fileBase={lrc?.base ?? "lyrics"}
        duration={audio?.duration ?? null}
        onDownload={(file) =>
          reportDownload({ ...file, source: "upload", audio })
        }
        finalFocus={triggerRef}
      />
    </>
  );
}
