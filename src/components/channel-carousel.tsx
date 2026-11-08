"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";

import { cn } from "@/lib/utils";

/** Channels that use the site, with their pictures from `public/channels`. */
const CHANNELS = [
  { name: "Aquila", image: "/channels/aquila.jpg", link: "https://www.youtube.com/channel/UCb8k4_aNhdKVNRyJb8Mif-g" },
  { name: "Latin Union", image: "/channels/latin-union.jpg", link: "https://www.youtube.com/@LatinUnion" },
  { name: "Polaris Lyrics", image: "/channels/polaris.png", link: "https://www.youtube.com/channel/UCVKxhLGZXc0gEOnJhNhAe8A" },
  { name: "SavourTunes", image: "/channels/savourtunes.png", link: "https://www.youtube.com/@savourtunes" },
  { name: "jaded", image: "/channels/jaded.jpg", link: "https://www.youtube.com/channel/UC912uVPZQasVhbdmb1ljN8w" },
  { name: "Sweet Treats", image: "/channels/sweettreats.jpg", link: "https://www.youtube.com/channel/UCLbg8Yn8xKt5304us2BDRfQ" },
  { name: "Boots & Ballads", image: "/channels/boots.png", link: "https://www.youtube.com/channel/UC61p6WWkt1tgYeKlnjs4BTg" },
  { name: "Afterdark", image: "/channels/afterdark.png", link: "https://www.youtube.com/@allafterdark" },
  { name: "Afterglow", image: "/channels/afterglow.png", link: "https://www.youtube.com/@atafterglow" },
];

/**
 * How many times the list goes on the track. The track moves one copy's width
 * and starts over, so the copies after the first must cover the carousel
 * between them: each logo takes 128px with its gap, and the page gets up to
 * about 990px wide. With fewer channels, add copies.
 */
const COPIES = 3;

/**
 * The copy that is the real list, in the middle, so there's a copy on either
 * side of it whichever of its links has to be brought into view.
 */
const LIST_COPY = 1;

/** How fast the logos glide, in pixels a second. */
const SPEED = 40;

/**
 * How quickly it slows down and speeds up: in this many seconds it's about two
 * thirds of the way to its new speed.
 */
const EASE_SECONDS = 0.3;

/** The same, for gliding a channel reached with Tab into the middle. */
const FOCUS_SECONDS = 0.12;

/**
 * The channels, gliding in from the left in an endless loop, fading out at
 * both edges. Each links to the channel, in a new tab. It eases to a stop
 * under the mouse, and while a channel has keyboard focus, which glides that
 * channel to the middle. With less motion asked for, it's still rows instead.
 *
 * It's moved from script rather than a CSS animation: Safari can jump when a
 * CSS animation is paused and resumed, as its copy of the animation and the
 * page's fall out of step. Here there's only one position, moved on each frame.
 */
