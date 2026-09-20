"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Icon } from "@/components/ui/Icon";
import { Progress } from "@/components/ui/progress";
import { toneClass } from "@/components/ui/tone";
import { CastChips, type CastSeries } from "@/components/CastChips";
import { GroupedTable } from "@/components/GroupedTable";
import { PlayerName } from "@/components/PlayerName";
import { SeriesCard } from "@/components/SeriesCard";
import { StatusAlert } from "@/components/StatusAlert";
import { SM_AND_DOWN, useBreakpoint } from "@/hooks/breakpoint";
import { resolveCurrentSeason } from "@/helpers/current-season";
import { eventLabel } from "@/helpers/event-labels.mjs";
import { record } from "@/helpers/figures.mjs";
import { local, scheduleDays } from "@/helpers/schedule.mjs";
import { isUnscored } from "@/helpers/season-phase.mjs";
import { gmt } from "@/helpers/timezone.mjs";
import { useSeriesStore } from "@/stores";

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

/** Every scheduled series of the current season in time order: what is on tonight,
 *  what a caster can still claim, and where last week's VODs go. */
export function UpcomingView() {
  const seriesStore = useSeriesStore();
  const smAndDown = useBreakpoint(SM_AND_DOWN);
  const [season, setSeason] = useState<Row | null>(null);
  const [series, setSeries] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const days: Day[] = scheduleDays(series);

  useEffect(() => {
    const load = async () => {
      try {
        const current = await resolveCurrentSeason();
        setSeason(current);
        if (!current) throw new Error("No current season");
        setSeries((await seriesStore.searchSeriesBySeason(current.id)) || []);
      } catch (e) {
        setError("Failed to load the schedule.");
        console.error("Failed to load the schedule:", e);
      } finally {
        setLoading(false);
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="p-4">
      <Card className="card gap-0 py-0">
        <CardHeader className="bg-primary p-4">
          <CardTitle className="flex items-center gap-2 text-on-primary">
            <Icon name="mdi-calendar-clock" />
            Upcoming series
            {season?.name ? (
              <Badge variant="outline" className="ml-1 border-on-primary text-on-primary">
                {eventLabel(season)}
              </Badge>
            ) : null}
          </CardTitle>
        </CardHeader>
        {loading ? <Progress value={null} /> : null}
        <StatusAlert modelValue={error} onClose={() => setError(null)} className="m-4" />
        {error ? null : !smAndDown ? (
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
    </div>
  );
}

export default UpcomingView;
