import type { Metadata } from "next";

import { SyncPage } from "@/components/sync/sync-page";

const title = "Synchronize lyrics to audio";
const description =
  "Play your song and stamp each lyric line as it is sung to build a timed .lrc file. Undo any line, rewind, and download the finished file.";

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