export function ChannelCarousel({
  label,
  className,
}: {
  /** Names the list for screen readers. */
  label: string;
  className?: string;
}) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const viewport = viewportRef.current;
    const track = trackRef.current;
    if (!viewport || !track) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    /** The width of one copy, the distance before the track starts over. */
    let loop = 0;
    /**
     * Where the track is, in pixels from where it's drawn. While gliding, from
     * one copy to the left up to 0: the same picture either way, so starting
     * over doesn't show.
     */
    let x = 0;
    // It eases in when the page loads rather than starting at full speed.
    let speed = 0;
    let hovered = false;
    let focused = false;
    /** Where to bring the track to, to show a channel reached with Tab. */
    let focusX: number | null = null;
    let onScreen = false;
    let frame = 0;
    let last: number | null = null;

    function measure() {
      const [first, second] = track!.children;
      // Measured between the starts of two copies, so the spacing where they
      // meet is included and nothing is rounded to whole pixels.
      const width =
        second.getBoundingClientRect().left - first.getBoundingClientRect().left;
      if (width > 0) loop = width;
    }

    function tick(now: number) {
      frame = 0;
      // Capped, so a dropped frame or a return to the tab doesn't leap ahead.
      const seconds = last === null ? 0 : Math.min((now - last) / 1000, 0.1);
      last = now;
      let moving: boolean;

      if (focusX !== null) {
        speed = 0;
        x += (focusX - x) * (1 - Math.exp(-seconds / FOCUS_SECONDS));
        if (Math.abs(focusX - x) < 0.5) x = focusX;
        moving = x !== focusX;
      } else {
        const target = hovered || focused ? 0 : SPEED;
        speed += (target - speed) * (1 - Math.exp(-seconds / EASE_SECONDS));
        if (target === 0 && speed < 0.5) speed = 0;
        x += speed * seconds;
        // Back into place by whole copies, which looks the same; after a
        // channel was brought into view, it can be a copy further along.
        if (loop > 0) {
          while (x >= 0) x -= loop;
          while (x < -loop) x += loop;
        }
        moving = speed > 0 || target > 0;
      }
      track!.style.transform = `translate3d(${x}px, 0, 0)`;

      // Stopped: no more frames until something moves it again.
      if (moving) frame = requestAnimationFrame(tick);
      else last = null;
    }

    function start() {
      if (frame || !onScreen || reduceMotion.matches) return;
      frame = requestAnimationFrame(tick);
    }

    function stop() {
      cancelAnimationFrame(frame);
      frame = 0;
      last = null;
    }

    // Only a mouse: a tap counts as hovering until the next tap elsewhere,
    // which would leave it stuck.
    function slow(event: PointerEvent) {
      if (event.pointerType !== "mouse") return;
      hovered = true;
      start();
    }
    function resume(event: PointerEvent) {
      if (event.pointerType !== "mouse") return;
      hovered = false;
      start();
    }

    // Keyboard focus only: a click focuses the link in some browsers, which
    // would keep it stopped after the mouse has gone.
    function focusChannel(event: FocusEvent) {
      const link = event.target as HTMLElement;
      if (!link.matches(":focus-visible")) return;
      focused = true;
      if (reduceMotion.matches) return;
      const view = viewport!.getBoundingClientRect();
      const box = link.getBoundingClientRect();
      // Centres, as a channel may have come to rest under the faded edges.
      focusX =
        x + (view.left + view.width / 2) - (box.left + box.width / 2);
      start();
    }
    function blurChannel(event: FocusEvent) {
      // Tabbing from one channel to the next keeps it stopped.
      if (viewport!.contains(event.relatedTarget as Node | null)) return;
      focused = false;
      focusX = null;
      start();
    }

    function changeMotion() {
      if (reduceMotion.matches) {
        stop();
        track!.style.transform = "";
      } else {
        measure();
        start();
      }
    }

    // Nothing runs while it's scrolled out of view.
    const visibility = new IntersectionObserver(([entry]) => {
      onScreen = entry.isIntersecting;
      if (onScreen) start();
      else stop();
    });
    const resize = new ResizeObserver(measure);

    measure();
    visibility.observe(viewport);
    resize.observe(track);
    viewport.addEventListener("pointerenter", slow);
    viewport.addEventListener("pointerleave", resume);
    viewport.addEventListener("focusin", focusChannel);
    viewport.addEventListener("focusout", blurChannel);
    reduceMotion.addEventListener("change", changeMotion);
    return () => {
      stop();
      visibility.disconnect();
      resize.disconnect();
      viewport.removeEventListener("pointerenter", slow);
      viewport.removeEventListener("pointerleave", resume);
      viewport.removeEventListener("focusin", focusChannel);
      viewport.removeEventListener("focusout", blurChannel);
      reduceMotion.removeEventListener("change", changeMotion);
    };
  }, []);

  return (
    <div
      ref={viewportRef}
      className={cn(
        // Clipped rather than hidden, so it can't be scrolled: focusing a
        // channel out of view would otherwise scroll it, out of step with the
        // track. The padding leaves room for a channel to grow.
        "overflow-clip py-2 mask-[linear-gradient(to_right,transparent,black_6rem,black_calc(100%-6rem),transparent)] motion-reduce:mask-none",
        className,
      )}
    >
      <div
        ref={trackRef}
        className="flex w-max motion-safe:will-change-transform motion-reduce:w-full"
      >
        {Array.from({ length: COPIES }, (_, copy) => {
          // One copy is the list; the rest only fill the loop, so screen
          // readers and Tab skip them, and still motion leaves them out.
          const isList = copy === LIST_COPY;
          return (
            <ul
              key={copy}
              aria-label={isList ? label : undefined}
              aria-hidden={isList ? undefined : true}
              className={cn(
                // The trailing padding matches the gap, so the space where one
                // copy meets the next is the same as between two channels.
                "flex shrink-0 items-center gap-12 pr-12",
                isList
                  ? "motion-reduce:w-full motion-reduce:flex-wrap motion-reduce:justify-center motion-reduce:gap-y-6 motion-reduce:pr-0"
                  : "motion-reduce:hidden",
              )}
            >
              {CHANNELS.map((channel) => (
                <li key={channel.name} className="shrink-0">
                  <a
                    href={channel.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    tabIndex={isList ? undefined : -1}
                    // Grows quickly, then settles gently. Kept on a layer of
                    // its own, so Safari doesn't redraw it as it finishes
                    // growing, which shows as a small snap.
                    className="block rounded-full outline-none will-change-[scale] hover:scale-110 focus-visible:scale-110 focus-visible:ring-3 focus-visible:ring-ring motion-safe:transition-[scale] motion-safe:duration-300 motion-safe:ease-[cubic-bezier(0.22,1,0.36,1)]"
                  >
                    {/* Loaded straight away: lazily, the copies off to the
                        side would come in blank. Drawn larger than shown, so
                        it stays sharp when it grows. */}
                    <Image
                      src={channel.image}
                      alt={channel.name}
                      width={96}
                      height={96}
                      loading="eager"
                      className="size-20 rounded-full object-cover ring-1 ring-foreground/10"
                    />
                    <span className="sr-only">
                      {" "}
                      on YouTube (opens in a new tab)
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          );
        })}
      </div>
    </div>
  );
}
