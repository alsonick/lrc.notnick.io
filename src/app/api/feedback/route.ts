import { NextResponse } from "next/server";

import {
  buildDiscordPayload,
  isDiscordWebhookUrl,
  validateFeedback,
} from "@/lib/feedback";

export async function POST(request: Request) {
  const webhook = process.env.DISCORD_WEBHOOK_URL;
  if (!webhook || !isDiscordWebhookUrl(webhook)) {
    return NextResponse.json(
      { error: "Feedback isn't set up on this server yet." },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const result = validateFeedback(body);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  // Bots that fill the hidden field get a quiet "success" and nothing is sent.
  if (result.honeypot) return new Response(null, { status: 204 });

  const payload = buildDiscordPayload(result, {
    userAgent: request.headers.get("user-agent") ?? undefined,
  });
  try {
    const response = await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      console.error(`Discord webhook responded with ${response.status}`);
      return NextResponse.json(
        { error: "Couldn't deliver the feedback. Try again later." },
        { status: 502 },
      );
    }
  } catch (error) {
    console.error("Discord webhook request failed", error);
    return NextResponse.json(
      { error: "Couldn't deliver the feedback. Try again later." },
      { status: 502 },
    );
  }
  return new Response(null, { status: 204 });
}
