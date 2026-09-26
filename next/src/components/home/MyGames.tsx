"use client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PlayerName } from "@/components/PlayerName";
import { SeriesActionBar } from "@/components/SeriesActionBar";
import { TeamName } from "@/components/TeamName";
import { HomePanel, ROW, SkeletonRows } from "@/components/home/HomePanel";
import { ownScore, seasonGames } from "@/helpers/home-hub.mjs";
import { local } from "@/helpers/schedule.mjs";
import { seasonSlug } from "@/helpers/season-slug.mjs";
import { cn } from "@/lib/utils";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>;
type Viewer = { id?: number | null; isAdmin?: boolean; seats?: { team_id: number; season_id: number }[] };

const LABEL = "mt-3 block text-xs font-medium tracking-wide text-muted-foreground first:mt-0";

/** The member's side of one series: the round, the team it meets and the player he faces. */
function SeriesHead({ series, season, teamId, playerId }: { series: Row; season: Row | null; teamId: number | null; playerId: number | null }) {
  const match = series.match ?? {};
  const opponentTeam = teamId != null && match.team1_id != null ? (match.team1_id === teamId ? match.team2 : match.team1) : null;
  const mine = series.player1_id === playerId;
  const opponent = mine ? series.player2 : series.player1;
  // the race and rating the row names for this series, not the ones the opponent's profile carries
  const race = mine ? series.player2_race : series.player1_race;
  const mmr = (mine ? series.player2_mmr : series.player1_mmr) ?? null;
  return (
    <>
      <div className="flex flex-wrap items-center gap-x-1.5 text-sm text-muted-foreground">
        <span>{match.playday ? `Round ${match.playday}` : "Series"}</span>
        {opponentTeam ? (
          <span className="flex min-w-0 items-center gap-1.5">
            <span>· vs</span>
            <TeamName team={opponentTeam} seasonKey={season?.id ?? null} />
          </span>
        ) : null}
      </div>
      {/* the opponent's name opens his player panel, the opponent info a player asks for */}
      {opponent ? <div className="my-1.5"><PlayerName player={opponent} race={race ?? undefined} mmr={mmr} /></div> : null}
    </>
  );
}

/** Every series of the member in the current season: the ones still to play first, each with its
 *  next step, then the ones played with their result. The standings are one link away. */
export function MyGames({
  series,
  season,
  teamId,
  playerId,
  viewer,
  loading,
  order,
  onSchedule,
  onReport,
}: {
  series: Row[];
  season: Row | null;
  teamId: number | null;
  playerId: number | null;
  viewer: Viewer;
  loading: boolean;
  order: number;
  onSchedule: (series: Row) => void;
  onReport: (series: Row) => void;
}) {
  const { open, played } = seasonGames(series, playerId);
  const standings = season ? (
    <Link href={`/report/${seasonSlug(season)}`} className="text-on-primary underline">Standings</Link>
  ) : null;

  return (
    <HomePanel icon="mdi-sword-cross" title={season?.name ? `My Games · ${season.name}` : "My Games"} order={order} action={loading ? null : standings}>
      {loading ? (
        <SkeletonRows rows={3} />
      ) : !open.length && !played.length ? (
        <p className="text-sm">
          {season ? "No series is paired for you this season yet. Your games show here as soon as your captain pairs you." : "You are in no running season. Sign up for the next one and your games show here."}
        </p>
      ) : (
        <>
          {open.length ? <span className={LABEL}>To play</span> : null}
          {open.map((row) => (
            <div key={row.id} className={ROW}>
              <SeriesHead series={row} season={season} teamId={teamId} playerId={playerId} />
              <SeriesActionBar series={row} viewer={viewer} variant="compact" onSchedule={() => onSchedule(row)} onReport={() => onReport(row)} />
            </div>
          ))}
          {played.length ? <span className={LABEL}>Played</span> : null}
          {played.map((row) => {
            const score = ownScore(row, playerId);
            return (
              <div key={row.id} className={ROW}>
                <SeriesHead series={row} season={season} teamId={teamId} playerId={playerId} />
                {score ? (
                  <div className="flex flex-wrap items-center gap-2.5">
                    {/* the order of the score says who won and the token says it again */}
                    <Link
                      href={`/series/${row.id}`}
                      title={score.label}
                      aria-label={score.label}
                      className={cn("tnum font-medium no-underline hover:underline", score.won ? "text-win" : score.lost ? "text-loss" : "text-draw")}
                    >
                      {score.text}
                    </Link>
                    {row.date_time ? <span className="tnum text-sm text-muted-foreground">played {local(row.date_time).toFormat("d LLL")}</span> : null}
                  </div>
                ) : null}
              </div>
            );
          })}
        </>
      )}
      {!loading && !season ? (
        <Button variant="outline" size="sm" className="mt-3 text-primary-text" nativeButton={false} render={<Link href="/report" />}>
          Season standings
        </Button>
      ) : null}
    </HomePanel>
  );
}
