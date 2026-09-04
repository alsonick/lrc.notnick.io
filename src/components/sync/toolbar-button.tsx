import type { ComponentProps } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Dark, chunky button used in the synchronizer's bottom toolbar. */
export function ToolbarButton({
  className,
  ...props
}: ComponentProps<typeof Button>) {
  return (
    <Button
      type="button"
      variant="outline"
      className={cn(
        "h-10 gap-2 rounded-md border-neutral-700 bg-neutral-900 px-3 text-sm font-medium text-neutral-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] hover:border-neutral-600 hover:bg-neutral-800 hover:text-white disabled:opacity-40 [&_svg]:size-4",
        className,
      )}
      {...props}
    />
  );
}
