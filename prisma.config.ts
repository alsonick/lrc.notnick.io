import { config } from "dotenv";
import { defineConfig } from "prisma/config";

// The same files Next.js reads; the first one to set a variable wins.
config({ path: [".env.local", ".env"], quiet: true });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  // Read directly rather than with `env()`, which throws when it isn't set:
  // `prisma generate` (run on install) works without a database.
  datasource: { url: process.env.DATABASE_URL },
});
