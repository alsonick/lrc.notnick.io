import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";

import { SITE_NAME, SITE_URL } from "@/lib/constants";

const title = "Privacy Policy";
const description = `What ${SITE_NAME} keeps in your browser, what it logs, and how to switch that off.`;

const EFFECTIVE_DATE = "8 Oct 2026";
/** Change this whenever the policy's substance changes. */
const LAST_UPDATED = "8 Oct 2026";
const CONTACT_EMAIL = "hi@notnick.io";

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

/**
 * The privacy policy. It describes what the code does, so it has to change
 * with it: the download log's fields live in `src/lib/session-log.ts` and the
 * feedback form's in `src/lib/feedback.ts`.
 */
export default function Page() {
  return (
    <div className="mx-auto w-full max-w-5xl mt-8 px-4 py-6 sm:py-10">
      <article className="max-w-208">
        <h1 className="text-4xl font-black tracking-tight">
          Privacy Policy
        </h1>
        <p className="mt-2 text-base text-muted-foreground">
          Effective Date: {EFFECTIVE_DATE} • Last Updated: {LAST_UPDATED}
        </p>

        <p className="mt-6 text-base leading-relaxed text-muted-foreground">
          Thank you for visiting{" "}
          <Link href="/" className={LINK_CLASS}>
            {new URL(SITE_URL).host}
          </Link>{" "}
          ({SITE_NAME}) (“we”, “our”, or “us”). Your privacy matters to us.
          This Privacy Policy outlines what data we collect (if any), how it’s
          used, and your rights.
        </p>

        <Section title="What We Collect">
          <p>
            Your lyrics and your audio never leave your browser. We do however
            log usage statistics.
          </p>
          <p>
            You can turn this off at any time: open <Strong>Settings</Strong>{" "}
            (the gear icon in the header) and switch <Strong>Log</Strong> off.
            From then on, nothing more is logged from that browser. Your
            choice is saved in your browser, and you can switch it back on
            whenever you like.
          </p>
          <p>These statistics may include:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>File type and name</li>
            <li>Audio name and length</li>
            <li>Theme and language</li>
            <li>Time on page</li>
            <li>Number of files saved</li>
            <li>Browser and OS</li>
          </ul>
        </Section>

        <Section title="Analytics and Cookies">
          <p>
            We do not use cookies, advertising or third-party analytics. Your
            settings are saved in your browser only.
          </p>
        </Section>

        <Section title="Changes To This Policy">
          <p>
            This Privacy Policy may be updated or revised from time to time to
            reflect changes in our practices, technology, legal requirements,
            or for other operational reasons. When we make changes, we will
            update the “Effective Date” at the top of this page to indicate
            when those changes take effect. We encourage you to review this
            Privacy Policy periodically to stay informed about how we are
            protecting your information and improving our services.
          </p>
        </Section>

        <Section title="Contact">
          <p>
            For any questions, or about anything you
            have sent us, feel free to reach out:{" "}
            <a href={`mailto:${CONTACT_EMAIL}`} className={LINK_CLASS}>
              {CONTACT_EMAIL}
            </a>

          </p>
        </Section>
      </article>
    </div>
  );
}

const LINK_CLASS =
  "rounded-xs text-foreground underline underline-offset-3 outline-none transition-colors hover:text-primary focus-visible:ring-3 focus-visible:ring-ring";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-8 space-y-3 text-base leading-relaxed text-muted-foreground">
      <h2 className="text-xl font-bold tracking-tight text-foreground">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Strong({ children }: { children: ReactNode }) {
  return <strong className="font-medium text-foreground">{children}</strong>;
}
