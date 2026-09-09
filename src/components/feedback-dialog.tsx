"use client";

import { useState, type FormEvent } from "react";
import { usePathname } from "next/navigation";
import { MessageSquareText, Send } from "lucide-react";
import { toast } from "sonner";

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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CONTACT_MAX_LENGTH, FEEDBACK_MAX_LENGTH } from "@/lib/feedback";

const FAILED = "Couldn't send your feedback. Try again later.";

/** Nav button that opens a small form; submissions go to `/api/feedback`. */
export function FeedbackDialog({ className }: { className?: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [contact, setContact] = useState("");
  // Hidden from people; a bot that fills it in is ignored by the server.
  const [website, setWebsite] = useState("");
  const [sending, setSending] = useState(false);

  const trimmed = message.trim();
  const canSend = trimmed !== "" && !sending;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSend) return;
    setSending(true);
    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: trimmed,
          contact: contact.trim(),
          page: pathname,
          website,
        }),
      });
      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(data?.error ?? FAILED);
      }
      toast.success("Thanks, your feedback was sent!");
      setMessage("");
      setContact("");
      setOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : FAILED);
    } finally {
      setSending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={<Button variant="ghost" size="sm" className={className} />}
      >
        <MessageSquareText />
        Feedback
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={submit} className="contents">
          <DialogHeader>
            <DialogTitle>Send feedback</DialogTitle>
            <DialogDescription>
              Found a bug or have an idea? It goes straight to the developer.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="feedback-contact">
                Contact
                <span className="font-normal text-muted-foreground">
                  (optional)
                </span>
              </Label>
              <Input
                id="feedback-contact"
                value={contact}
                onChange={(event) => setContact(event.target.value)}
                maxLength={CONTACT_MAX_LENGTH}
                placeholder="Email or Discord handle, if you'd like a reply"
                autoComplete="email"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="feedback-message">Message</Label>
              <Textarea
                id="feedback-message"
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                maxLength={FEEDBACK_MAX_LENGTH}
                required
                placeholder="What's working, what isn't, what you'd like to see…"
                className="min-h-28"
              />
              <p className="text-right text-xs text-muted-foreground tabular-nums">
                {message.length}/{FEEDBACK_MAX_LENGTH}
              </p>
            </div>
            <div className="hidden" aria-hidden>
              <label htmlFor="feedback-website">Website</label>
              <input
                id="feedback-website"
                type="text"
                tabIndex={-1}
                autoComplete="off"
                value={website}
                onChange={(event) => setWebsite(event.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <DialogClose render={<Button variant="outline" type="button" />}>
              Cancel
            </DialogClose>
            <Button type="submit" disabled={!canSend}>
              <Send />
              {sending ? "Sending…" : "Send"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
