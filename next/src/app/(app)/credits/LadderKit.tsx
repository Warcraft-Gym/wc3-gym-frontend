"use client";
import { LadderDayBars } from "@/components/ladder/LadderDayBars";
import { LadderPlots } from "@/components/ladder/LadderPlots";
import { MatchupCompare } from "@/components/ladder/MatchupCompare";
import { PlayerLadderPanel } from "@/components/ladder/PlayerLadderPanel";
import { PlayerLadderTab } from "@/components/ladder/PlayerLadderTab";
import { fillDays, maxGamesPerDay } from "@/helpers/ladder-days.mjs";

// Sample rows for the kit section, shaped like the ladder answer these components read.
const PER_DAY_A = [
  { d: "2026-08-03", w: 2, l: 1, mmr: 1804 },
  { d: "2026-08-05", w: 0, l: 3, mmr: 1751 },
  { d: "2026-08-09", w: 4, l: 1, mmr: 1822 },
  { d: "2026-08-16", w: 1, l: 1, mmr: 1815 },
  { d: "2026-08-21", w: 3, l: 0, mmr: 1861 },
];
const PER_DAY_B = [
  { d: "2026-08-04", w: 1, l: 2, mmr: 1602 },
  { d: "2026-08-11", w: 2, l: 2, mmr: 1611 },
  { d: "2026-08-20", w: 0, l: 2, mmr: 1580 },
];
const START = "2026-08-01";
const END = "2026-08-24";
const daysA = fillDays(PER_DAY_A, START, END);
const daysB = fillDays(PER_DAY_B, START, END);
const ymax = maxGamesPerDay([{ per_day: PER_DAY_A }, { per_day: PER_DAY_B }]);

const kitLadderPlayer = {
  games: 16,
  battleTag: "Peterian#2144",
  vs_race: { HU: [4, 2] as [number, number], OC: [3, 3] as [number, number], NE: [2, 1] as [number, number], UD: [1, 0] as [number, number] },
  per_day: PER_DAY_A,
};
const kitRowA = { wins: 10, losses: 6, games: 16, mmr: { current: 1861 }, vs_race: kitLadderPlayer.vs_race };
const kitRowB = { wins: 3, losses: 6, games: 9, mmr: { current: 1580 }, vs_race: { HU: [1, 2] as [number, number], NE: [2, 4] as [number, number] } };

export function LadderKit() {
  return (
    <>
      <h2 className="mt-6 mb-2 text-lg">Ladder charts</h2>

      <h3 className="mt-4 mb-1">LadderPlots</h3>
      <LadderPlots days={daysA} ymax={ymax} width={320} />

      <h3 className="mt-4 mb-1">LadderDayBars</h3>
      <LadderDayBars days={daysA} ymax={ymax} />

      <h3 className="mt-4 mb-1">PlayerLadderPanel</h3>
      <PlayerLadderPanel player={kitLadderPlayer} days={daysA} ymax={ymax} ladderTo="/ladder?season=4" />

      <h3 className="mt-4 mb-1">MatchupCompare</h3>
      <div className="overflow-x-auto">
        <MatchupCompare
          a={{ id: 52, name: "Peterian", country: "DE" }}
          b={{ id: 61, name: "Blackrock", country: "SN" }}
          raceA="HU"
          raceB="NE"
          la={kitRowA}
          lb={kitRowB}
          ga={{ wins: 4, losses: 2, games: 6 }}
          gb={{ wins: 2, losses: 4, games: 6 }}
          daysA={daysA}
          daysB={daysB}
          ymax={ymax}
        />
      </div>

      <h3 className="mt-4 mb-1">PlayerLadderTab</h3>
      <PlayerLadderTab player={{ id: 1, name: "EAShibby", battleTag: "EAShibby#2644", country: "DE" }} seasonId={4} />
    </>
  );
}

export default LadderKit;
