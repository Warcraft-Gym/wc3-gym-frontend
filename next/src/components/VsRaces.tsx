"use client";
import { RaceIcon } from "@/components/RaceIcon";
import { TapTooltip } from "@/components/ui/TapTooltip";
import { RACES, winRate } from "@/helpers/ladder-days.mjs";

/* eslint-disable @typescript-eslint/no-explicit-any */
type SeasonPlayer = { vs_race?: Record<string, number[]> } & Record<string, any>;

/** A player's ladder record against one race; the tooltip shows every race. */
export function VsRaces({ player, race }: { player?: SeasonPlayer; race?: string }) {
  const rec = (against: string) => {
    const r = player?.vs_race?.[against];
    return r && r[0] + r[1] ? `${r[0]}–${r[1]} · ${winRate(r[0], r[1])}%` : "—";
  };
  return (
    <TapTooltip
      className="inline-flex items-center gap-1 whitespace-nowrap"
      content={
        <div>
          {(RACES as string[]).map((r) => (
            <div key={r} className="flex items-center gap-1">
              <RaceIcon raceIdentifier={r} size="1.1em" /> {rec(r)}
            </div>
          ))}
        </div>
      }
    >
      {race ? <RaceIcon raceIdentifier={race} size="1.1em" /> : null}
      {race ? rec(race) : "—"}
    </TapTooltip>
  );
}

export default VsRaces;
