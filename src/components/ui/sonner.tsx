"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import {
  AlertTriangle,
  CheckCircle,
  Info,
  Loader,
  XOctagon,
} from "react-feather"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      closeButton
      icons={{
        success: (
          <CheckCircle aria-hidden className="size-4" />
        ),
        info: (
          <Info aria-hidden className="size-4" />
        ),
        warning: (
          <AlertTriangle aria-hidden className="size-4" />
        ),
        error: (
          <XOctagon aria-hidden className="size-4" />
        ),
        loading: (
          <Loader aria-hidden className="size-4 animate-spin" />
        ),
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: "cn-toast",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
