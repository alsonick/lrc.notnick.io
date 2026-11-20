import type { ReactNode } from "react";

import { Kbd } from "@/components/ui/kbd";

/** Keycaps sink quickly while held and spring back on release. */
const KEYCAP_CLASS =
  "[transition:translate_500ms_var(--ease-spring),scale_500ms_var(--ease-spring),color_200ms,background-color_200ms,border-color_200ms] data-pressed:translate-y-px data-pressed:scale-90 data-pressed:border-primary/50 data-pressed:bg-primary/20 data-pressed:text-green-800 data-pressed:duration-75 data-pressed:ease-out motion-reduce:transition-none dark:data-pressed:border-primary/50 dark:data-pressed:bg-primary/20 dark:data-pressed:text-primary";

/** Shortcut hint that sinks while its key is held down. */
export function Keycap({
  pressed,
  children,
}: {
  pressed: boolean;
  children: ReactNode;
}) {
  return (
    <Kbd data-pressed={pressed || undefined} className={KEYCAP_CLASS}>
      {children}
    </Kbd>
  );
}
