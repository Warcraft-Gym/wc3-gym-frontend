"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Combobox } from "@/components/ui/Combobox";
import { Icon } from "@/components/ui/Icon";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toneClass } from "@/components/ui/tone";
import { PageHeader } from "@/components/PageHeader";
import { StatusAlert } from "@/components/StatusAlert";
import { dateRange, EVENT_KINDS, STATE_COLOR, STATE_ITEMS, STATE_LABEL, stateOf, titleOf } from "@/helpers/event-labels.mjs";
import { useEventStore } from "@/stores";
import { cn } from "@/lib/utils";
import { byNewest } from "@/helpers/season-order.mjs";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>;

const phoneCell = "hidden min-[960px]:table-cell";
// event-labels.mjs is plain JS, so its records index by a known key; the seam widens them
const stateColor = STATE_COLOR as Record<string, string>;
const stateLabel = STATE_LABEL as Record<string, string>;

/** The port of a clearable v-select: the picker with the x that puts the filter back to every row. */
function FilterCombobox({ label, items, value, onChange }: { label: string; items: { value: string; title: string }[]; value: string | null; onChange: (value: string | null) => void }) {
  return (
    <div className="relative">
      <Combobox items={items} value={value} onChange={onChange} label={label} className={value ? "pr-10" : undefined} />
      {value ? (
        <Button variant="ghost" size="icon-sm" aria-label={`Clear ${label.toLowerCase()}`} className="absolute top-0.5 right-7" onClick={() => onChange(null)}>
          <Icon name="mdi-close" />
        </Button>
      ) : null}
    </div>
  );
}

/** Every event of every league, the newest first. GET /events answers the published runs only,
 *  so a draft reaches nobody here; the league page lists an admin's drafts. */
export function EventsView() {
  const store = useEventStore();
  const [leagues, setLeagues] = useState<Row[]>([]);
  const [events, setEvents] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [leagueId, setLeagueId] = useState<string | null>(null);
  const [state, setState] = useState<string | null>(null);

  const leagueItems = leagues.map((league) => ({ value: String(league.id), title: league.name }));
  const leagueName = (event: Row) => leagues.find((league) => league.id === event.league_id)?.name || "";

  // The read is published-only; the guard holds if that ever changes. The newest run reads first
  const rows = events
    .filter((event) => event.published !== false)
    .filter((event) => !leagueId || String(event.league_id) === leagueId)
    .filter((event) => !state || stateOf(event) === state)
    .slice()
    .sort(byNewest);

  useEffect(() => {
    const load = async () => {
      try {
        const [leagueRows, eventRows] = await Promise.all([store.fetchLeagues(), store.fetchEvents()]);
        setLeagues(leagueRows);
        setEvents(eventRows);
      } catch (e) {
        setError(`The events did not load: ${(e as Error).message}`);
      } finally {
        setLoading(false);
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <PageHeader
        title={
          <span className="inline-flex items-center gap-2">
            <Icon name="mdi-calendar-star" />
            Events
          </span>
        }
      />

      <StatusAlert modelValue={error} onClose={() => setError(null)} />

      <div className="mb-2 grid gap-2 min-[960px]:grid-cols-3">
        <FilterCombobox items={leagueItems} value={leagueId} onChange={setLeagueId} label="League" />
        <FilterCombobox items={STATE_ITEMS} value={state} onChange={setState} label="State" />
      </div>

      <Card className="card">
        {loading ? <Progress value={null} /> : null}
        <div className="table-scroll overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Event</TableHead>
                <TableHead className={phoneCell}>League</TableHead>
                <TableHead className={phoneCell}>Kind</TableHead>
                <TableHead className={phoneCell}>Dates</TableHead>
                <TableHead>State</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((event) => (
                <TableRow key={event.id}>
                  <TableCell className="py-3">
                    <Link href={`/events/${event.id}`}>
                      <strong>{event.name}</strong>
                    </Link>
                    {/* a phone drops the three middle columns, so their words ride under the name */}
                    <div className="text-xs text-muted-foreground min-[960px]:hidden">
                      {[leagueName(event), titleOf(EVENT_KINDS, event.kind), dateRange(event)].filter(Boolean).join(" · ")}
                    </div>
                  </TableCell>
                  <TableCell className={phoneCell}>{leagueName(event) || "—"}</TableCell>
                  <TableCell className={phoneCell}>{titleOf(EVENT_KINDS, event.kind)}</TableCell>
                  <TableCell className={cn(phoneCell, "whitespace-nowrap")}>{dateRange(event) || "—"}</TableCell>
                  <TableCell>
                    <Badge className={toneClass(stateColor[stateOf(event)])}>{stateLabel[stateOf(event)] || "—"}</Badge>
                  </TableCell>
                </TableRow>
              ))}
              {!rows.length && !loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-6 text-center text-muted-foreground">
                    No event matches these filters.
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

export default EventsView;
