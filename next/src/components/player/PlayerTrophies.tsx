import { TrophyIcon } from "@/components/player/TrophyIcon";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Trophy = Record<string, any>;

/** The trophy shelf at the foot of Player Information: a league or tournament win, not a seasonal or lifetime badge */
export function PlayerTrophies({ trophies = null }: { trophies?: Trophy[] | null }) {
  if (!trophies?.length) return null;
  return (
    <div className="mt-3 flex flex-wrap gap-4">
      {trophies.map((trophy) => (
        <TrophyIcon key={trophy.season_id ?? trophy.title} trophy={trophy} size={48} />
      ))}
    </div>
  );
}

export default PlayerTrophies;
