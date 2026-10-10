import { statSync } from "node:fs";
import path from "node:path";
import type { Metadata } from "next";
import Image from "next/image";
import type { ReactNode } from "react";
import { ArrowDown, ArrowUpRight } from "react-feather";

import { ColorSwatch } from "@/components/assets/color-swatch";
import { SITE_NAME } from "@/lib/constants";
import { cn } from "@/lib/utils";

const title = "Assets";
const description = `The ${SITE_NAME} logo as SVG and PNG, with its colours and type.`;

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/assets" },
  openGraph: {
    title,
    description,
    url: "/assets",
    images: ["/og.png"],
  },
  twitter: {
    title,
    description,
    images: ["/og.png"],
  },
};

type Logo = {
  name: string;
  use: string;
  /** File name inside `public/assets`, without the size or extension. */
  base: string;
};

const LOGOS: Logo[] = [
  {
    name: "Logo",
    use: "The default, with its corners already rounded. Use it wherever the logo stands on its own.",
    base: "lrc-generator-logo",
  },
  {
    name: "Square",
    use: "Edge to edge, for places that round the corners themselves: app icons, avatars and favicons.",
    base: "lrc-generator-logo-square",
  },
];

/** Every logo comes in these three files. */
const FORMATS = [
  { suffix: ".svg", label: "SVG" },
  { suffix: "-1024.png", label: "PNG 1024" },
  { suffix: "-2048.png", label: "PNG 2048" },
];

const COLOURS = [
  { name: "Green", hex: "#30D158" },
  { name: "Ink", hex: "#171717" },
  { name: "Night", hex: "#0A0A0A" },
  { name: "Paper", hex: "#F5F5F5" },
  { name: "White", hex: "#FFFFFF" },
];

const FONTS = [
  {
    name: "Inter",
    className: "font-sans",
    use: "Everything you read: headings, buttons and the lyrics themselves.",
    weights: "Regular, Medium, Semibold, Black",
    href: "https://fonts.google.com/specimen/Inter",
  },
  {
    name: "Geist Mono",
    className: "font-mono",
    use: "Timestamps, file names and the two files in the Edit panel.",
    weights: "Regular, Medium",
    href: "https://fonts.google.com/specimen/Geist+Mono",
  },
];

/** Size on disk, read at build time so the page never goes stale. */
function fileSize(file: string): string {
  const bytes = statSync(
    path.join(process.cwd(), "public", "assets", file),
  ).size;
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  return `${kb < 10 ? kb.toFixed(1) : Math.round(kb)} KB`;
}

const CARD_CLASS = "overflow-hidden rounded-xl border bg-card";
const RING_CLASS =
  "outline-none focus-visible:ring-3 focus-visible:ring-ring";

export default function Page() {
  return (
    <div className="mx-auto w-full max-w-5xl mt-8 px-4 py-6 sm:py-10">
      <h1 className="text-4xl font-black tracking-tight">Assets</h1>

      <Section
        title="Logo"
        intro="A green tile with a list of lyric lines, rounded or square, as SVG or PNG."
      >
        <ul className="grid gap-4 md:grid-cols-2">
          {LOGOS.map((logo) => (
            <li key={logo.base} className={CARD_CLASS}>
              {/* Always the SVG, so the preview is sharp at any size. */}
              <a
                href={`/assets/${logo.base}.svg`}
                download
                aria-label={`Download the ${logo.name.toLowerCase()} logo as SVG`}
                className={cn(
                  "group relative flex items-center justify-center bg-muted/40 p-12 ring-inset",
                  RING_CLASS,
                )}
              >
                <Image
                  src={`/assets/${logo.base}.svg`}
                  alt=""
                  width={144}
                  height={144}
                  unoptimized
                  className="size-36"
                />
                <span
                  aria-hidden
                  className="absolute right-3 bottom-3 flex items-center gap-1 rounded-full bg-foreground px-2.5 py-1 text-xs font-medium text-background opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
                >
                  <ArrowDown className="size-3 transform-none" />
                  Download
                </span>
              </a>
              <div className="border-t p-4">
                <h3 className="font-semibold">{logo.name}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{logo.use}</p>
                <ul className="mt-3 flex flex-wrap gap-2">
                  {FORMATS.map((format) => (
                    <li key={format.suffix}>
                      <a
                        href={`/assets/${logo.base}${format.suffix}`}
                        download
                        aria-label={`${logo.name}, ${format.label}`}
                        title={fileSize(`${logo.base}${format.suffix}`)}
                        className={cn(
                          "inline-flex min-h-6 items-center rounded-full bg-muted px-2.5 text-xs font-medium transition-colors hover:bg-foreground hover:text-background",
                          RING_CLASS,
                        )}
                      >
                        {format.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </li>
          ))}
        </ul>
      </Section>

      <Section
        title="Colour"
        intro="Green does the talking and the neutrals stay out of its way. Click a swatch to copy its hex code."
      >
        <ul className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
          {COLOURS.map((colour) => (
            <ColorSwatch key={colour.hex} {...colour} />
          ))}
        </ul>
      </Section>

      <Section
        title="Type"
        intro="Two typefaces, both free: one for words and one for anything a machine reads."
      >
        <ul className="grid gap-4 md:grid-cols-2">
          {FONTS.map((font) => (
            <li key={font.name} className={cn(CARD_CLASS, "p-6")}>
              <p
                aria-hidden
                className={cn("text-6xl font-semibold", font.className)}
              >
                Aa
              </p>
              <h3 className="mt-6 font-semibold">{font.name}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{font.use}</p>
              <p className="mt-3 text-xs text-muted-foreground">{font.weights}</p>
              <a
                href={font.href}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  "mt-4 inline-flex min-h-6 items-center gap-1 rounded-xs text-sm font-medium underline underline-offset-3 transition-colors hover:text-green-700 dark:hover:text-primary",
                  RING_CLASS,
                )}
              >
                Get it from Google Fonts
                <ArrowUpRight aria-hidden className="size-3.5 transform-none" />
              </a>
            </li>
          ))}
        </ul>
      </Section>
    </div>
  );
}

/** A part of the page: a rule, a big title and a line under it. */
function Section({
  title,
  intro,
  children,
}: {
  title: string;
  intro: string;
  children: ReactNode;
}) {
  return (
    <section className="mt-14 border-t pt-12">
      <h2 className="text-3xl font-black tracking-tight">{title}</h2>
      <p className="mt-2 max-w-208 text-base text-muted-foreground">{intro}</p>
      <div className="mt-8">{children}</div>
    </section>
  );
}
