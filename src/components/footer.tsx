import { useId, type ReactNode } from "react";
import Link from "next/link";
import { ArrowUpRight, Mail } from "react-feather";

import { FeedbackDialog } from "@/components/feedback-dialog";
import { GitHubIcon } from "@/components/github-icon";
import { Logo } from "@/components/logo";
import { XIcon } from "@/components/x-icon";
import { FULL_NAME, SITE_NAME } from "@/lib/constants";
import { social } from "@/lib/social-links";

const SOCIALS = [
  { ...social.github, icon: GitHubIcon },
  { ...social.x, icon: XIcon },
  { ...social.email, icon: Mail },
];

/** Shared by the links and by Feedback, which is a button that looks like one. */
const LINK_CLASS =
  "group flex w-fit cursor-pointer items-center rounded-xs text-sm whitespace-nowrap text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50";

export function Footer() {
  return (
    <footer className="mx-auto mt-12 w-full max-w-5xl px-4">
      <div className="border-t pt-12 pb-8">
        <div className="flex flex-col gap-10 md:flex-row md:justify-between md:gap-12">
          <div className="max-w-xs">
            <Link
              href="/"
              className="flex w-fit items-center rounded-xs outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <Logo className="size-6" />
              <p className="ml-2 text-lg font-bold tracking-tighter">
                {SITE_NAME}
              </p>
            </Link>
            <div className="mt-5 flex items-center gap-2">
              {SOCIALS.map((item) => (
                <a
                  key={item.link}
                  href={item.link}
                  aria-label={item.title}
                  title={item.title}
                  // Mail links open the mail app; the rest open beside the page.
                  {...(item.link.startsWith("mailto:")
                    ? {}
                    : { target: "_blank", rel: "noopener noreferrer" })}
                  // The marks sit still: no icon hover bounce (see globals.css).
                  className="flex size-8 items-center justify-center rounded-lg border bg-background text-muted-foreground shadow-xs outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 dark:border-input dark:bg-input/30 dark:hover:bg-input/50 [&_svg]:size-4 [&_svg]:transform-none"
                >
                  <item.icon />
                </a>
              ))}
            </div>
          </div>

          <nav
            aria-label="Footer"
            className="flex flex-wrap gap-x-12 gap-y-8 lg:gap-x-16"
          >
            <FooterColumn title="Product">
              <FooterLink href="/sync">Synchronize</FooterLink>
              <FooterLink href="/assets">Assets</FooterLink>
              <FooterLink href="/">Editor</FooterLink>
            </FooterColumn>
            <FooterColumn title="Support">
              <FooterLink href={`${social.github.link}/issues/new`}>
                Submit Suggestion
              </FooterLink>
              <FooterLink href="/privacy">Privacy Policy</FooterLink>
              <li>
                <FeedbackDialog plain className={LINK_CLASS} />
              </li>
            </FooterColumn>
          </nav>
        </div>

        <div className="mt-12 border-t pt-6 text-sm text-muted-foreground">
          <p>
            &copy; {new Date().getFullYear()} {FULL_NAME} · MIT License
          </p>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  const id = useId();

  return (
    <div>
      <p
        id={id}
        className="text-xs font-semibold tracking-wider text-muted-foreground/70 uppercase"
      >
        {title}
      </p>
      <ul aria-labelledby={id} className="mt-4 flex flex-col gap-2.5">
        {children}
      </ul>
    </div>
  );
}

/** A page of this site, or another site, which opens beside it with an arrow on hover. */
function FooterLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <li>
      {href.startsWith("/") ? (
        <Link href={href} className={LINK_CLASS}>
          {children}
        </Link>
      ) : (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className={LINK_CLASS}
        >
          {children}
          <ArrowUpRight
            aria-hidden
            className="ml-1 size-3.5 transform-none opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
          />
        </a>
      )}
    </li>
  );
}
