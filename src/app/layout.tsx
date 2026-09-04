import type { Metadata, Viewport } from "next";
import { Geist_Mono, Inter } from "next/font/google";

import { Footer } from "@/components/footer";
import { SiteHeader } from "@/components/site-header";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import {
  FULL_NAME,
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_TITLE,
  SITE_URL,
  THEME_COLOR,
} from "@/lib/constants";
import { social } from "@/lib/social-links";

import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// The uploaded artwork is used as-is so it stays sharp; platforms crop the
// white margins to their own ratio.
const OG_IMAGE = {
  url: "/og.png",
  width: 5632,
  height: 3232,
  alt: `${SITE_NAME} by ${FULL_NAME}`,
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_TITLE,
    template: `%s · ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: [
    "LRC generator",
    "free online LRC generator",
    "LRC maker",
    "LRC creator",
    "LRC editor",
    "LRC file",
    "synced lyrics",
    "synchronized lyrics",
    "timed lyrics",
    "lyrics timestamps",
    "karaoke lyrics",
    "lyrics for media players",
  ],
  authors: [{ name: FULL_NAME, url: social.website.link }],
  creator: FULL_NAME,
  publisher: FULL_NAME,
  category: "music",
  formatDetection: { telephone: false },
  openGraph: {
    type: "website",
    url: "/",
    siteName: SITE_NAME,
    locale: "en_US",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: [OG_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: [OG_IMAGE],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
};

export const viewport: Viewport = {
  themeColor: THEME_COLOR,
  width: "device-width",
  initialScale: 1,
};

const author = { "@type": "Person", name: FULL_NAME, url: social.website.link };

// WebSite gives search engines the site name to show above the URL; the
// WebApplication entry describes the tool itself.
const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: SITE_URL,
      name: SITE_NAME,
      alternateName: ["LRC Maker", "LRC Creator", "LRC File Generator"],
      description: SITE_DESCRIPTION,
      inLanguage: "en",
      publisher: author,
    },
    {
      "@type": "WebApplication",
      "@id": `${SITE_URL}/#app`,
      name: SITE_NAME,
      url: SITE_URL,
      description: SITE_DESCRIPTION,
      image: `${SITE_URL}/og.png`,
      applicationCategory: "MultimediaApplication",
      operatingSystem: "Any",
      browserRequirements: "Requires JavaScript",
      isAccessibleForFree: true,
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      author,
      featureList: [
        "Paste lyrics from any site and strip section headers",
        "Add a timestamp to each line while the song plays",
        "Undo and rewind to fix timing mistakes",
        "Download a synchronized .lrc file for media players and karaoke apps",
      ],
    },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-neutral-100 text-foreground">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
        <TooltipProvider>
          <SiteHeader />
          <main className="flex flex-1 flex-col">{children}</main>
          <Footer />
        </TooltipProvider>
        <Toaster position="bottom-center" richColors />
      </body>
    </html>
  );
}
