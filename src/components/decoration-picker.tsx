"use client";

import type { ComponentProps } from "react";
import { useSyncExternalStore } from "react";
import { Radio } from "@base-ui/react/radio";
import { RadioGroup } from "@base-ui/react/radio-group";
import { CloudSnow, Slash } from "react-feather";

import {
  SEGMENTED_GROUP_CLASS,
  SEGMENTED_ITEM_CLASS,
} from "@/components/ui/segmented";
import {
  currentDecoration,
  pickDecoration,
  prepareSnow,
  type DecorationChoice,
} from "@/lib/decorations";
import { subscribeToSettings } from "@/lib/settings";

const OPTIONS = [
  { value: "none", label: "None", icon: Slash },
  { value: "halloween", label: "Halloween", icon: PumpkinIcon },
  { value: "christmas", label: "Christmas", icon: CloudSnow },
] as const;

/**
 * None / Halloween / Christmas as one row of choices, like the theme picker.
 * It opens on whatever is showing, and a pick takes effect straight away.
 * None and the Decorations switch are the same thing: picking None switches
 * decorations off, and picking one of the others switches them back on.
 * Only render it on the client: what is showing isn't known on the server.
 */
export function DecorationPicker({
  enabled,
  onEnabledChange,
}: {
  /** The Decorations switch. */
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
}) {
  const decoration = useSyncExternalStore(
    subscribeToSettings,
    currentDecoration,
    () => "none" as DecorationChoice,
  );

  function choose(choice: DecorationChoice) {
    if (choice === "none") {
      onEnabledChange(false);
      return;
    }
    pickDecoration(choice);
    if (!enabled) onEnabledChange(true);
  }

  return (
    <RadioGroup
      value={enabled ? decoration : "none"}
      onValueChange={(value) => choose(value as DecorationChoice)}
      aria-label="Decoration"
      className={SEGMENTED_GROUP_CLASS}
    >
      {OPTIONS.map((option) => (
        <Radio.Root
          key={option.value}
          value={option.value}
          className={SEGMENTED_ITEM_CLASS}
          // The snow comes from a script; fetch it as the pointer or the
          // keyboard arrives, so the switch itself doesn't wait for it.
          {...(option.value === "christmas"
            ? { onPointerEnter: prepareSnow, onFocus: prepareSnow }
            : {})}
        >
          <option.icon aria-hidden />
          {option.label}
        </Radio.Root>
      ))}
    </RadioGroup>
  );
}

/** A pumpkin drawn like the Feather icons beside it; Feather has none. */
function PumpkinIcon(props: ComponentProps<"svg">) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <ellipse cx="12" cy="14" rx="9" ry="7" />
      <ellipse cx="12" cy="14" rx="3.5" ry="7" />
      <path d="M12 7c0-2 1-3.5 3-4" />
    </svg>
  );
}
