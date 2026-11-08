/**
 * The Prisma client, for server code only. The database is optional, like the
 * Discord webhooks: without `DATABASE_URL`, `db` is null and nothing is stored.
 */

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "@/generated/prisma/client";

const connectionString = process.env.DATABASE_URL;

// Reused across hot reloads in development, so each edit doesn't open
// another pool of connections.
const globalForDb = globalThis as unknown as { db?: PrismaClient };

/** The id of the one row in the Count table: the requests served. */
export const COUNT_ID = 1;

/**
 * The writes that add one to the requests served, to run in a transaction.
 * The first migration makes the row. If it's missing (say the tables came
 * from `prisma db push`), the first write makes it at the schema's starting
 * value, and does nothing otherwise.
 */
export function countRequest(client: PrismaClient) {
  return [
    client.count.createMany({ data: { id: COUNT_ID }, skipDuplicates: true }),
    client.count.update({
      where: { id: COUNT_ID },
      data: { value: { increment: 1 } },
    }),
  ];
}

export const db: PrismaClient | null = connectionString
  ? (globalForDb.db ??= new PrismaClient({
      adapter: new PrismaPg({ connectionString }),
    }))
  : null;
