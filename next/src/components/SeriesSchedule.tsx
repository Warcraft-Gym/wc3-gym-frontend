"use client";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { toneClass } from "@/components/ui/tone";
import { CastChips, type CastSeries } from "@/components/CastChips";
import { GroupedTable } from "@/components/GroupedTable";
import { PlayerName } from "@/components/PlayerName";
import { SeriesCard } from "@/components/SeriesCard";
import { SM_AND_DOWN, useBreakpoint } from "@/hooks/breakpoint";
import { record } from "@/helpers/figures.mjs";
import { local, scheduleDays } from "@/helpers/schedule.mjs";
import { isUnscored } from "@/helpers/season-phase.mjs";
import { gmt } from "@/helpers/timezone.mjs";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>;
type Day = { key: string; title: string; cast: number; rows: CastSeries[] };

const columns = [
  { key: "time", title: "Time" },
  { key: "round", title: "Round" },
  { key: "player1", title: "Player 1" },
  { key: "player2", title: "Player 2" },
  { key: "score", title: "Score" },
  { key: "cast", title: "Cast" },
];

const timeOf = (value: string) => {
  const at = local(value);
  return `${at.toFormat("HH:mm")} ${gmt(at.offset)}`;
};
const scoreOf = (row: Row) => (isUnscored(row) ? "—" : record(row.player1_score, row.player2_score) ?? "—");
const teamsOf = (row: Row) => (row.match?.team1 && row.match?.team2 ? `${row.match.team1.name} vs ${row.match.team2.name}` : null);
const roundLink = (row: Row) => <Link href={`/match/${row.match_id}`}>Round {row.match?.playday ?? "?"}</Link>;
const dayLine = (group: Day) => (
  <>
    <strong>{group.title}</strong>
    <span className="ml-2 text-muted-foreground">
      {group.rows.length} series, {group.cast} cast
    </span>
  </>
);

/** The season's series by day, from a few days back on: what is on tonight,
 *  what a caster can still claim, and where last week's VODs go. */
export function SeriesSchedule({ series }: { series: Row[] }) {
  const smAndDown = useBreakpoint(SM_AND_DOWN);
  const days: Day[] = scheduleDays(series);

  return (
    <Card className="card gap-0 py-0">
      {!smAndDown ? (
        <GroupedTable
          columns={columns}
          groups={days}
          defaultOpen
          empty="No series is scheduled yet"
          group={({ group }) => <td colSpan={columns.length} className="p-2">{dayLine(group)}</td>}
          rows={({ group }) =>
            group.rows.map((row) => (
              <tr key={row.id} className="detail-row border-b">
                <td />
                <td className="p-2 whitespace-nowrap">{timeOf(row.date_time as string)}</td>
                <td className="p-2 whitespace-nowrap">
                  {roundLink(row)}
                  {teamsOf(row) ? <div className="text-xs text-muted-foreground">{teamsOf(row)}</div> : null}
                </td>
                <td className="p-2"><PlayerName player={row.player1} race={row.player1_race} mmr={row.player1_mmr} /></td>
                <td className="p-2"><PlayerName player={row.player2} race={row.player2_race} mmr={row.player2_mmr} /></td>
                <td className="p-2 whitespace-nowrap">{scoreOf(row)}</td>
                <td className="p-2"><CastChips series={row} /></td>
              </tr>
            ))
          }
        />
      ) : (
        /* A phone has no room for six columns, and the cast is the last of them */
        <div>
          {days.map((group) => (
            <div key={group.key}>
              <div className="bg-on-surface/4 px-3 py-2">{dayLine(group)}</div>
              {group.rows.map((row) => (
                <SeriesCard
                  key={row.id}
                  series={row}
                  title={<>{timeOf(row.date_time as string)} · {roundLink(row)}{teamsOf(row) ? `· ${teamsOf(row)}` : null}</>}
                  actions={<CastChips series={row} />}
                  side={({ n, won }) =>
                    !isUnscored(row) ? <Badge className={won ? "bg-win text-on-win" : toneClass(null)}>{n ? row.player2_score : row.player1_score}</Badge> : null
                  }
                />
              ))}
            </div>
          ))}
          {!days.length ? <div className="p-4 text-muted-foreground">No series is scheduled yet</div> : null}
        </div>
      )}
    </Card>
  );
}
