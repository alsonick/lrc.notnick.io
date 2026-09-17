import type { Metadata } from "next";

import { SyncPage } from "@/components/sync/sync-page";
import { SITE_DESCRIPTION } from "@/lib/constants";

const title = "Synchronize";
const description =
  SITE_DESCRIPTION

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/sync" },
  openGraph: {
    title,
    description,
    url: "/sync",
    images: ["/og.png"],
  },
  twitter: {
    title,
    description,
    images: ["/og.png"],
  },
};

export default function Page() {
  return <SyncPage />;
}
