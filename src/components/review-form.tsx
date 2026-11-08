"use client";

import { useState, type FormEvent } from "react";
import { Info, Send } from "react-feather";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  REVIEW_EMAIL_MAX_LENGTH,
  REVIEW_MAX_LENGTH,
  REVIEW_NAME_MAX_LENGTH,
} from "@/lib/review";
import { cn } from "@/lib/utils";

const FAILED = "Couldn't send your review. Try again later.";

/**
 * A form for leaving a review; it goes to `/api/reviews`, then to Discord.
 * Named by the heading above it, on the page.
 */
export function ReviewForm({
  className,
  "aria-labelledby": labelledBy,
}: {
  className?: string;
  /** The id of the heading that names the form. */
  "aria-labelledby": string;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [review, setReview] = useState("");
  // Hidden from people; a bot that fills it in is ignored by the server.
  const [website, setWebsite] = useState("");
  const [sending, setSending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sending) return;
    setSending(true);
    try {
      const response = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          review: review.trim(),
          website,
        }),
      });
      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(data?.error ?? FAILED);
      }
      toast.success("Thanks for your review!");
      setName("");
      setEmail("");
      setReview("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : FAILED);
    } finally {
      setSending(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      aria-labelledby={labelledBy}
      className={cn("rounded-2xl border bg-card p-8 shadow-xs", className)}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="review-name">Name</Label>
          <Input
            id="review-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={REVIEW_NAME_MAX_LENGTH}
            required
            autoComplete="name"
            placeholder="Name"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="review-email">Email</Label>
          <Input
            id="review-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            maxLength={REVIEW_EMAIL_MAX_LENGTH}
            required
            autoComplete="email"
            placeholder="Email (hi@notnick.io)"
            aria-describedby="review-email-hint"
          />
        </div>
        <div className="grid gap-2 sm:col-span-2">
          <Label htmlFor="review-text">Review</Label>
          <Textarea
            id="review-text"
            value={review}
            onChange={(event) => setReview(event.target.value)}
            maxLength={REVIEW_MAX_LENGTH}
            required
            placeholder="What do you like about it? What do you use it for?"
            className="min-h-28"
          />
          <p className="text-right text-xs text-muted-foreground tabular-nums">
            {review.length}/{REVIEW_MAX_LENGTH}
          </p>
        </div>
        <div className="hidden" aria-hidden>
          <label htmlFor="review-website">Website</label>
          <input
            id="review-website"
            type="text"
            tabIndex={-1}
            autoComplete="off"
            value={website}
            onChange={(event) => setWebsite(event.target.value)}
          />
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-4">
        {/* Lined up with the first line, should the text wrap on a phone. */}
        <p
          id="review-email-hint"
          className="flex items-start gap-1.5 text-xs text-muted-foreground"
        >
          <Info aria-hidden className="mt-px size-3.5 shrink-0" />
          <span>
            Your email is only for getting back to you. It&apos;s never shown.
          </span>
        </p>
        <Button type="submit" size="lg" disabled={sending}>
          <Send aria-hidden />
          {sending ? "Sending…" : "Send"}
        </Button>
      </div>
    </form>
  );
}
