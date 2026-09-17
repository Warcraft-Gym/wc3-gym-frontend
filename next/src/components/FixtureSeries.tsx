"use client";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { toneClass } from "@/components/ui/tone";
import { SeriesBox } from "@/components/SeriesBox";
import { fixtureRows, fixtureScore } from "@/helpers/fixture.mjs";
import { cn } from "@/lib/utils";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>;

const KEY = "h-3.5 w-[3px] rounded-[2px]";

/** The ordered series one fixture holds, the first played first: what each one plays, who
 *  each side fields, and how it ended. The fixture page and the series page both draw it,
 *  so a reader sees the whole fixture from either. */
export function FixtureSeries({
  series = [],
  rosters = {}, // the team roster of each entrant, by entrant id
  currentId = null, // the series the page is already showing
  className,
}: {
  series?: Row[];
  rosters?: Record<string, Row[]>;
  currentId?: number | null;
  className?: string;
}) {
  const rows: Row[] = fixtureRows(series);
  const score: number[] = fixtureScore(series);

  return (
    <Card className={cn("card gap-0 py-0", className)}>
      <CardHeader className="p-4">
        <CardTitle className="flex items-center gap-3">
          <span>Series</span>
          <span className="tnum ml-auto text-base font-bold">
            {score[0]} – {score[1]}
          </span>
        </CardTitle>
      </CardHeader>
      <div className="flex flex-col gap-3 p-3">
        {/* One series a block: its line of settings over the box that names the two sides */}
        {rows.map((row) => (
          <div key={row.id} className={cn("overflow-hidden rounded border", row.id === currentId && "border-primary")}>
            <div className="flex items-center gap-2 bg-surface-light px-2 py-1">
              <span className="text-sm font-bold">Series {row.number}</span>
              <Badge className={toneClass(null)}>{row.mode}</Badge>
              <Badge variant="outline">{row.pick}</Badge>
              {row.id !== currentId ? (
                <Button nativeButton={false} variant="ghost" size="xs" className="ml-auto text-primary-text" render={<Link href={`/series/${row.id}`} />}>
                  Open series
                </Button>
              ) : null}
            </div>
            <SeriesBox flat readonly series={row.series} rosters={rosters} />
          </div>
        ))}
        {!rows.length ? <p className="mb-0 text-muted-foreground">This fixture holds no series yet.</p> : null}
        {/* The marks beside the two sides are the only colour here, so they read a legend */}
        {rows.length ? (
          <div className="flex gap-4 text-xs text-muted-foreground [&>span]:inline-flex [&>span]:items-center [&>span]:gap-1.5">
            <span><i className={cn(KEY, "bg-win")} />Won</span>
            <span><i className={cn(KEY, "bg-loss")} />Lost</span>
            <span><i className={cn(KEY, "bg-draw")} />No result</span>
          </div>
        ) : null}
      </div>
    </Card>
  );
}

export default FixtureSeries;
