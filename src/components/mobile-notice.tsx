import { Logo } from "@/components/logo";

/**
 * Full-screen notice shown in place of the app below the `sm` breakpoint.
 * The app itself is hidden with CSS in the root layout, so the two stay in
 * sync without any client-side viewport detection.
 */
export function MobileNotice() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-5 px-6 py-12 text-center sm:hidden">
      <Logo className="size-14" />
      <div className="space-y-2">
        <p className="text-xl font-light tracking-tight">
          Mobile view isn&apos;t supported
        </p>
        <p className="mx-auto max-w-xs text-sm leading-relaxed text-muted-foreground">
          This is awkward! This site only supports desktop size screens, sorry!
        </p>
      </div>
    </div>
  );
}
