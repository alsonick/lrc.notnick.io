/**
 * Shared rules for the feedback form and the `/api/feedback` route that
 * forwards submissions to a Discord webhook.
 */

import { SITE_NAME, THEME_COLOR } from "@/lib/constants";

export const FEEDBACK_MAX_LENGTH = 2000;
export const CONTACT_MAX_LENGTH = 200;
const PAGE_MAX_LENGTH = 200;
const USER_AGENT_MAX_LENGTH = 256;

export type Feedback = {
  message: string;
  /** Optional way to reach the sender, e.g. an email or Discord handle. */
  contact: string;
  /** Path of the page the form was sent from, or "" when unknown. */
  page: string;
};

export type FeedbackValidation =
  | (Feedback & {
      ok: true;
      /** True when the hidden anti-bot field was filled in. */
      honeypot: boolean;
    })
  | { ok: false; error: string };

/** Checks an incoming request body and normalizes it into a `Feedback`. */
export function validateFeedback(body: unknown): FeedbackValidation {
  if (typeof body !== "object" || body === null) {
    return { ok: false, error: "Invalid request." };
  }
  const { message, contact, page, website } = body as Record<string, unknown>;
  if (typeof message !== "string" || message.trim() === "") {
    return { ok: false, error: "Please write a message first." };
  }
  const text = message.trim();
  if (text.length > FEEDBACK_MAX_LENGTH) {
    return {
      ok: false,
      error: `Keep the message under ${FEEDBACK_MAX_LENGTH} characters.`,
    };
  }
  const contactText = typeof contact === "string" ? contact.trim() : "";
  if (contactText.length > CONTACT_MAX_LENGTH) {
    return {
      ok: false,
      error: `Keep the contact under ${CONTACT_MAX_LENGTH} characters.`,
    };
  }
  const pageText =
    typeof page === "string" &&
    page.startsWith("/") &&
    page.length <= PAGE_MAX_LENGTH
      ? page
      : "";
  const honeypot = typeof website === "string" && website.trim() !== "";
  return { ok: true, message: text, contact: contactText, page: pageText, honeypot };
}

/** Only real Discord webhook URLs are accepted, so a typo in the env var fails loudly. */
export function isDiscordWebhookUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      /(^|\.)discord(app)?\.com$/.test(url.hostname) &&
      url.pathname.startsWith("/api/webhooks/")
    );
  } catch {
    return false;
  }
}

/** The JSON body Discord expects. Mentions are disabled so feedback can't ping anyone. */
export function buildDiscordPayload(
  feedback: Feedback,
  meta: { userAgent?: string } = {},
) {
  const fields: { name: string; value: string; inline?: boolean }[] = [];
  if (feedback.contact) {
    fields.push({ name: "Contact", value: feedback.contact, inline: true });
  }
  if (feedback.page) {
    fields.push({ name: "Page", value: feedback.page, inline: true });
  }
  if (meta.userAgent) {
    fields.push({
      name: "Browser",
      value: meta.userAgent.slice(0, USER_AGENT_MAX_LENGTH),
    });
  }
  return {
    username: `${SITE_NAME} feedback`,
    embeds: [
      {
        title: "New feedback",
        description: feedback.message,
        color: parseInt(THEME_COLOR.slice(1), 16),
        fields,
        timestamp: new Date().toISOString(),
      },
    ],
    allowed_mentions: { parse: [] as string[] },
  };
}
