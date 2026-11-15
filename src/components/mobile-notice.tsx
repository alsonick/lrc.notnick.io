"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

/**
 * Pages that need a desktop-sized screen: the editor and the synchronizer.
 * Every other page works at any width.
 */
const DESKTOP_ONLY = new Set(["/", "/sync"]);

/**
 * Wraps a page's content. On a desktop-only page, below the `sm` breakpoint,
 * the content is hidden with CSS and a notice shows in its place; the header
 * and footer stay so the rest of the site can still be reached. CSS rather
 * than viewport detection, so the server's HTML is already right.
 */
export function DesktopOnly({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  if (!DESKTOP_ONLY.has(pathname)) return children;

  return (
    <>
      {/* `contents`, so on desktop the page sits in `main` as if unwrapped. */}
      <div className="hidden sm:contents">{children}</div>
      <MobileNotice />
    </>
  );
}

function MobileNotice() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center sm:hidden">
      <h1 className="text-xl font-semibold tracking-tight">
        Sorry, this screen size isn&apos;t supported.
      </h1>
      <p className="mt-2 max-w-xs text-sm text-muted-foreground">
        Open this page on a larger screen to edit and sync lyrics.
      </p>
    </div>
  );
}
