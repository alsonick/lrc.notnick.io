"use client";

import type { ComponentProps } from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";

import { THEME_KEY } from "@/lib/settings";

/** Light / dark / system, persisted like the app's other settings. */
export function ThemeProvider(
  props: ComponentProps<typeof NextThemesProvider>,
) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      storageKey={THEME_KEY}
      {...props}
    />
  );
}
