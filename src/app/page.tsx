import type { Metadata } from "next";

import { LyricsEditor } from "@/components/editor/lyrics-editor";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

export default function Home() {
  return <LyricsEditor />;
}
