"use client";
import { RaceIcon } from "@/components/RaceIcon";
import { Badge } from "@/components/ui/badge";
import { TapTooltip } from "@/components/ui/TapTooltip";
import { raceWrapper } from "@/helpers/races.js";
import { getAllRaceStats } from "@/helpers/w3c-stats.js";

/* eslint-disable @typescript-eslint/no-explicit-any */
type RaceStat = { race: string; mmr?: number; wins?: number; losses?: number; games?: number; wc3_season?: number };

const raceName = (race: string) => raceWrapper.getRaceObject(race)?.name || race;

/** One chip per race the player has ladder games on: race icon + that race's MMR.
 *  A player is not one race, so every raced MMR shows; races without games stay hidden.
 *  `max` keeps the best ones as chips and folds the rest into a "+n" chip. */
export function RaceMmrChips({
  player,
  w3cSeason,
  max = Infinity,
}: {
  player: Record<string, any>; // needs w3c_stats
  w3cSeason?: number; // current W3C season; a stat from an older season names its own
  max?: number;
}) {
  const raceStats: RaceStat[] = getAllRaceStats(player, w3cSeason)
    .filter((stat: RaceStat) => (stat.games || 0) > 0)
    .sort((a: RaceStat, b: RaceStat) => (b.mmr || 0) - (a.mmr || 0));
  return (
    <span className="inline-flex items-center gap-2">
      {raceStats.slice(0, max).map((stat) => (
        <TapTooltip
          key={stat.race}
          content={`${raceName(stat.race)}: ${stat.wins || 0} wins, ${stat.losses || 0} losses in season ${stat.wc3_season}`}
        >
          <Badge variant="secondary">
            <RaceIcon raceIdentifier={stat.race} />
            {stat.mmr}
            {w3cSeason && stat.wc3_season !== w3cSeason ? <span className="ml-1 text-xs text-muted-foreground">S{stat.wc3_season}</span> : null}
          </Badge>
        </TapTooltip>
      ))}
      {raceStats.length > max ? (
        <TapTooltip
          content={
            <div>
              {raceStats.slice(max).map((stat) => (
                <div key={stat.race}>
                  {raceName(stat.race)} {stat.mmr}
                  {w3cSeason && stat.wc3_season !== w3cSeason ? ` (S${stat.wc3_season})` : ""}
                </div>
              ))}
            </div>
          }
        >
          <Badge variant="secondary">+{raceStats.length - max}</Badge>
        </TapTooltip>
      ) : null}
      {!raceStats.length ? <span className="text-xs text-muted-foreground">no ladder games</span> : null}
    </span>
  );
}

export default RaceMmrChips;
