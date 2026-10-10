"use client";

import { toast } from "sonner";

/** A colour on the Assets page. Clicking the swatch copies its hex code. */
export function ColorSwatch({ name, hex }: { name: string; hex: string }) {
  async function copy() {
    try {
      await navigator.clipboard.writeText(hex);
      toast.success(`Copied ${hex}`);
    } catch {
      toast.error("Couldn't copy. Select the code and copy it by hand.");
    }
  }

  return (
    <li className="overflow-hidden rounded-xl border bg-card">
      <button
        type="button"
        onClick={copy}
        aria-label={`${name} ${hex}: copy the hex code`}
        className="group block w-full cursor-pointer text-left outline-none focus-visible:ring-3 focus-visible:ring-ring focus-visible:ring-inset"
      >
        {/* The line under it keeps white and near-white swatches visible. */}
        <span
          aria-hidden
          className="block h-24 border-b"
          style={{ backgroundColor: hex }}
        />
        <span className="flex items-baseline justify-between gap-3 px-4 py-3">
          <span className="font-semibold">{name}</span>
          <span className="font-mono text-xs text-muted-foreground transition-colors group-hover:text-foreground">
            {hex}
          </span>
        </span>
      </button>
    </li>
  );
}
