"use client";

import { useId, type ReactNode } from "react";

import { Switch } from "@/components/ui/switch";

type Props = {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  /** What the switch does: read out after its name, and shown on hover. */
  description: string;
  /** The name, shown beside the switch. */
  children: ReactNode;
};

/**
 * A switch for the synchronizer's dark toolbar, as tall as the buttons
 * around it. Its name is a label, so clicking that flips it too.
 */
export function ToolbarSwitch({
  checked,
  onCheckedChange,
  description,
  children,
}: Props) {
  const id = useId();
  const descriptionId = useId();

  return (
    <div
      title={description}
      className="flex h-10 items-center rounded-md border border-neutral-700 bg-neutral-900 pl-3 text-sm font-medium text-neutral-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] transition-colors hover:border-neutral-600 hover:bg-neutral-800"
    >
      {/* A real button rather than the usual span. Once a button has been
          clicked, the page's shortcuts take Enter and Space back for
          stamping; a span handles those keys itself, before the page sees
          them, so one clicked mid-song would flip at the next Space. */}
      <Switch
        id={id}
        nativeButton
        render={<button type="button" />}
        checked={checked}
        onCheckedChange={onCheckedChange}
        aria-describedby={descriptionId}
        className="bg-white/25 data-checked:bg-primary"
      />
      {/* Beside the switch, not around it: a label may only hold the one
          control it names, and the switch brings a hidden checkbox along. */}
      <label
        htmlFor={id}
        className="flex h-full cursor-pointer items-center pr-3 pl-2.5 select-none"
      >
        {children}
      </label>
      <span id={descriptionId} className="sr-only">
        {description}
      </span>
    </div>
  );
}
