import type { Metadata } from "next";
import { Mail } from "react-feather";

import { ChannelCarousel } from "@/components/channel-carousel";
import { RequestsServed } from "@/components/requests-served";
import { ReviewForm } from "@/components/review-form";
import { buttonVariants } from "@/components/ui/button";
import { UsageOverview } from "@/components/usage/usage-overview";
import { SITE_NAME } from "@/lib/constants";
import { COUNT_ID, db } from "@/lib/db";
import { social } from "@/lib/social-links";
import { getUsageStats } from "@/lib/usage-stats";

const title = "Usage";

export const metadata: Metadata = {
  title,
  // Only the home page has a description; search engines write their own
  // snippet for the rest. Null, as leaving it out would inherit the home page's.
  description: null,
  alternates: { canonical: "/usage" },
  // No titles here: Next fills them in from `title`, the same as the tab.
  openGraph: { url: "/usage", images: ["/og.png"] },
  twitter: { images: ["/og.png"] },
};

// The count and charts are read again at most once a minute, not on every visit.
export const revalidate = 60;

/**
 * How many requests the site has served. Null when there's no database or it
 * can't be reached, so the page still loads.
 */
async function getRequestsServed(): Promise<number | null> {
  if (!db) return null;
  try {
    const count = await db.count.findUnique({ where: { id: COUNT_ID } });
    // The migration makes the row; without it there's no count to show.
    return count?.value ?? null;
  } catch (error) {
    console.error("Couldn't read the requests served", error);
    return null;
  }
}

export default async function Page() {
  const [requestsServed, stats] = await Promise.all([
    getRequestsServed(),
    getUsageStats(),
  ]);

  return (
    <div className="mx-auto mt-4 w-full max-w-5xl px-4 py-6 sm:mt-8 sm:py-10">
      <header className="max-w-208">
        <h1 className="text-3xl font-black tracking-tight sm:text-4xl">Usage</h1>
        <p className="mt-3 text-base leading-relaxed text-muted-foreground">
          {SITE_NAME} is free and runs right in your browser, with nothing to
          install or sign up for. Here are some of the channels that use it to
          synchronize their lyrics, and how much it gets used.
        </p>
      </header>

      {/* The full width of the page, wider than the text above. */}
      <section className="mt-10">
        <ChannelCarousel label={`Channels that use ${SITE_NAME}`} />
      </section>

      <div className="mt-10 grid gap-4 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <RequestsServed count={requestsServed} />

        <section
          aria-labelledby="featured-heading"
          className="flex flex-col rounded-2xl border bg-card p-6 shadow-xs sm:p-8"
        >
          <h2 id="featured-heading" className="text-lg font-bold tracking-tight">
            Use it on your channel?
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Send us a link to your channel to be featured above.
          </p>
          {/* Pinned to the bottom, level with the number beside it. */}
          <div className="mt-auto pt-6">
            <a
              href={`${social.email.link}?subject=${encodeURIComponent("Feature my channel")}`}
              className={buttonVariants({ size: "lg" })}
            >
              <Mail aria-hidden />
              Get featured
            </a>
          </div>
        </section>
      </div>

      {/* Left out without a database, as there's nothing to chart. */}
      {stats && (
        <section aria-labelledby="numbers-heading" className="mt-12 sm:mt-16">
          <h2
            id="numbers-heading"
            className="text-2xl font-black tracking-tight sm:text-3xl"
          >
            Statistics
          </h2>
          <p className="mt-3 max-w-208 text-base leading-relaxed text-muted-foreground">
            A look at how the site gets used, from the files people save.
          </p>
          <UsageOverview stats={stats} className="mt-6" />
        </section>
      )}

      <section className="mt-12 sm:mt-16">
        {/* Styled like the page's heading, one size down. */}
        <h2
          id="review-heading"
          className="text-2xl font-black tracking-tight sm:text-3xl"
        >
          Leave a review
        </h2>
        <p className="mt-3 text-base leading-relaxed text-muted-foreground">
          Tell us how you use it.
        </p>
        <ReviewForm aria-labelledby="review-heading" className="mt-6" />
      </section>
    </div>
  );
}
