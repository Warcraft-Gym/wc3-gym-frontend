"use client";
import { useState } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { findCountry } from "@/helpers/countries.js";

/** One country, as the flagpack sprite, with its name on hover or tap. */
export function FlagIcon({ countryIdentifier }: { countryIdentifier?: string | null }) {
  const [open, setOpen] = useState(false);
  const currentCountry = findCountry(countryIdentifier);
  if (!currentCountry) return null;
  return (
    <Tooltip open={open} onOpenChange={setOpen}>
      <TooltipTrigger
        render={
          // a tap opens it as well as a hover, so the name is reachable on a phone
          <span
            role="img"
            aria-label={currentCountry.name}
            className={`fp ${currentCountry.a2.toLowerCase()}`}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              setOpen((value) => !value);
            }}
          />
        }
      />
      <TooltipContent>{currentCountry.name}</TooltipContent>
    </Tooltip>
  );
}

export default FlagIcon;
