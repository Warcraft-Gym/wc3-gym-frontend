"use client";
import Link from "next/link";
import { DateTime } from "luxon";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/Icon";
import { Skeleton } from "@/components/ui/skeleton";
import { ColumnNote } from "@/components/ColumnNote";
import { TeamName } from "@/components/TeamName";
import { HomePanel, Quiet, ROW, SkeletonRows } from "@/components/home/HomePanel";
import { dateRange } from "@/helpers/event-labels.mjs";
import { record } from "@/helpers/figures.mjs";
import { currentRound, roundEnd } from "@/helpers/rounds.mjs";
import { seasonStandings } from "@/helpers/team-record.mjs";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>;

const POINTS_NOTE = "Season points, the order the table ranks on: a series won 2 – 0 pays 4, won 2 – 1 pays 3, lost 1 – 2 pays 1.";
const RECORD_NOTE = "The series this team won and lost in this season alone; a series with no result counts for neither.";
const COLUMNS = "grid grid-cols-[1.4rem_minmax(0,1fr)_auto_auto] items-center gap-2.5";
const TOP = 5;

/** The league's latest season: its standings, the round it is in, and the way to its page.
 *  An admin reaches season management through the same link, so the hub carries no admin card. */
export function SeasonBoard({
  season,
  nextSeason,
  teams,
  loading,
  failed,
  order,
}: {
  season: Row | null;
  nextSeason: Row | null;
  teams: Row[];
  loading: boolean;
  failed?: boolean;
  order: number;
}) {
  const rounds: Row[] = season?.rounds ?? [];
  const round = currentRound(rounds, DateTime.now(), season?.round_end_zone ?? null);
  const total = season?.round_count ?? rounds.length ?? 0;
  const ends = round ? roundEnd(round, season?.round_end_zone ?? null) : null;
  const line = ends
    ? `round ends ${ends.setZone(DateTime.local().zoneName).toFormat("ccc d LLL")}`
    : nextSeason?.name
      ? `${nextSeason.name} plays ${dateRange(nextSeason)}`
      : "";
  const rows = seasonStandings(teams, season?.id).slice(0, TOP);

  return (
    <HomePanel
      icon="mdi-trophy-outline"
      order={order}
      title={
        loading || !season ? (
          // the bar stands in a full title line, so the header keeps its height when the name lands
          <span className="flex h-[1lh] items-center">
            <Skeleton role="img" aria-label="Season leaderboard" className="skeleton h-4 w-36 bg-on-primary/30" />
          </span>
        ) : (
          <Link href={`/seasons/${season.id}`} className="inline-flex items-center gap-1 text-on-primary underline">
            {season.name}
            <Icon name="mdi-chevron-right" size={17} />
          </Link>
        )
      }
      chip={
        loading || !season ? null : (
          <Badge variant="outline" className="border-on-primary/55 text-on-primary">
            {round ? `Round ${round.playday} of ${total}` : "Final"}
          </Badge>
        )
      }
    >
      {loading ? (
        <SkeletonRows rows={5} />
      ) : (
        <>
          {line ? <p className="tnum mb-2 text-sm text-muted-foreground">{line}</p> : null}
          {rows.length ? (
            <>
              <div className={`${COLUMNS} pb-1 text-xs text-muted-foreground`}>
                <span />
                <span>Team</span>
                <span className="text-right">
                  <ColumnNote title="Series record" note={RECORD_NOTE} />
                </span>
                <span className="text-right">
                  <ColumnNote title="Points" note={POINTS_NOTE} />
                </span>
              </div>
              {rows.map((row, index) => (
                <div key={row.team.id} className={`${COLUMNS} ${ROW}`}>
                  <span className="tnum text-right text-sm text-muted-foreground">{index + 1}</span>
                  <TeamName team={row.team} seasonKey={season?.id ?? null} />
                  {/* a figure stays whole and right-aligned; the team name gives way first */}
                  <span className="tnum text-right text-sm whitespace-nowrap">{record(row.series_won, row.series_lost) ?? "—"}</span>
                  <span className="tnum text-right font-medium whitespace-nowrap">{row.final_score ?? "—"}</span>
                </div>
              ))}
            </>
          ) : failed ? (
            <Quiet>Could not be loaded.</Quiet>
          ) : (
            <p className="text-sm">This season has no teams yet.</p>
          )}
        </>
      )}
    </HomePanel>
  );
}
