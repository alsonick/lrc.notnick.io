/**
 * Full-screen notice shown in place of the app below the `sm` breakpoint.
 * The app itself is hidden with CSS in the root layout, so the two stay in
 * sync without any client-side viewport detection.
 */
export function MobileNotice() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-5 px-6 py-12 text-center sm:hidden">
      <div className="space-y-2">
        <h1 className="text-xl font-semibold tracking-tight">
          Sorry, this screen size isn&apos;t supported.
        </h1>
      </div>
    </main>
  );
}
