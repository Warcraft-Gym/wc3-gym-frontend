"use client";
import { AchievementIcon } from "@/components/AchievementIcon";
import { TapTooltip } from "@/components/ui/TapTooltip";
import { achievementPoints } from "@/helpers/achievements.js";

type EarnedBadge = { id: string; name: string; points: number };

/** The badges a player earned, as a row of icons over the points they paid */
export function AchievementChip({
  badges = [],
  showPoints = true, // off where a Points column already shows the number
}: {
  badges?: EarnedBadge[];
  showPoints?: boolean;
}) {
  if (!badges.length) return <span className="text-muted-foreground">&mdash;</span>;
  return (
    <div>
      <div className="flex flex-wrap items-center gap-[2px]">
        {badges.map((badge) => (
          <TapTooltip key={badge.id} className="cursor-help leading-none" content={`${badge.name} (+${badge.points})`}>
            <AchievementIcon id={badge.id} size={16} className="text-primary" />
          </TapTooltip>
        ))}
      </div>
      {/* The number sits right under the badges, so the cell keeps its height */}
      {showPoints ? <div className="mt-[2px] text-xs leading-none text-muted-foreground">{achievementPoints(badges)}</div> : null}
    </div>
  );
}

export default AchievementChip;
