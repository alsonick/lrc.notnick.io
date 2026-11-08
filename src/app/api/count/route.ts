import { countRequest, db } from "@/lib/db";

/**
 * A file was saved by a visitor who switched logging off: only the requests
 * served on /usage go up. Nothing comes with it, and nothing else is stored.
 */
export async function POST() {
  if (!db) return new Response(null, { status: 204 });
  try {
    await db.$transaction(countRequest(db));
  } catch (error) {
    console.error("Couldn't count the request", error);
    return new Response(null, { status: 502 });
  }
  return new Response(null, { status: 204 });
}
