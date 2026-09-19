"use client";
import { RaceIcon } from "@/components/RaceIcon";
import { TapTooltip } from "@/components/ui/TapTooltip";
import { W3CIcon } from "@/components/W3CIcon";
import { countShare } from "@/helpers/figures.mjs";
import { RACES } from "@/helpers/ladder-days.mjs";

/* eslint-disable @typescript-eslint/no-explicit-any */
type SeasonPlayer = { vs_race?: Record<string, number[]> } & Record<string, any>;

/** The column title over a VsRaces cell: the W3C mark ahead of what the figure counts. */
export function VsRacesHead() {
  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap">
      <W3CIcon size={14} /> Games won vs race
    </span>
  );
}

/** A player's ladder games won against one race; the tooltip shows every race. */
export function VsRaces({ player, race }: { player?: SeasonPlayer; race?: string }) {
  const rec = (against: string) => {
    const r = player?.vs_race?.[against];
    return (r && countShare(r[0], r[0] + r[1])) || "—";
  };
  return (
    <TapTooltip
      className="inline-flex items-center gap-1 whitespace-nowrap"
      content={
        <div>
          <div className="mb-1 flex items-center gap-1">
            <W3CIcon size={14} /> Ladder games won
          </div>
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
