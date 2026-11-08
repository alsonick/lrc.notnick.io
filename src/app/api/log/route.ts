import { NextResponse } from "next/server";

import { countRequest, db } from "@/lib/db";
import { isDiscordWebhookUrl } from "@/lib/feedback";
import {
  buildSessionLogPayload,
  validateSessionLog,
  type SessionLog,
} from "@/lib/session-log";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const log = validateSessionLog(body);
  if (!log) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const [counted, sent] = await Promise.all([
    countDownload(log),
    sendToDiscord(log, request.headers.get("user-agent") ?? undefined),
  ]);
  return new Response(null, { status: counted && sent ? 204 : 502 });
}

/**
 * Stores the download and adds one to the requests served on /usage, both or
 * neither. True when that worked, or when there's no database to store it in.
 * Visitors with logging off go to `/api/count` instead, which only counts.
 */
async function countDownload(log: SessionLog): Promise<boolean> {
  if (!db) return true;
  try {
    await db.$transaction([
      db.download.create({
        data: { format: log.format, source: log.source },
      }),
      ...countRequest(db),
    ]);
    return true;
  } catch (error) {
    console.error("Couldn't store the download", error);
    return false;
  }
}

/**
 * Posts the report to the LOGGING webhook. True when it was sent, or when
 * there's no webhook: logging to Discord is optional.
 */
async function sendToDiscord(
  log: SessionLog,
  userAgent: string | undefined,
): Promise<boolean> {
  const webhook = process.env.LOGGING;
  if (!webhook) return true;
  if (!isDiscordWebhookUrl(webhook)) {
    console.error("LOGGING isn't a Discord webhook URL, so nothing is logged");
    return true;
  }
  try {
    const response = await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildSessionLogPayload(log, { userAgent })),
    });
    if (!response.ok) {
      console.error(`Discord webhook responded with ${response.status}`);
      return false;
    }
    return true;
  } catch (error) {
    console.error("Discord webhook request failed", error);
    return false;
  }
}
