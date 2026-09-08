import { statSync } from "node:fs";
import path from "node:path";
import type { Metadata } from "next";
import Image from "next/image";
import { Download } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SITE_NAME } from "@/lib/constants";

const title = "Assets";
const description = `Download the ${SITE_NAME} logo as SVG or high-resolution PNG.`;

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

type Asset = {
  /** File name inside `public/assets`. */
  file: string;
  label: string;
  format: string;
  dimensions: string;
};

const ASSETS: Asset[] = [
  {
    file: "lrc-generator-logo.svg",
    label: "Logo (vector)",
    format: "SVG",
    dimensions: "Any size",
  },
  {
    file: "lrc-generator-logo-2048.png",
    label: "Logo 2048",
    format: "PNG",
    dimensions: "2048 × 2048",
  },
  {
    file: "lrc-generator-logo-1024.png",
    label: "Logo 1024",
    format: "PNG",
    dimensions: "1024 × 1024",
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

export default function Page() {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Assets</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          The {SITE_NAME} logo in SVG and PNG.
        </p>
      </div>

      <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {ASSETS.map((asset) => {
          const href = `/assets/${asset.file}`;
          return (
            <li
              key={asset.file}
              className="flex flex-col overflow-hidden rounded-xl border bg-card"
            >
              <div className="flex items-center justify-center bg-muted/40 p-8">
                <Image
                  src={href}
                  alt={`${SITE_NAME} logo, ${asset.format}`}
                  width={160}
                  height={160}
                  className="size-40"
                />
              </div>
              <div className="flex items-center gap-3 border-t p-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{asset.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {asset.format} · {asset.dimensions} · {fileSize(asset.file)}
                  </p>
                </div>
                <Button
                  variant="outline"
                  nativeButton={false}
                  render={<a href={href} download />}
                >
                  <Download />
                  Download
                </Button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
