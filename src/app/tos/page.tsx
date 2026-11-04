import type { Metadata } from "next";

import { SITE_NAME } from "@/lib/constants";

const title = "Terms of Service";
const description = `The terms for using ${SITE_NAME}.`;

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/tos" },
  openGraph: {
    title,
    description,
    url: "/tos",
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
    <div className="mx-auto w-full max-w-5xl mt-8 px-4 py-6 sm:py-10">
      <article className="max-w-208">
        <h1 className="text-4xl font-black tracking-tight">
          Terms of Service
        </h1>
      </article>
    </div>
  );
}
