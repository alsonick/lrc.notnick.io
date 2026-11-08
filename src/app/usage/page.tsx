import type { Metadata } from "next";
import { Mail } from "react-feather";

import { ChannelCarousel } from "@/components/channel-carousel";
import { RequestsServed } from "@/components/requests-served";
import { ReviewForm } from "@/components/review-form";
import { buttonVariants } from "@/components/ui/button";
import { SITE_NAME } from "@/lib/constants";
import { COUNT_ID, db } from "@/lib/db";
import { social } from "@/lib/social-links";

const title = "Usage";
const description = `The channels that use ${SITE_NAME}, how much it gets used, and a place to leave a review.`;

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/usage" },
  openGraph: {
    title,
    description,
    url: "/usage",
    images: ["/og.png"],
  },
  twitter: {
    title,
    description,
    images: ["/og.png"],
  },
};

// The count is read again at most once a minute, not on every visit.
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
  const requestsServed = await getRequestsServed();

  return (
    <div className="mx-auto w-full max-w-5xl mt-8 px-4 py-6 sm:py-10">
      <header className="max-w-208">
        <h1 className="text-4xl font-black tracking-tight">Usage</h1>
        <p className="mt-3 text-base leading-relaxed text-muted-foreground">
          {SITE_NAME} is free and runs right in your browser, with nothing to
          install or sign up for. Here are some of the channels that use it to
          time their lyrics, and how much it gets used.
        </p>
      </header>

      {/* The full width of the page, wider than the text above. */}
      <section aria-labelledby="channels-heading" className="mt-10">
        <h2
          id="channels-heading"
          className="text-base font-medium text-muted-foreground"
        >
          YouTube channels that use this service:
        </h2>
        <ChannelCarousel
          label={`Channels that use ${SITE_NAME}`}
          // With the carousel's own padding, the same gap as before.
          className="mt-3"
        />
      </section>

      <div className="mt-10 grid gap-4 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <RequestsServed count={requestsServed} />

        <section
          aria-labelledby="featured-heading"
          className="flex flex-col rounded-2xl border bg-card p-8 shadow-xs"
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

      <section className="mt-16">
        {/* Styled like the page's heading, one size down. */}
        <h2
          id="review-heading"
          className="text-3xl font-black tracking-tight"
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
