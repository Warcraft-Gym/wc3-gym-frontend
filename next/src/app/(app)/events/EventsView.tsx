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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { toneClass } from "@/components/ui/tone";
import { PageHeader } from "@/components/PageHeader";
import { StatusAlert } from "@/components/StatusAlert";
import {
  dateRange,
  EVENT_KINDS,
  modeLabel,
  STATE_COLOR,
  STATE_LABEL,
  stateOf,
  titleOf,
} from "@/helpers/event-labels.mjs";
import {
  groupEvents,
  organizerCard,
  signedUpText,
} from "@/helpers/events-page.mjs";
import { cardButton } from "@/helpers/events.mjs";
import { dayText, ruleLine } from "@/helpers/cup-recurrence.mjs";
import { useAuth, useEventStore } from "@/stores";
import { canSeeRole, metaOf } from "@/lib/routes";
import { cn } from "@/lib/utils";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>;

const phoneCell = "hidden min-[960px]:table-cell";
// event-labels.mjs is plain JS, so its records index by a known key; the seam widens them
const stateColor = STATE_COLOR as Record<string, string>;
const stateLabel = STATE_LABEL as Record<string, string>;

const StateBadge = ({ event }: { event: Row }) => (
  <Badge className={toneClass(stateColor[stateOf(event)])}>
    {stateLabel[stateOf(event)] || "—"}
  </Badge>
);

// A cup names the mode it is played in, "2v2 cup"; every other kind names itself
const modeOf = (event: Row) => (modeLabel(event) as string | null) || titleOf(EVENT_KINDS, event.kind);

/** The button into an event still to come, named for where the caller stands once their
 *  /me/events row says so. */
function EventAction({ event, row }: { event: Row; row?: Row }) {
  const button = cardButton(row, stateOf(event)) as { text: string; outline: boolean };
  return (
    <Button
      size="sm"
      variant={button.outline ? "outline" : "default"}
      nativeButton={false}
      render={<Link href={`/events/${event.id}`} />}
    >
      {button.text}
    </Button>
  );
}

/** The Events page in two tabs. "Events", for everyone, lists what is running or still to come
 *  and what is done. "Organizers", for a member, holds the cups they run with how their sign-ups
 *  stand and the recurring cups, or, for a member who runs none, the request for access. A guest
 *  reads the events alone. A draft reaches only its organizers and the admins. */
