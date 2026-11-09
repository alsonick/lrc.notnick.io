import type { Metadata } from "next";

import { SyncPage } from "@/components/sync/sync-page";

const title = "Synchronize";

export const metadata: Metadata = {
  title,
  // Only the home page has a description; search engines write their own
  // snippet for the rest. Null, as leaving it out would inherit the home page's.
  description: null,
  alternates: { canonical: "/sync" },
  // No titles here: Next fills them in from `title`, the same as the tab.
  openGraph: { url: "/sync", images: ["/og.png"] },
  twitter: { images: ["/og.png"] },
};

export default function Page() {
  return <SyncPage />;
}
