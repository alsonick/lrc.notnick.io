import type { Metadata } from "next";

import { SITE_NAME } from "@/lib/constants";

const title = "Privacy Policy";
const description = `How ${SITE_NAME} handles your data.`;

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/privacy" },
  openGraph: {
    title,
    description,
    url: "/privacy",
    images: ["/og.png"],
  },
  twitter: {
    title,
    description,
    images: ["/og.png"],
  },
};

export default function Page() {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6">
      <h1 className="text-2xl font-semibold tracking-tight">Privacy Policy</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        This page is under construction.
      </p>
    </div>
  );
}
