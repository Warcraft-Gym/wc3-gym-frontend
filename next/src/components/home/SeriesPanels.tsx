"use client";
import Link from "next/link";
import { DateTime } from "luxon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/Icon";
import { PlayerName } from "@/components/PlayerName";
import { TeamName } from "@/components/TeamName";
import { HomePanel, Quiet, ROW, SkeletonRows } from "@/components/home/HomePanel";
import { PLATFORM_ICONS, platformOf } from "@/helpers/casts.mjs";
import { captainRow, rowContext, seriesWhen } from "@/helpers/home-hub.mjs";
import { gmt } from "@/helpers/timezone.mjs";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>;

// The panel shows five series at most; "All upcoming" holds the rest
const MAX_NEXT = 5;

/** The two sides of a home series row: the players, the teams that field them, or "To be decided". */
function Versus({ row }: { row: Row }) {
  const side = (index: 1 | 2) => {
    const player = row[`player${index}`];
    const team = row[`team${index}`];
    if (player) return <PlayerName player={player} race={player.race ?? undefined} mmr={player.mmr ?? null} />;
    // a fixture names both teams on the line above, so a side of one reads what is still to fill
    if (team && !(row.team1 && row.team2)) return <TeamName team={team} />;
    return <span className="text-muted-foreground">To be decided</span>;
  };
  return (
    <div className="mt-1 grid grid-cols-[auto_1fr] items-center gap-x-2 gap-y-0.5 min-[600px]:flex min-[600px]:flex-wrap min-[600px]:gap-x-2.5">
      <span className="col-start-2 min-w-0">{side(1)}</span>
      <span className="col-start-1 text-xs text-muted-foreground">vs</span>
      <span className="col-start-2 min-w-0">{side(2)}</span>
    </div>
  );
}

// The platform of a cast is read off its link, the way the series pages read it
type Platform = keyof typeof PLATFORM_ICONS;
const castIcon = (url: string | null | undefined) => PLATFORM_ICONS[platformOf(url) as Platform] || "mdi-video-outline";

/** The caster who claimed a row, as a chip that opens the stream. */
const CastChip = ({ cast }: { cast: Row }) => (
  <Badge variant="outline" render={<a href={cast.url} target="_blank" rel="noopener noreferrer" />} className="text-primary-text no-underline">
    <Icon name={castIcon(cast.url)} />
    {cast.name}
  </Badge>
);

/** The next series of the whole app, and, for a captain, the fixtures of other events he still has
 *  to draft; the current season's draft sits on its round in My Season. */
export function NextMatches({ rows, fixtures, loading, failed, order }: { rows: Row[]; fixtures: Row[]; loading: boolean; failed?: boolean; order: number }) {
  return (
    <HomePanel
      icon="mdi-clock-outline"
      title="Upcoming Series"
      order={order}
      action={loading ? null : <Link href="/report#upcoming" className="text-on-primary-darken-1 underline">All upcoming</Link>}
    >
      {loading ? (
        <SkeletonRows rows={3} />
      ) : (
        <>
          {fixtures.map((fixture) => {
            const row = captainRow(fixture);
            if (!row) return null;
            return (
              <div key={fixture.match_id} className={ROW}>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="tnum font-bold">{row.when}</span>
                  <Button size="sm" className="ml-auto" nativeButton={false} render={<Link href={row.to} />}>
                    <Icon name="mdi-account-multiple" />
                    Draft pairings
                  </Button>
                </div>
                {fixture.event ? <div className="text-sm text-muted-foreground">{fixture.event}</div> : null}
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
                  {[fixture.team1, fixture.team2].filter(Boolean).map((team: Row, index: number) => (
                    <span key={team.id} className="flex min-w-0 items-center gap-2">
                      {index ? <span>vs</span> : null}
                      <TeamName team={team} />
                    </span>
                  ))}
                </div>
                <div className="text-sm text-muted-foreground">{row.drafted}</div>
              </div>
            );
          })}
          {rows.slice(0, MAX_NEXT).map((row) => (
            <div key={row.id} className={ROW}>
              <div className="flex flex-wrap items-center gap-2">
                <Link href={`/series/${row.id}`} className="tnum font-bold text-inherit no-underline hover:underline">
                  {seriesWhen(row)}
                </Link>
                {row.cast ? <CastChip cast={row.cast} /> : null}
              </div>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
                <span>{rowContext(row)}</span>
                {row.team1 && row.team2 ? (
                  <span className="flex min-w-0 items-center gap-2">
                    <TeamName team={row.team1} />
                    <span>vs</span>
                    <TeamName team={row.team2} />
                  </span>
                ) : null}
              </div>
              <Versus row={row} />
            </div>
          ))}
          {rows.length || fixtures.length ? null : failed ? (
            <Quiet>Could not be loaded.</Quiet>
          ) : (
            <p className="text-sm">No series is booked. A booked time shows here as soon as two players agree one.</p>
          )}
          {rows.length ? <Quiet>Times in your zone, {gmt(DateTime.local().offset)}</Quiet> : null}
        </>
      )}
    </HomePanel>
  );
}
