"use client";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/Icon";
import { TeamName } from "@/components/TeamName";
import { roundLabel } from "@/helpers/rounds.mjs";
import bannerImg from "@/assets/media/match-banner.jpg";
import type { Row } from "./match-cells";

// win, loss or draw for one side's score against the other's
const resultColor = (own?: number, other?: number) => ((own || 0) > (other || 0) ? "win" : (own || 0) < (other || 0) ? "loss" : "draw");
const SCORE_FILL: Record<string, string> = {
  win: "bg-win text-on-win",
  loss: "bg-loss text-on-loss",
  draw: "bg-draw text-on-draw",
};

function Side({ team, own, other, seasonKey }: { team: Row; own?: number; other?: number; seasonKey?: string | number | null }) {
  return (
    <div className="flex basis-5/12 flex-col items-center gap-2">
      <h2 className="text-2xl tracking-wide text-on-band [text-shadow:2px_2px_4px_rgba(var(--v-theme-band),0.8)] min-[960px]:text-4xl">
        <TeamName team={team} seasonKey={seasonKey} />
      </h2>
      <Badge className={`tnum min-w-[60px] justify-center px-3 py-1 text-2xl font-bold min-[960px]:min-w-[80px] min-[960px]:text-3xl ${SCORE_FILL[resultColor(own, other)]}`}>
        {own || 0}
      </Badge>
    </div>
  );
}

/** The dark band at the top of the match: the round it belongs to, the two teams and the score.
 *  The band is dark in both themes, so its text reads the on-band token. */
export function MatchBanner({ match, team1, team2, round, seasonKey }: { match: Row; team1: Row; team2: Row; round: Row; seasonKey?: string | number | null }) {
  return (
    <div className="relative min-h-[250px] text-on-band">
      {/* The photograph is a backdrop, so it sits under a wash of the band colour and carries no alt text */}
      <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${bannerImg.src})` }} />
      <div className="absolute inset-0 bg-gradient-to-b from-band/40 to-band/70" />
      <div className="relative flex min-h-[250px] flex-col items-center justify-center px-4 py-6 text-center">
        <div className="mb-2">
          <Badge className="bg-primary px-3 py-1 text-base text-on-primary">
            <Icon name="mdi-calendar-week" />
            Round {match.playday}
          </Badge>
          {round?.start_date ? (
            <div className="mt-1 flex items-center justify-center gap-1 text-sm text-on-band">
              <Icon name="mdi-clock-outline" className="text-sm" />
              {roundLabel(round)}
            </div>
          ) : null}
        </div>

        <div className="mt-8 flex w-full max-w-3xl items-center justify-center gap-2">
          <Side team={team1} own={match.team1_score} other={match.team2_score} seasonKey={seasonKey} />
          <div className="flex basis-2/12 justify-center">
            <Icon name="mdi-sword-cross" size={48} className="text-on-band" />
          </div>
          <Side team={team2} own={match.team2_score} other={match.team1_score} seasonKey={seasonKey} />
        </div>
      </div>
    </div>
  );
}

export default MatchBanner;
