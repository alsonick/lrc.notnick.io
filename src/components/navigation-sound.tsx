"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

import { playClick, prepareClick, unlockClick } from "@/lib/click-sound";

/** A page change this soon after a link's click is that same click. */
const SAME_CLICK_MS = 1000;

/**
 * Plays a click whenever the visitor moves to another page of the site. A
 * link clicks as it is pressed; anything else that changes the page (a
 * button that navigates, the browser's back and forward) clicks as the new
 * page arrives.
 */
export function NavigationSound() {
  const pathname = usePathname();
  const arrived = useRef(pathname);
  const lastClick = useRef(-Infinity);

  useEffect(() => {
    void prepareClick();

    // The first click or key press is what lets the browser play sound.
    const unlock = () => {
      unlockClick();
      window.removeEventListener("pointerdown", unlock, true);
      window.removeEventListener("keydown", unlock, true);
    };
    window.addEventListener("pointerdown", unlock, true);
    window.addEventListener("keydown", unlock, true);

    // In the capture phase, so it runs before the link starts navigating.
    const onClick = (event: MouseEvent) => {
      if (event.button !== 0) return;
      // These open the link somewhere else and leave this page where it is.
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }
      const target = event.target instanceof Element ? event.target : null;
      const link = target?.closest<HTMLAnchorElement>("a[href]");
      if (!link || link.target === "_blank" || link.hasAttribute("download")) {
        return;
      }
      const url = new URL(link.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      // The same page (a skip link, say) isn't a move.
      if (url.pathname === window.location.pathname) return;
      lastClick.current = performance.now();
      playClick();
    };
    document.addEventListener("click", onClick, true);

    return () => {
      window.removeEventListener("pointerdown", unlock, true);
      window.removeEventListener("keydown", unlock, true);
      document.removeEventListener("click", onClick, true);
    };
  }, []);

  useEffect(() => {
    if (arrived.current === pathname) return;
    arrived.current = pathname;
    if (performance.now() - lastClick.current > SAME_CLICK_MS) playClick();
  }, [pathname]);

  return null;
}