export function EventsView() {
  const store = useEventStore();
  const { me } = useAuth();
  const [events, setEvents] = useState<Row[]>([]);
  const [mine, setMine] = useState<Row[]>([]);
  // the tab, kept in the address so a link opens it and a run page's Back lands on it
  const [tab, setTab] = useState("events");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // The request dialog, and the answer a sent request gives until /me is read again
  const [asking, setAsking] = useState(false);
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  // the team invitations the reader has not answered, each answered right here
  const [invites, setInvites] = useState<Row[]>([]);
  // the recurring cups, read when an organizer opens the organizer tab
  const [recurring, setRecurring] = useState<Row[] | null>(null);
  // the member's own row of each event, by event id, so a card names where they stand
  const [own, setOwn] = useState<Map<number, Row>>(new Map());
  const member = !!me && me.role !== "guest";
  const [answering, setAnswering] = useState<string | null>(null);
  const answer = async (invite: Row, accept: boolean) => {
    setAnswering(`${invite.event_id}-${invite.team.id}`);
    try {
      if (accept) await store.acceptInvite(invite.event_id, invite.team.id);
      else await store.declineInvite(invite.event_id, invite.team.id);
      setInvites(await store.myTeamInvites());
    } catch (e) {
      setError((e as Error).message || "That did not go through");
    } finally {
      setAnswering(null);
    }
  };

  const card = organizerCard(
    sent && me ? { ...me, organizer_request: "pending" } : me,
  );
  const { upcoming, past } = groupEvents(events) as Record<"upcoming" | "past", Row[]>;
  // the cups the organizer runs: the ones still to come and running first, then the ones done
  const ownGroups = groupEvents(mine) as Record<"upcoming" | "past", Row[]>;
  const yours = [...ownGroups.upcoming, ...ownGroups.past];
  const pickTab = (value: string) => {
    setTab(value);
    const url = new URL(window.location.href);
    if (value === "organizers") url.searchParams.set("tab", value);
    else url.searchParams.delete("tab");
    window.history.replaceState(window.history.state, "", url);
  };

  useEffect(() => {
    queueMicrotask(() => {
      if (new URLSearchParams(window.location.search).get("tab") === "organizers") setTab("organizers");
    });
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const [eventRows, mineRows] = await Promise.all([
          store.fetchEvents(),
          card === "organizer"
            ? store.myOrganizedEvents()
            : Promise.resolve([]),
        ]);
        setEvents(eventRows);
        setMine(mineRows);
        if (me) setInvites(await store.myTeamInvites().catch(() => []));
      } catch (e) {
        setError(`The events did not load: ${(e as Error).message}`);
      } finally {
        setLoading(false);
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [card === "organizer"]);

  useEffect(() => {
    if (!member) return;
    store
      .myEvents()
      .then((rows: Row[]) => setOwn(new Map(rows.map((row) => [Number(row.id), row]))))
      .catch((e: Error) => setError(`Your own entries did not load: ${e.message}`));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [member]);

  useEffect(() => {
    if (tab !== "organizers" || card !== "organizer" || recurring) return;
    store
      .fetchRecurrences()
      .then(setRecurring)
      .catch((e: Error) =>
        setError(`The recurring cups did not load: ${e.message}`),
      );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, card]);

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
      />

      <StatusAlert modelValue={error} onClose={() => setError(null)} />

      {invites.length ? (
        <Card className="card mb-6 border-primary/60">
          <CardContent className="p-4">
            <h2 className="mb-2 text-xl">Team invitations</h2>
            <ul className="flex flex-col">
              {invites.map((invite) => (
                <li
                  key={`${invite.event_id}-${invite.team.id}`}
                  className="flex min-h-12 flex-wrap items-center gap-3 border-t border-border py-2"
                >
                  <span className="min-w-0 flex-1">
                    <strong>{invite.captain?.name || "A captain"}</strong>{" "}
                    invited you to <strong>{invite.team.name}</strong> for{" "}
                    <Link href={`/events/${invite.event_id}`}>
                      {invite.event_name}
                    </Link>
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={!!answering}
                    onClick={() => answer(invite, false)}
                  >
                    Decline
                  </Button>
                  <Button
                    size="sm"
                    disabled={!!answering}
                    onClick={() => answer(invite, true)}
                  >
                    Accept
                  </Button>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      {/* a member reads the events beside the organizer tab; a guest reads the events alone */}
      {card ? (
        <Tabs value={tab} onValueChange={(value) => pickTab(value as string)} className="mb-5">
          <div className="flex flex-wrap items-end gap-x-3 gap-y-2 border-b border-border">
            <TabsList variant="line" aria-label="Events or organizers" className="max-w-full justify-start overflow-x-auto overflow-y-hidden">
              <TabsTrigger value="events" className="flex-none px-3">
                <Icon name="mdi-trophy-outline" />
                Events
              </TabsTrigger>
              <TabsTrigger value="organizers" className="flex-none px-3">
                <Icon name="mdi-tune-variant" />
                Organizers
              </TabsTrigger>
            </TabsList>
            {card === "organizer" ? (
              <Button size="sm" className="mb-1.5 ml-auto" nativeButton={false} render={<Link href="/events/new/cup" />}>
                <Icon name="mdi-plus" />
                Create cup
              </Button>
            ) : null}
          </div>
        </Tabs>
      ) : null}

      {loading ? <Progress value={null} className="mb-4" /> : null}

      {tab === "organizers" && card ? (
        card === "organizer" ? (
          <>
            <section className="mb-6">
              <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-xl">Your cups</h2>
                <span className="text-sm text-muted-foreground">The cups you create or were added to</span>
              </div>
              {yours.length ? (
                <Card className="card">
                  <div className="table-scroll overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Cup</TableHead>
                          <TableHead className={phoneCell}>Mode</TableHead>
                          <TableHead className={phoneCell}>Start</TableHead>
                          <TableHead className={phoneCell}>Status</TableHead>
                          <TableHead className={cn(phoneCell, "text-right")}>Signed up</TableHead>
                          <TableHead className={cn(phoneCell, "text-right")}>Checked in</TableHead>
                          <TableHead className={cn(phoneCell, "text-right")}>Waitlist</TableHead>
                          <TableHead className="text-right">
                            <span className="sr-only">Run it</span>
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {yours.map((event) => (
                          <TableRow key={event.id}>
                            <TableCell className="py-3">
                              <Link href={`/events/${event.id}`}>
                                <strong>{event.name}</strong>
                              </Link>
                              {/* a phone drops the middle columns, so their words ride under the name */}
                              <div className="text-xs text-muted-foreground min-[960px]:hidden">
                                {[modeOf(event), dateRange(event)].filter(Boolean).join(" · ")}
                              </div>
                              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground min-[960px]:hidden">
                                {event.cancelled_at ? <Badge variant="outline">Cancelled</Badge> : <StateBadge event={event} />}
                                <span>
                                  {[
                                    `${signedUpText(event)} in`,
                                    event.checkin_enabled ? `${event.checked_in_count ?? 0} checked in` : null,
                                    event.waitlist_count ? `${event.waitlist_count} waiting` : null,
                                  ]
                                    .filter(Boolean)
                                    .join(" · ")}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className={phoneCell}>{modeOf(event)}</TableCell>
                            <TableCell className={cn(phoneCell, "whitespace-nowrap")}>{dateRange(event) || "—"}</TableCell>
                            <TableCell className={phoneCell}>
                              {event.cancelled_at ? <Badge variant="outline">Cancelled</Badge> : <StateBadge event={event} />}
                            </TableCell>
                            <TableCell className={cn(phoneCell, "text-right")}>{signedUpText(event)}</TableCell>
                            {/* a cup with no check-in counts none */}
                            <TableCell className={cn(phoneCell, "text-right")}>{event.checkin_enabled ? (event.checked_in_count ?? 0) : "—"}</TableCell>
                            <TableCell className={cn(phoneCell, "text-right")}>{event.waitlist_count || "—"}</TableCell>
                            <TableCell className="text-right">
                              <Button size="sm" variant="outline" nativeButton={false} render={<Link href={`/events/${event.id}/admin`} />}>
                                <Icon name="mdi-tune-variant" />
                                Run it
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </Card>
              ) : (
                <p className="text-muted-foreground">{loading ? "" : "You run no cup yet. Create one to get started."}</p>
              )}
            </section>

            <section className="mb-6">
              <h2 className="mb-1 text-xl">Recurring cups</h2>
          <p className="mb-3 text-sm text-muted-foreground">
            Cups played on a rule, such as every Friday. Each time is a cup of
            its own; open one to see its coming days and the cups so far.
          </p>
          {recurring === null ? (
            <Progress value={null} className="mb-4" />
          ) : recurring.length ? (
            <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(280px,1fr))]">
              {recurring.map((row) => (
                <Card key={row.id} className="card">
                  <CardContent className="flex h-full flex-col gap-2 p-4">
                    <div className="font-heading text-lg font-bold">
                      {row.name}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {ruleLine(row)}
                    </div>
                    <div className="text-sm">
                      {row.next_on
                        ? `Next: ${dayText(row.next_on)}`
                        : "No day left"}
                    </div>
                    <span className="flex-1" />
                    <Button
                      variant="outline"
                      nativeButton={false}
                      render={<Link href={`/events/recurring/${row.id}`} />}
                    >
                      Open
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">
              No cup repeats yet. A cup&apos;s run page sets it to repeat.
            </p>
          )}
            </section>
          </>
        ) : (
        <Card className="card mb-6 border-dashed">
          <CardContent className="flex flex-wrap items-center gap-4 p-4">
            <Icon
              name="mdi-trophy-outline"
              size={28}
              className="text-primary-text"
            />
            <div className="min-w-0 flex-[1_1_320px]">
              <h2 className="text-lg">
                {card === "pending" ? "Request sent" : "Want to run a cup?"}
              </h2>
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
        )
      ) : (
        <>
          <section className="mb-6">
            <h2 className="mb-3 text-xl">Upcoming</h2>
            {upcoming.length ? (
              <Card className="card">
                <div className="table-scroll overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Event</TableHead>
                        <TableHead className={phoneCell}>Mode</TableHead>
                        <TableHead className={phoneCell}>Date</TableHead>
                        <TableHead className={phoneCell}>Status</TableHead>
                        <TableHead className="text-right">
                          <span className="sr-only">Action</span>
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {upcoming.map((event) => (
                        <TableRow key={event.id}>
                          <TableCell className="py-3">
                            <Link href={`/events/${event.id}`}>
                              <strong>{event.name}</strong>
                            </Link>
                            {/* a phone drops the middle columns, so their words ride under the name and the button stays in reach */}
                            <div className="text-xs text-muted-foreground min-[960px]:hidden">
                              {[modeOf(event), dateRange(event)].filter(Boolean).join(" · ")}
                            </div>
                            <div className="mt-1 min-[960px]:hidden">
                              <StateBadge event={event} />
                            </div>
                          </TableCell>
                          <TableCell className={phoneCell}>{modeOf(event)}</TableCell>
                          <TableCell className={cn(phoneCell, "whitespace-nowrap")}>{dateRange(event) || "—"}</TableCell>
                          <TableCell className={phoneCell}>
                            <StateBadge event={event} />
                          </TableCell>
                          <TableCell className="text-right">
                            <EventAction event={event} row={own.get(Number(event.id))} />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </Card>
            ) : (
              <p className="text-muted-foreground">
                {loading ? "" : "Nothing is coming up yet."}
              </p>
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
                      <TableHead className={phoneCell}>Mode</TableHead>
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
                            {[
                              modeOf(event),
                              dateRange(event),
                            ]
                              .filter(Boolean)
                              .join(" · ")}
                          </div>
                        </TableCell>
                        <TableCell className={phoneCell}>
                          {modeOf(event)}
                        </TableCell>
                        <TableCell
                          className={cn(phoneCell, "whitespace-nowrap")}
                        >
                          {dateRange(event) || "—"}
                        </TableCell>
                        <TableCell>
                          {event.cancelled_at ? (
                            <Badge variant="outline">Cancelled</Badge>
                          ) : (
                            <StateBadge event={event} />
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                    {!past.length && !loading ? (
                      <TableRow>
                        <TableCell
                          colSpan={4}
                          className="py-6 text-center text-muted-foreground"
                        >
                          Nothing has been played yet.
                        </TableCell>
                      </TableRow>
                    ) : null}
                  </TableBody>
                </Table>
              </div>
            </Card>

            {/* The same test as the route guard of /koth */}
            {me && canSeeRole(me.role, metaOf("/koth").role) ? (
              <p className="mt-2 text-sm text-muted-foreground">
                Archived KOTH nights are on{" "}
                <Link href="/koth">KOTH Events</Link>.
              </p>
            ) : null}
          </section>
        </>
      )}

      <Dialog open={asking} onOpenChange={setAsking}>
        <DialogContent showCloseButton={false} size="sm" className="gap-0 p-0">
          <DialogTitle className="banner bg-banner px-4 py-3 text-primary">
            Request organizer access
          </DialogTitle>
          <div className="flex flex-col gap-3 p-4">
            <p className="text-sm text-muted-foreground">
              Organizers create cups and run them on this site. An admin reads
              your request and answers it here. You don&apos;t need a player
              profile for this.
            </p>
            <Field
              label="What would you like to run? (optional)"
              htmlFor="organizer-note"
            >
              <Textarea
                id="organizer-note"
                rows={3}
                maxLength={300}
                value={note}
                placeholder="For example: a weekly 1v1 cup on Friday evenings"
                onChange={(e) => setNote(e.target.value)}
              />
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
