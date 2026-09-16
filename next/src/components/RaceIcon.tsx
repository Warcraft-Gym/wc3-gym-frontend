"use client";
import { useState } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { raceWrapper } from "@/helpers/races.js";

/** One race. 1.4em keeps the icon in step with the flag sprite, which also scales with the font. */
export function RaceIcon({ raceIdentifier, size = "1.4em" }: { raceIdentifier?: string | null; size?: string | number }) {
  const [open, setOpen] = useState(false);
  const currentRace = raceWrapper.getRaceObject(raceIdentifier);
  if (!currentRace) return null;
  const box = typeof size === "number" ? `${size}px` : size;
  const src = typeof currentRace.icon === "string" ? currentRace.icon : currentRace.icon.src;
  return (
    <Tooltip open={open} onOpenChange={setOpen}>
      <TooltipTrigger
        render={
          // a tap opens it as well as a hover, so the name is reachable on a phone
          <img src={src} alt="" role="img" aria-label={currentRace.name} style={{ width: box, height: box }} className="shrink-0 object-cover" onClick={() => setOpen((o) => !o)} />
        }
      />
      <TooltipContent>{currentRace.name}</TooltipContent>
    </Tooltip>
  );
}

export default RaceIcon;
