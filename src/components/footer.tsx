import { FooterLink } from "@/components/footer-link";
import { FULL_NAME } from "@/lib/constants";
import { social } from "@/lib/social-links";

export function Footer() {
  return (
    <footer className="mx-auto mt-5 flex w-full max-w-5xl items-center justify-between border-t border-neutral-200 px-4 pt-10 pb-2">
      <div className="flex flex-col gap-0.5 text-xs text-neutral-500">
        <h2 className="text-base font-bold text-neutral-600 sm:text-lg">
          {FULL_NAME}
        </h2>
        <p>&copy; {new Date().getFullYear()} | All rights reserved.</p>
        <p>
          Made with{" "}
          <FooterLink link="https://nextjs.org/" title="Next.js">
            Next.js
          </FooterLink>
          ,{" "}
          <FooterLink link="https://tailwindcss.com/" title="Tailwind">
            Tailwind
          </FooterLink>{" "}
          &amp;{" "}
          <FooterLink link="https://vercel.com/" title="Vercel">
            Vercel
          </FooterLink>
          .
        </p>
        <p>
          Built with <span aria-label="love">❤️</span> by{" "}
          <FooterLink link={social.website.link} title={FULL_NAME}>
            {FULL_NAME}
          </FooterLink>
          .
        </p>
      </div>
    </footer>
  );
}
