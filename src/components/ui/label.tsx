"use client"

import * as React from "react"
import { cn } from "cn"

function Label({
  className,
  required,
  children,
  ...props
}: React.ComponentProps<"label"> & { required?: boolean }) {
  return (
    <label
      data-slot="label"
      className={cn(
        "flex items-center gap-2 text-sm leading-none font-medium select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
        className
      )}
      {...props}
    >
      {children}
      {/* Screen readers already hear "required" from the field itself, so the
          asterisk is only for sighted visitors. The negative margin pulls it
          up against the label text instead of the usual gap. */}
      {required && (
        <span aria-hidden className="-ml-1.5 text-destructive">
          *
        </span>
      )}
    </label>
  )
}

export { Label }
