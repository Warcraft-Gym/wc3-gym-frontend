"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Field } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { toneClass } from "@/components/ui/tone";
import { PageHeader } from "@/components/PageHeader";
import { StatusAlert } from "@/components/StatusAlert";
import { dateRange, EVENT_KINDS, STATE_COLOR, STATE_LABEL, stateOf, titleOf } from "@/helpers/event-labels.mjs";
import { fill, groupEvents, KIND_FILTERS, organizerCard } from "@/helpers/events-page.mjs";
import { useAuth, useEventStore } from "@/stores";
import { cn } from "@/lib/utils";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>;

const phoneCell = "hidden min-[960px]:table-cell";
// event-labels.mjs is plain JS, so its records index by a known key; the seam widens them
const stateColor = STATE_COLOR as Record<string, string>;
const stateLabel = STATE_LABEL as Record<string, string>;

const StateBadge = ({ event }: { event: Row }) => (
  <Badge className={toneClass(stateColor[stateOf(event)])}>{stateLabel[stateOf(event)] || "—"}</Badge>
);

/** One event still to come, as a card: its state, its name, when and how it plays, how full it is. */
function EventCard({ event }: { event: Row }) {
  const full = fill(event);
  const joinable = ["signups_open", "checkin"].includes(stateOf(event));
  return (
    <Card className="card">
      <CardContent className="flex h-full flex-col gap-3 p-4">
        <div className="flex items-center justify-between gap-2">
          <StateBadge event={event} />
          <span className="text-sm text-muted-foreground">{titleOf(EVENT_KINDS, event.kind)}</span>
        </div>
        <Link href={`/events/${event.id}`} className="font-heading text-lg font-bold text-foreground">
          {event.name}
        </Link>
        <div className="flex flex-col gap-1 text-sm text-muted-foreground">
          {dateRange(event) ? <span>{dateRange(event)}</span> : null}
          {event.stages?.[0]?.format ? <span>{event.stages.length} stage{event.stages.length > 1 ? "s" : ""}</span> : null}
        </div>
        {event.entrant_count != null ? (
          <div className="flex items-center gap-2">
            {full.percent != null ? (
              <div className="h-1.5 flex-1 overflow-hidden rounded bg-muted">
                <div className="h-1.5 bg-primary" style={{ width: `${full.percent}%` }} />
              </div>
            ) : null}
            <span className="text-sm text-muted-foreground">{full.label}</span>
          </div>
        ) : null}
        <div className="mt-auto">
          <Button className="w-full" variant={joinable ? "default" : "outline"} nativeButton={false} render={<Link href={`/events/${event.id}`} />}>
            {stateOf(event) === "checkin" ? "Check in" : joinable ? "Sign up" : "View"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/** The Events tab: every member's way to the cups and the other events to join, live, still to
 *  come and done. An organizer also reads the cups they run and creates one here; a member who
 *  is not one asks for it. A draft reaches only its organizers and the admins. */
export function EventsView() {
  const store = useEventStore();
  const { me } = useAuth();
  const [events, setEvents] = useState<Row[]>([]);
  const [mine, setMine] = useState<Row[]>([]);
  const [kind, setKind] = useState("cup");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // The request dialog, and the answer a sent request gives until /me is read again
  const [asking, setAsking] = useState(false);
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const card = organizerCard(sent && me ? { ...me, organizer_request: "pending" } : me);
  const { live, upcoming, past } = groupEvents(events, kind) as Record<"live" | "upcoming" | "past", Row[]>;

  useEffect(() => {
    const load = async () => {
      try {
        const [eventRows, mineRows] = await Promise.all([
          store.fetchEvents(),
          card === "organizer" ? store.myOrganizedEvents() : Promise.resolve([]),
        ]);
        setEvents(eventRows);
        setMine(mineRows);
      } catch (e) {
        setError(`The events did not load: ${(e as Error).message}`);
      } finally {
        setLoading(false);
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [card === "organizer"]);

  const sendRequest = async () => {
    setSending(true);
    try {
      await store.requestOrganizer(note.trim() || null);
      setSent(true);
      setAsking(false);
    } catch (e) {
      setError(`The request was not sent: ${(e as Error).message}`);
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <PageHeader
        title={
          <span className="inline-flex items-center gap-2">
            <Icon name="mdi-trophy-outline" />
            Events
          </span>
        }
        lead="Cups to join tonight or this week, the ones being played, and the ones that are done."
      >
        {card === "organizer" ? (
          <Button nativeButton={false} render={<Link href="/events/new/cup" />}>
            <Icon name="mdi-plus" />
            Create cup
          </Button>
        ) : null}
      </PageHeader>

      <StatusAlert modelValue={error} onClose={() => setError(null)} />

      {card === "organizer" ? (
        <Card className="card mb-6 border-dashed">
          <CardContent className="p-4">
            <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-xl">Your cups</h2>
              <span className="text-sm text-muted-foreground">The cups you create or were added to</span>
            </div>
            {mine.length ? (
              <ul className="flex flex-col">
                {mine.map((event) => (
                  <li key={event.id} className="flex min-h-12 flex-wrap items-center gap-3 border-t border-border py-2">
                    <Link href={`/events/${event.id}`} className="min-w-0 flex-1 font-bold">
                      {event.name}
                    </Link>
                    {event.published === false ? <Badge variant="outline">Draft</Badge> : <StateBadge event={event} />}
                    <span className="text-sm text-muted-foreground">{dateRange(event)}</span>
                    <Button size="sm" variant="outline" nativeButton={false} render={<Link href={`/events/${event.id}/admin`} />}>
                      <Icon name="mdi-tune-variant" />
                      Run it
                    </Button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground">You run no cup yet. Create one to get started.</p>
            )}
          </CardContent>
        </Card>
      ) : null}

      {card === "ask" || card === "pending" ? (
        <Card className="card mb-6 border-dashed">
          <CardContent className="flex flex-wrap items-center gap-4 p-4">
            <Icon name="mdi-trophy-outline" size={28} className="text-primary-text" />
            <div className="min-w-0 flex-[1_1_320px]">
              <h2 className="text-lg">{card === "pending" ? "Request sent" : "Want to run a cup?"}</h2>
              <p className="text-sm text-muted-foreground">
                {card === "pending"
                  ? "An admin will look at it. Once it is approved, Create cup shows up on this page."
                  : "Organizers create cups and run them here. Ask for organizer access and an admin will answer."}
              </p>
            </div>
            {card === "ask" ? (
              <Button variant="outline" onClick={() => setAsking(true)}>
                Request organizer access
              </Button>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="Kind">
        {KIND_FILTERS.map((filter) => (
          <Button
            key={filter.value}
            size="sm"
            variant={filter.value === kind ? "secondary" : "outline"}
            aria-pressed={filter.value === kind}
            className="rounded-full"
            onClick={() => setKind(filter.value)}
          >
            {filter.title}
          </Button>
        ))}
      </div>

      {loading ? <Progress value={null} className="mb-4" /> : null}

      {live.length ? (
        <section className="mb-6">
          <h2 className="mb-3 text-xl">Live now</h2>
          <div className="flex flex-col gap-3">
            {live.map((event) => (
              <Card key={event.id} className="card border-primary/50">
                <CardContent className="flex flex-wrap items-center gap-4 p-4">
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold tracking-wide text-loss uppercase">
                    <span className="size-2 rounded-full bg-loss" />
                    Live
                  </span>
                  <div className="min-w-0 flex-[1_1_320px]">
                    <div className="font-heading text-lg font-bold">{event.name}</div>
                    <div className="text-sm text-muted-foreground">{[titleOf(EVENT_KINDS, event.kind), dateRange(event)].filter(Boolean).join(" · ")}</div>
                  </div>
                  <Button variant="outline" nativeButton={false} render={<Link href={`/events/${event.id}`} />}>
                    Open
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      ) : null}

      <section className="mb-6">
        <h2 className="mb-3 text-xl">Upcoming</h2>
        {upcoming.length ? (
          <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(280px,1fr))]">
            {upcoming.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground">{loading ? "" : "Nothing is coming up yet."}</p>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-xl">Past</h2>
        <Card className="card">
          <div className="table-scroll overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Event</TableHead>
                  <TableHead className={phoneCell}>Kind</TableHead>
                  <TableHead className={phoneCell}>Date</TableHead>
                  <TableHead>State</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {past.map((event) => (
                  <TableRow key={event.id}>
                    <TableCell className="py-3">
                      <Link href={`/events/${event.id}`}>
                        <strong>{event.name}</strong>
                      </Link>
                      {/* a phone drops the middle columns, so their words ride under the name */}
                      <div className="text-xs text-muted-foreground min-[960px]:hidden">
                        {[titleOf(EVENT_KINDS, event.kind), dateRange(event)].filter(Boolean).join(" · ")}
                      </div>
                    </TableCell>
                    <TableCell className={phoneCell}>{titleOf(EVENT_KINDS, event.kind)}</TableCell>
                    <TableCell className={cn(phoneCell, "whitespace-nowrap")}>{dateRange(event) || "—"}</TableCell>
                    <TableCell>{event.cancelled_at ? <Badge variant="outline">Cancelled</Badge> : <StateBadge event={event} />}</TableCell>
                  </TableRow>
                ))}
                {!past.length && !loading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="py-6 text-center text-muted-foreground">
                      Nothing has been played yet.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </div>
        </Card>
      </section>

      <Dialog open={asking} onOpenChange={setAsking}>
        <DialogContent showCloseButton={false} size="sm" className="gap-0 p-0">
          <DialogTitle className="banner bg-banner px-4 py-3 text-primary">Request organizer access</DialogTitle>
          <div className="flex flex-col gap-3 p-4">
            <p className="text-sm text-muted-foreground">
              Organizers create cups and run them on this site. An admin reads your request and answers it here. You don&apos;t need a player profile for this.
            </p>
            <Field label="What would you like to run? (optional)" htmlFor="organizer-note">
              <Textarea id="organizer-note" rows={3} maxLength={300} value={note} placeholder="For example: a weekly 1v1 cup on Friday evenings" onChange={(e) => setNote(e.target.value)} />
            </Field>
          </div>
          <div className="flex justify-end gap-2 px-4 py-3">
            <Button variant="ghost" onClick={() => setAsking(false)}>
              Cancel
            </Button>
            <Button onClick={sendRequest} disabled={sending}>
              <Icon name={sending ? "mdi-loading mdi-spin" : "mdi-send"} />
              Send request
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default EventsView;
