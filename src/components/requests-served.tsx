import { Activity } from "react-feather";

import { cn } from "@/lib/utils";

/**
 * How many requests the site has served, large, on a box in the brand's
 * greens. The text is dark: white only reaches about 2:1 on the bright green.
 */
export function RequestsServed({
  count,
  className,
}: {
  /** Null when it couldn't be counted: a dash stands in for the number. */
  count: number | null;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative isolate flex flex-col overflow-hidden rounded-2xl bg-linear-to-br from-primary via-emerald-500 to-teal-600 p-8 text-neutral-950 shadow-lg ring-1 ring-black/10 sm:p-10",
        className,
      )}
    >
      {/* A soft light in the top corner, so the gradient has some depth. */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_85%_0%,rgba(255,255,255,0.35),transparent_55%)]"
      />
      <div className="flex items-center justify-between gap-4">
        <p className="flex items-center gap-2 text-sm font-semibold">
          <Activity aria-hidden className="size-4" />
          Requests served
        </p>
        {/* A pulsing dot: it's counting as files are saved. Left off when
            there's no count, which would make it a false promise. */}
        {count !== null && (
          <span className="relative flex size-2.5">
            {/* Dark, like the text. The ring is faint, as a strong dark ring
                comes out a muddy smudge on the green. */}
            <span
              aria-hidden
              className="absolute inline-flex size-full rounded-full bg-neutral-950/35 motion-safe:animate-ping"
            />
            <span
              aria-hidden
              className="relative inline-flex size-full rounded-full bg-neutral-950"
            />
            <span className="sr-only">Live</span>
          </span>
        )}
      </div>
      {/* At the foot of the box, however tall the row makes it. */}
      <div className="mt-auto pt-8">
        <p className="text-5xl font-black tracking-tight tabular-nums sm:text-6xl">
          {count === null ? (
            <>
              <span aria-hidden>—</span>
              <span className="sr-only">Not available right now</span>
            </>
          ) : (
            <data value={count}>{count.toLocaleString("en-US")}</data>
          )}
        </p>
      </div>
    </div>
  );
}
