"use client";
import { useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { AchievementChip } from "@/components/AchievementChip";
import { AchievementIcon } from "@/components/AchievementIcon";
import { RaceMmrChips } from "@/components/RaceMmrChips";
import { VsRaces } from "@/components/VsRaces";
import { W3CIcon } from "@/components/W3CIcon";
import { W3CMmr } from "@/components/W3CMmr";
import { Kit } from "./Kit";
import { LadderKit } from "./LadderKit";

// Sample rows for the kit section, shaped like the backend rows these components read.
const kitPlayer = {
  vs_race: { HU: [3, 1], OC: [0, 0], NE: [2, 2], UD: [1, 0] },
  w3c_stats: [
    { race: "HU", mmr: 1842, wins: 41, losses: 30, games: 71, wc3_season: 22 },
    { race: "NE", mmr: 1610, wins: 12, losses: 14, games: 26, wc3_season: 22 },
    { race: "OC", mmr: 1455, wins: 5, losses: 6, games: 11, wc3_season: 21 },
  ],
};
const kitBadges = [
  { id: "climber", name: "Climber", points: 3 },
  { id: "hat_trick", name: "Hat trick", points: 2 },
  { id: "map_win:Twisted Meadows", name: "Twisted Meadows win", points: 1 },
];

export function CreditsView() {
  // ?kit=1 opens the component kit section.
  const kit = useSearchParams().get("kit") === "1";
  return (
    <div className="mx-auto max-w-[700px] p-4">
      <PageHeader title="Credits" />

      <h2 className="mb-2 text-lg">Graphics and image sources</h2>
      <ul className="ml-6 list-disc">
        <li>
          Warcraft III race icons: © <a href="https://www.blizzard.com" target="_blank" rel="noopener">Blizzard Entertainment</a>
        </li>
        <li>
          Achievement and bet icons: <a href="https://game-icons.net" target="_blank" rel="noopener">game-icons.net</a> by Lorc, Delapouite and Caro Asercion,{" "}
          <a href="https://creativecommons.org/licenses/by/3.0/" target="_blank" rel="noopener">CC BY 3.0</a>
        </li>
        <li>
          W3Champions crown and wordmarks: <a href="https://w3champions.com" target="_blank" rel="noopener">W3Champions</a>
        </li>
        <li>
          Country flags: <a href="https://flagpack.xyz" target="_blank" rel="noopener">Flagpack</a>
        </li>
      </ul>

      {kit ? (
        <section id="kit">
          <Kit />

          <h2 className="mt-6 mb-2 text-lg">Badge kit</h2>

          <h3 className="mt-4 mb-1">W3CIcon</h3>
          <W3CIcon />

          <h3 className="mt-4 mb-1">W3CMmr</h3>
          <W3CMmr suffix=" (HU)" sortIcon="mdi-arrow-up" />

          <h3 className="mt-4 mb-1">VsRaces</h3>
          <VsRaces player={kitPlayer} race="HU" />

          <h3 className="mt-4 mb-1">RaceMmrChips</h3>
          <RaceMmrChips player={kitPlayer} w3cSeason={22} max={2} />

          <h3 className="mt-4 mb-1">AchievementIcon</h3>
          <AchievementIcon id="climber" />

          <h3 className="mt-4 mb-1">AchievementChip</h3>
          <AchievementChip badges={kitBadges} />

          <LadderKit />
        </section>
      ) : null}
    </div>
  );
}

export default CreditsView;
