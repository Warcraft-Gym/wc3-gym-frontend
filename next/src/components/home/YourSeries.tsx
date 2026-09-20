"use client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PlayerName } from "@/components/PlayerName";
import { SeriesActionBar } from "@/components/SeriesActionBar";
import { TeamName } from "@/components/TeamName";
import { HomePanel, SkeletonRows } from "@/components/home/HomePanel";
import { dateText } from "@/helpers/event-labels.mjs";
import { ownScore } from "@/helpers/home-hub.mjs";
import { local } from "@/helpers/schedule.mjs";
import { seasonSlug } from "@/helpers/season-slug.mjs";
import { seriesContext } from "@/helpers/series-actions.mjs";
import { cn } from "@/lib/utils";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>;
type Viewer = { id?: number | null; isAdmin?: boolean; seats?: { team_id: number; season_id: number }[] };

const LABEL = "block text-xs font-medium tracking-wide text-muted-foreground uppercase";

/** The member's own side of a series: where it sits, the team it meets and the player he faces. */
function SeriesHead({ series, season, teamId, playerId }: { series: Row; season: Row | null; teamId: number | null; playerId: number | null }) {
  const match = series.match ?? {};
  const opponentTeam = teamId != null && match.team1_id != null ? (match.team1_id === teamId ? match.team2 : match.team1) : null;
  const opponent = series.player1_id === playerId ? series.player2 : series.player1;
  const race = series.player1_id === playerId ? series.player2_race : series.player1_race;
  return (
    <>
      <div className="flex flex-wrap items-center gap-x-1.5 text-sm text-muted-foreground">
        <span>{seriesContext(series, { event: season, round: match.playday ?? null })}</span>
        {opponentTeam ? (
          <span className="flex min-w-0 items-center gap-1.5">
            <span>- vs</span>
            <TeamName team={opponentTeam} seasonKey={season?.id ?? null} />
          </span>
        ) : null}
      </div>
      {opponent ? <div className="my-1.5"><PlayerName player={opponent} race={race ?? undefined} /></div> : null}
    </>
  );
}

/** The member's next series with its two open steps, and the result of the one he played last. */
export function YourSeries({
  next,
  last,
  season,
  nextSeason,
  teamId,
  playerId,
  viewer,
  loading,
  order,
  onSchedule,
  onReport,
}: {
  next: Row | null;
  last: Row | null;
  season: Row | null;
  nextSeason: Row | null;
  teamId: number | null;
  playerId: number | null;
  viewer: Viewer;
  loading: boolean;
  order: number;
  onSchedule: (series: Row) => void;
  onReport: (series: Row) => void;
}) {
  const score = ownScore(last, playerId);
  // The season is done, so the empty half names the next one instead of a pairing still to come
  const over = season?.phase === "complete";
  const overLine = over
    ? [
        season?.name ? `${season.name} is over.` : null,
        nextSeason?.name && nextSeason?.start_date ? `${nextSeason.name} plays from ${dateText(nextSeason.start_date)}.` : null,
      ].filter(Boolean).join(" ")
    : "";

  return (
    <HomePanel icon="mdi-trophy-outline" title="Your series" order={order}>
      {loading ? (
        <SkeletonRows rows={2} />
      ) : !next && !last ? (
        <>
          <p className="text-sm">You play no series yet. Sign up for an event and your next opponent and next step show here.</p>
          <Button variant="outline" size="sm" className="mt-3 text-primary-text" nativeButton={false} render={<Link href="/events" />}>
            See all events
          </Button>
        </>
      ) : (
        <div className="grid gap-4 min-[600px]:grid-cols-2">
          <div>
            <span className={LABEL}>Next series</span>
            {next ? (
              <>
                <SeriesHead series={next} season={season} teamId={teamId} playerId={playerId} />
                <SeriesActionBar series={next} viewer={viewer} variant="compact" onSchedule={() => onSchedule(next)} onReport={() => onReport(next)} />
              </>
            ) : (
              <>
                <p className="mt-1 text-sm">{overLine || "No series is paired for you yet."}</p>
                {over && season?.name ? (
                  <Button variant="outline" size="sm" className="mt-3 text-primary-text" nativeButton={false} render={<Link href={`/report/${seasonSlug(season)}`} />}>
                    {season.name} report
                  </Button>
                ) : null}
              </>
            )}
          </div>
          <div className="min-[600px]:border-l min-[600px]:border-[rgba(var(--v-theme-on-surface),0.16)] min-[600px]:pl-4">
            <span className={LABEL}>Last result</span>
            {last && score ? (
              <>
                <SeriesHead series={last} season={season} teamId={teamId} playerId={playerId} />
                <div className="flex flex-wrap items-center gap-2.5">
                  {/* The order of the score says who won and the token says it again; no icon, because a warning icon is a call to action */}
                  <Link
                    href={`/series/${last.id}`}
                    title={score.label}
                    aria-label={score.label}
                    className={cn("tnum font-medium no-underline hover:underline", score.won ? "text-win" : score.lost ? "text-loss" : "text-draw")}
                  >
                    {score.text}
                  </Link>
                  {last.date_time ? <span className="tnum text-sm text-muted-foreground">played {local(last.date_time).toFormat("d LLL")}</span> : null}
                </div>
              </>
            ) : (
              <p className="mt-1 text-sm">You have played no series yet.</p>
            )}
          </div>
        </div>
      )}
    </HomePanel>
  );
}
