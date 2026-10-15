"use client";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/Icon";
import { HomePanel, ROW, SkeletonRows } from "@/components/home/HomePanel";
import { dateRange } from "@/helpers/event-labels.mjs";
import { formatChip } from "@/helpers/home-hub.mjs";
import { cn } from "@/lib/utils";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>;

/** The cups and sign-up lists the member may still enter, soonest first. A team cup signs a team
 *  up, so its button says so and opens the team dialog; every other event takes the member's own
 *  signup. An event the member is in, is invited to or runs sits in My events instead. */
export function UpcomingEvents({
  rows,
  loading,
  order,
  busy,
  onSignUp,
}: {
  rows: Row[]; // the GET /me/events rows upcomingEvents keeps
  loading: boolean;
  order: number;
  busy: number | null; // the event whose signup is loading
  onSignUp: (row: Row) => void;
}) {
  return (
    <HomePanel icon="mdi-calendar-outline" title="Upcoming Events" order={order}>
      {loading ? (
        <SkeletonRows rows={2} />
      ) : rows.length ? (
        rows.map((row) => {
          const team = Number(row.team_size) > 1;
          const dates = dateRange({ start_date: row.start, end_date: row.end });
          return (
            <div key={row.id} className={cn(ROW, "flex flex-wrap items-center gap-x-2 gap-y-1")}>
              <Link href={`/events/${row.id}`} className="min-w-0 flex-1 font-medium">
                {row.name}
              </Link>
              <Button variant="outline" size="sm" className="text-primary-text" aria-busy={busy === row.id} disabled={busy === row.id} onClick={() => onSignUp(row)}>
                {busy === row.id ? <Icon name="mdi-loading mdi-spin" /> : <Icon name={team ? "mdi-account-group" : "mdi-account-plus"} />}
                {team ? "Sign up a team" : "Sign up"}
              </Button>
              <div className="flex basis-full flex-wrap items-center gap-2 text-sm text-muted-foreground">
                {formatChip(row) ? <Badge variant="outline">{formatChip(row)}</Badge> : null}
                {dates ? <span className="tnum">{dates}</span> : null}
              </div>
            </div>
          );
        })
      ) : (
        <p className="text-sm">No cup takes signups right now. A new one shows here as soon as it opens.</p>
      )}
    </HomePanel>
  );
}
