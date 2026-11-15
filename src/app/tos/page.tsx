import type { Metadata } from "next";

const title = "Terms of Service";

export const metadata: Metadata = {
  title,
  // Only the home page has a description; search engines write their own
  // snippet for the rest. Null, as leaving it out would inherit the home page's.
  description: null,
  alternates: { canonical: "/tos" },
  // No titles here: Next fills them in from `title`, the same as the tab.
  openGraph: { url: "/tos", images: ["/og.png"] },
  twitter: { images: ["/og.png"] },
};

export default function Page() {
  return (
    <div className="mx-auto mt-4 w-full max-w-5xl px-4 py-6 sm:mt-8 sm:py-10">
      <article className="max-w-208">
        <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
          Terms of Service
        </h1>
      </article>
    </div>
  );
}
