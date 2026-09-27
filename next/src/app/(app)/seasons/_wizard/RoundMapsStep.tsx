/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/Icon";
import { hideMissingImage } from "@/helpers/team-image";
import { weekText } from "@/helpers/season-wizard.mjs";
import { cn } from "@/lib/utils";

type Row = Record<string, any>;

/** The map game 1 of each round is played on. One row per round, its week, and the pool as a strip
 *  of pictures to click; the strip scrolls on its own, so a phone never scrolls the page sideways. */
export function RoundMapsStep({
  roundCount,
  startDate,
  rounds,
  pool,
  roundMaps,
  onChange,
  onFill,
}: {
  roundCount: number;
  startDate: string | null;
  // the rounds the season stores, with their dates; a round it does not store yet gets its week from the start date
  rounds: Row[];
  pool: Row[];
  roundMaps: Record<number, number | null>;
  onChange: (playday: number, mapId: number | null) => void;
  onFill: () => void;
}) {
  const list = useRef<HTMLUListElement>(null);
  // A strip wider than the screen opens on the map each round holds, so a picked map is never out of sight
  useEffect(() => {
    list.current?.querySelectorAll<HTMLElement>('[role="radio"][aria-checked="true"]').forEach((radio) => {
      const strip = radio.parentElement;
      if (strip) strip.scrollLeft = radio.offsetLeft - strip.offsetLeft - (strip.clientWidth - radio.offsetWidth) / 2;
    });
    // once as the step opens; a click moves nothing
  }, []);
  const playdays = Array.from({ length: roundCount }, (_, i) => i + 1);

  if (!pool.length) return <p className="py-6 text-center text-muted-foreground">Tick the maps of the pool first; each round starts on one of them.</p>;

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="flex-1 text-muted-foreground">Game 1 of each round is played on the map picked here.</span>
        <Button variant="outline" onClick={onFill}>
          <Icon name="mdi-auto-fix" />
          Fill in pool order
        </Button>
      </div>
      <ul ref={list} className="divide-y rounded-lg border">
        {playdays.map((playday) => {
          const chosen = roundMaps[playday] ?? null;
          return (
            <li key={playday} className="flex flex-col gap-2 p-3 md:flex-row md:items-center">
              <div className="w-40 shrink-0">
                <div className="font-medium">Round {playday}</div>
                <div className="text-xs text-muted-foreground">{weekText(rounds, startDate, playday)}</div>
              </div>
              <div className="flex min-w-0 flex-1 gap-2 overflow-x-auto pb-1" role="radiogroup" aria-label={`Map of round ${playday}`}>
                <button
                  type="button"
                  role="radio"
                  aria-checked={chosen === null}
                  onClick={() => onChange(playday, null)}
                  className={cn(
                    "flex h-[62px] w-[88px] shrink-0 items-center justify-center rounded-md border px-1 text-center text-xs text-muted-foreground hover:border-primary",
                    chosen === null && "border-primary ring-2 ring-primary",
                  )}
                >
                  No fixed map
                </button>
                {pool.map((map) => (
                  <button
                    key={map.id}
                    type="button"
                    role="radio"
                    aria-checked={chosen === map.id}
                    title={map.name}
                    onClick={() => onChange(playday, map.id)}
                    className={cn(
                      "flex w-[88px] shrink-0 flex-col overflow-hidden rounded-md border text-left hover:border-primary",
                      chosen === map.id && "border-primary ring-2 ring-primary",
                    )}
                  >
                    <span className="block h-[44px] w-full bg-band">
                      {map.image ? <img src={map.image} alt="" onError={hideMissingImage} className="block h-full w-full object-cover" /> : null}
                    </span>
                    <span className="truncate px-1 py-0.5 text-xs">{map.shortname || map.name}</span>
                  </button>
                ))}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default RoundMapsStep;
