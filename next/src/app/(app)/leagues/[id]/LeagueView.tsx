"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/Icon";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toneClass } from "@/components/ui/tone";
import { StatusAlert } from "@/components/StatusAlert";
import { dateRange, ENTRANT_KINDS, EVENT_KINDS, STATE_COLOR, STATE_LABEL, stateOf, titleOf } from "@/helpers/event-labels.mjs";
import { useAuth, useEventStore } from "@/stores";
import { cn } from "@/lib/utils";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>;

const phoneCell = "hidden min-[960px]:table-cell";
// event-labels.mjs is plain JS, so its records index by a known key; the seam widens them
const stateColor = STATE_COLOR as Record<string, string>;
const stateLabel = STATE_LABEL as Record<string, string>;

/** One league and the events it has run, newest first. An admin adds the next run
 *  here; the stages and the map pool are set on the event's own page. */
export function LeagueView({ id }: { id: string }) {
  const auth = useAuth();
  const store = useEventStore();
  const leagueId = Number(id);
  const [league, setLeague] = useState<Row | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // The read answers every event of the league, drafts included, so a member is filtered out
  const events: Row[] = (league?.events || []).filter((e: Row) => auth.isAdmin || e.published !== false);

  useEffect(() => {
    const load = async () => {
      try {
        setLeague(await store.fetchLeague(leagueId));
      } catch (e) {
        setError(`The league did not load: ${(e as Error).message}`);
      } finally {
        setLoading(false);
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leagueId]);

  return (
    <>
      <div className="mb-6">
        <h1>
          <span className="inline-flex items-center gap-2">
            <Icon name="mdi-shield-star" />
            {league?.name || "League"}
          </span>
        </h1>
        <div className="mt-1 text-muted-foreground">
          {titleOf(ENTRANT_KINDS, league?.entrant_kind)}
          {league?.page_url ? (
            <a className="ml-3" href={league.page_url} target="_blank" rel="noopener noreferrer">
              Page
            </a>
          ) : null}
        </div>
      </div>

      <StatusAlert modelValue={error} onClose={() => setError(null)} />

      {auth.isAdmin ? (
        <div className="mb-4 flex justify-end">
          <Button nativeButton={false} render={<Link href={`/events/new?league=${leagueId}`} />}>
            <Icon name="mdi-plus" />
            New event
          </Button>
        </div>
      ) : null}

      <Card className="card">
        {loading ? <Progress value={null} /> : null}
        <div className="table-scroll overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Event</TableHead>
                <TableHead className={phoneCell}>Kind</TableHead>
                <TableHead className={phoneCell}>Dates</TableHead>
                <TableHead>State</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {events.map((event) => (
                <TableRow key={event.id}>
                  <TableCell className="py-3">
                    <Link href={`/events/${event.id}`}>
                      <strong>{event.name}</strong>
                    </Link>
                    {/* a phone drops the two middle columns, so their words ride under the name */}
                    <div className="text-xs text-muted-foreground min-[960px]:hidden">{[titleOf(EVENT_KINDS, event.kind), dateRange(event)].filter(Boolean).join(" · ")}</div>
                  </TableCell>
                  <TableCell className={phoneCell}>{titleOf(EVENT_KINDS, event.kind)}</TableCell>
                  <TableCell className={cn(phoneCell, "whitespace-nowrap")}>{dateRange(event) || "—"}</TableCell>
                  <TableCell>
                    <Badge className={toneClass(stateColor[stateOf(event)])}>{stateLabel[stateOf(event)] || "—"}</Badge>
                  </TableCell>
                </TableRow>
              ))}
              {!events.length && !loading ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-6 text-center text-muted-foreground">
                    No events yet. An event is one run of this league that players sign up for.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </div>
      </Card>
    </>
  );
}

export default LeagueView;
