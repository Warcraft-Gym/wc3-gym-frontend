"use client";
import { useState } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Icon } from "@/components/ui/Icon";
import { mapSearchUrl } from "@/helpers/map-sources.mjs";
import { hideMissingImage } from "@/helpers/team-image";

type CupMap = { id: number; name: string; image?: string | null };

/** The maps a cup plays, closed on load so the sign-up stays high on a phone. Each map leads to where
 *  a player finds it to download. A custom game's map is not what warcraft3.info lists, so it reads
 *  as a name alone. */
export function CupMapPool({ maps, customGame }: { maps: CupMap[]; customGame: boolean }) {
  const [open, setOpen] = useState(false);
  if (!maps.length) return null;
  return (
    <Collapsible open={open} onOpenChange={setOpen} className="mt-3 max-w-[70ch] rounded-lg border border-border text-sm">
      <CollapsibleTrigger className="flex w-full items-center gap-2 rounded-lg p-3 text-left hover:bg-muted">
        <span className="font-bold">Map pool</span>
        <span className="text-muted-foreground">
          {maps.length} {maps.length === 1 ? "map" : "maps"}
        </span>
        <Icon name={open ? "mdi-chevron-up" : "mdi-chevron-down"} className="ml-auto" />
      </CollapsibleTrigger>
      <CollapsibleContent className="px-3 pb-3">
        {customGame ? null : <p className="text-muted-foreground">Open a map to find its download on warcraft3.info.</p>}
        <ul className="mt-2 grid grid-cols-1 gap-2 min-[360px]:grid-cols-2 sm:grid-cols-3">
          {maps.map((map) => {
            const row = (
              <>
                <span className="block size-12 shrink-0 overflow-hidden rounded bg-band">
                  {map.image ? <img src={map.image} alt="" onError={hideMissingImage} className="block h-full w-full object-cover" /> : null}
                </span>
                <span className="min-w-0 flex-1 break-words">{map.name}</span>
              </>
            );
            return (
              <li key={map.id}>
                {customGame ? (
                  <div className="flex items-center gap-2 p-1">{row}</div>
                ) : (
                  <a href={mapSearchUrl(map.name)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 rounded p-1 hover:bg-muted">
                    <span className="sr-only">Find </span>
                    {row}
                    <span className="sr-only"> on warcraft3.info</span>
                    <Icon name="mdi-open-in-new" className="shrink-0 text-muted-foreground max-sm:hidden" />
                  </a>
                )}
              </li>
            );
          })}
        </ul>
      </CollapsibleContent>
    </Collapsible>
  );
}

export default CupMapPool;
