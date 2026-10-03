"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { DateTime } from "luxon";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { CastChips, type CastSeries } from "@/components/CastChips";
import { PageHeader } from "@/components/PageHeader";
import { TeamName } from "@/components/TeamName";
import { Quiet, ROW, SkeletonRows } from "@/components/home/HomePanel";
import { Versus } from "@/components/home/SeriesPanels";
import { rowContext } from "@/helpers/home-hub.mjs";
import { local, scheduleDays } from "@/helpers/schedule.mjs";
import { gmt } from "@/helpers/timezone.mjs";
import { useSeriesStore } from "@/stores";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>;
type Day = { key: string; title: string; cast: number; rows: CastSeries[] };

// The day heads the group, so a row reads its time alone, or when it started
const timeOf = (row: Row, now = DateTime.local()) => {
  const at = local(row.date_time);
  return at < now ? `Started ${at.toFormat("HH:mm")}` : at.toFormat("HH:mm");
};

/** Every booked series still to play, of every event, by day: what is on, who casts it, and the
 *  claim a caster makes from the list. One open, edge-cached read. */
export function UpcomingView() {
  const seriesStore = useSeriesStore();
  // null while the read is out
  const [rows, setRows] = useState<Row[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let live = true;
    seriesStore
      .upcomingSeries()
      .then((found: Row[]) => live && setRows(found ?? []))
      .catch(() => {
        if (!live) return;
        setFailed(true);
        setRows([]);
      });
    return () => {
      live = false;
    };
    // one read per visit
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const days: Day[] = scheduleDays(rows ?? []);

  return (
    <>
      <PageHeader title="Upcoming Series" lead="Every booked series still to play. A caster claims a series with Cast this." />

      {rows === null ? (
        <SkeletonRows rows={4} />
      ) : failed ? (
        <Quiet>The upcoming series could not be loaded.</Quiet>
      ) : !days.length ? (
        <p className="text-sm">No series is booked. A booked time shows here as soon as two players agree one.</p>
      ) : (
        <div className="flex flex-col gap-5">
          {days.map((day) => (
            <Card key={day.key} className="card gap-0 py-0">
              <CardTitle className="flex flex-wrap items-center gap-2 banner bg-banner px-4 py-3 text-primary">
                <h2 className="contents">{day.title}</h2>
                {/* each row shows its own caster, so the head counts the series alone and never goes stale after a claim */}
                <span className="ml-auto text-sm font-normal text-on-banner">{day.rows.length} series</span>
              </CardTitle>
              <CardContent className="p-4">
                {day.rows.map((row: Row) => (
                  <div key={row.id} className={ROW}>
                    <div className="flex flex-wrap items-center gap-2">
                      <Link href={`/series/${row.id}`} className="tnum font-bold text-inherit no-underline hover:underline">
                        {timeOf(row)}
                      </Link>
                      <span className="text-sm text-muted-foreground">{rowContext(row)}</span>
                      <span className="ml-auto">
                        <CastChips series={row as CastSeries} />
                      </span>
                    </div>
                    {row.team1 && row.team2 ? (
                      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                        <TeamName team={row.team1} />
                        <span>vs</span>
                        <TeamName team={row.team2} />
                      </div>
                    ) : null}
                    <Versus row={row} />
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      {days.length ? <Quiet>Times in your zone, {gmt(DateTime.local().offset)}</Quiet> : null}
    </>
  );
}

export default UpcomingView;
