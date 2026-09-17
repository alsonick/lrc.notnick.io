"use client";

import { useRef } from "react";
import { Volume1, Volume2, VolumeX } from "react-feather";

import { ToolbarButton } from "@/components/sync/toolbar-button";
import { Slider } from "@/components/ui/slider";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type Props = {
  /** Playback volume, 0 (silent) to 1 (full). */
  volume: number;
  onVolumeChange: (volume: number) => void;
};

/**
 * Mute button plus a slider for the synchronizer's toolbar. Muting keeps the
 * previous level so unmuting returns to it instead of blasting full volume.
 */
export function VolumeControl({ volume, onVolumeChange }: Props) {
  const lastAudible = useRef(1);
  const muted = volume === 0;
  const Icon = muted ? VolumeX : volume < 0.5 ? Volume1 : Volume2;
  const label = muted ? "Unmute" : "Mute";

  function toggleMute() {
    if (muted) {
      onVolumeChange(lastAudible.current);
      return;
    }
    lastAudible.current = volume;
    onVolumeChange(0);
  }

  return (
    <div className="flex items-stretch">
      <Tooltip>
        <TooltipTrigger
          render={
            <ToolbarButton
              onClick={toggleMute}
              aria-label={label}
              className="w-10 justify-center rounded-r-none px-0"
            />
          }
        >
          <Icon />
        </TooltipTrigger>
        <TooltipContent>{label}</TooltipContent>
      </Tooltip>
      <div className="flex h-10 items-center rounded-r-md border border-l-0 border-neutral-700 bg-neutral-900 px-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
        <Slider
          value={volume}
          onValueChange={onVolumeChange}
          min={0}
          max={1}
          step={0.01}
          largeStep={0.1}
          format={{ style: "percent" }}
          aria-label="Volume"
          className="w-20 [&_[data-slot=slider-track]]:bg-white/15"
        />
      </div>
    </div>
  );
}
