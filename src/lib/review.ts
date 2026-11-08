/**
 * Shared rules for the review form on /usage and the `/api/reviews` route
 * that forwards each review to a Discord webhook.
 */

import { SITE_NAME, THEME_COLOR } from "@/lib/constants";

export const REVIEW_NAME_MAX_LENGTH = 100;
export const REVIEW_EMAIL_MAX_LENGTH = 200;
export const REVIEW_MAX_LENGTH = 2000;
const USER_AGENT_MAX_LENGTH = 256;

/** Loose on purpose: something@something.something. The browser checks it too. */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type Review = {
  name: string;
  email: string;
  review: string;
};

export type ReviewValidation =
  | (Review & {
      ok: true;
      /** True when the hidden anti-bot field was filled in. */
      honeypot: boolean;
    })
  | { ok: false; error: string };

/** Checks an incoming request body and normalizes it into a `Review`. */
export function validateReview(body: unknown): ReviewValidation {
  if (typeof body !== "object" || body === null) {
    return { ok: false, error: "Invalid request." };
  }
  const { name, email, review, website } = body as Record<string, unknown>;

  const nameText = typeof name === "string" ? name.trim() : "";
  if (nameText === "") return { ok: false, error: "Please add your name." };
  if (nameText.length > REVIEW_NAME_MAX_LENGTH) {
    return {
      ok: false,
      error: `Keep your name under ${REVIEW_NAME_MAX_LENGTH} characters.`,
    };
  }

  const emailText = typeof email === "string" ? email.trim() : "";
  if (
    emailText.length > REVIEW_EMAIL_MAX_LENGTH ||
    !EMAIL_RE.test(emailText)
  ) {
    return { ok: false, error: "Please add a valid email." };
  }

  const reviewText = typeof review === "string" ? review.trim() : "";
  if (reviewText === "") {
    return { ok: false, error: "Please write your review first." };
  }
  if (reviewText.length > REVIEW_MAX_LENGTH) {
    return {
      ok: false,
      error: `Keep the review under ${REVIEW_MAX_LENGTH} characters.`,
    };
  }

  const honeypot = typeof website === "string" && website.trim() !== "";
  return {
    ok: true,
    name: nameText,
    email: emailText,
    review: reviewText,
    honeypot,
  };
}

/** The JSON body Discord expects. Mentions are off so a review can't ping anyone. */
export function buildReviewDiscordPayload(
  review: Review,
  meta: { userAgent?: string } = {},
) {
  const fields: { name: string; value: string; inline?: boolean }[] = [
    { name: "Name", value: review.name, inline: true },
    { name: "Email", value: review.email, inline: true },
  ];
  if (meta.userAgent) {
    fields.push({
      name: "Browser",
      value: meta.userAgent.slice(0, USER_AGENT_MAX_LENGTH),
    });
  }
  return {
    username: `${SITE_NAME} Review`,
    embeds: [
      {
        title: "LRC Generator | Review",
        description: review.review,
        color: parseInt(THEME_COLOR.slice(1), 16),
        fields,
        timestamp: new Date().toISOString(),
      },
    ],
    allowed_mentions: { parse: [] as string[] },
  };
}
