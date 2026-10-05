import { NextResponse } from "next/server";

import { isDiscordWebhookUrl } from "@/lib/feedback";
import { buildSessionLogPayload, validateSessionLog } from "@/lib/session-log";

export async function POST(request: Request) {
  const webhook = process.env.LOGGING;
  // Logging is optional: without a webhook the report is quietly dropped.
  if (!webhook) return new Response(null, { status: 204 });
  if (!isDiscordWebhookUrl(webhook)) {
    console.error("LOGGING isn't a Discord webhook URL, so nothing is logged");
    return new Response(null, { status: 204 });
  }

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

  try {
    const response = await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        buildSessionLogPayload(log, {
          userAgent: request.headers.get("user-agent") ?? undefined,
        }),
      ),
    });
    if (!response.ok) {
      console.error(`Discord webhook responded with ${response.status}`);
      return new Response(null, { status: 502 });
    }
  } catch (error) {
    console.error("Discord webhook request failed", error);
    return new Response(null, { status: 502 });
  }
  return new Response(null, { status: 204 });
}
