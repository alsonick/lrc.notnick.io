"use client"

import { Slider as SliderPrimitive } from "@base-ui/react/slider"
import { cn } from "cn"

/** Single-thumb slider. A range slider would need one `Thumb` per value. */
function Slider({
  className,
  "aria-label": ariaLabel,
  ...props
}: SliderPrimitive.Root.Props<number>) {
  return (
    <SliderPrimitive.Root
      data-slot="slider"
      className={cn(
        "relative flex w-full touch-none items-center select-none data-disabled:opacity-50",
        className
      )}
      {...props}
    >
      <SliderPrimitive.Control
        data-slot="slider-control"
        className="flex w-full items-center px-[7px] py-1.5"
      >
        <SliderPrimitive.Track
          data-slot="slider-track"
          className="h-1.5 w-full rounded-full bg-primary/20"
        >
          <SliderPrimitive.Indicator
            data-slot="slider-indicator"
            className="rounded-full bg-primary"
          />
          <SliderPrimitive.Thumb
            data-slot="slider-thumb"
            aria-label={ariaLabel}
            className="size-3.5 rounded-full bg-white ring-1 ring-black/25 transition-[box-shadow] has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary data-dragging:ring-2 data-dragging:ring-primary"
          />
        </SliderPrimitive.Track>
      </SliderPrimitive.Control>
    </SliderPrimitive.Root>
  )
}

export { Slider }
