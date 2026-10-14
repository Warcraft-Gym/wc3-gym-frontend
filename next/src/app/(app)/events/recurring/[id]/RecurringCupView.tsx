"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Icon } from "@/components/ui/Icon";
import { Progress } from "@/components/ui/progress";
import { toneClass } from "@/components/ui/tone";
import { PageHeader } from "@/components/PageHeader";
import { StatusAlert } from "@/components/StatusAlert";
import { RecurrenceEditDialog } from "@/components/RecurrenceEditDialog";
import { dayText, ruleLine, upcomingRows } from "@/helpers/cup-recurrence.mjs";
import { dateRange } from "@/helpers/event-labels.mjs";
import { useEventRunner } from "@/hooks/event-runner";
import { useEventStore } from "@/stores";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>;

const dateRange_ = dateRange as (event: Row) => string;

/** A recurring cup: its rule, its next eight days and the cups made from it. A runner of the
 *  latest cup creates the cup of a coming day with one press, a copy of the latest one, and can
 *  stop the rule; every cup it made stays. */
export function RecurringCupView({ id }: { id: string }) {
  const router = useRouter();
  const store = useEventStore();
  const [recurrence, setRecurrence] = useState<Row | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stopping, setStopping] = useState(false);
  const [editing, setEditing] = useState(false);
  // who runs the latest cup runs the rule
  const runner = useEventRunner(recurrence?.latest_event_id ? String(recurrence.latest_event_id) : "");
  const runs = !!recurrence?.latest_event_id && runner.runs;

  const load = async (fresh = false) => {
    try {
      setRecurrence(await store.fetchRecurrence(Number(id), fresh));
    } catch (e) {
      setError(`The recurring cup did not load: ${(e as Error).message}`);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    queueMicrotask(() => load());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const create = async (on: string) => {
    setBusy(on);
    setError(null);
    try {
      await store.createOccurrence(Number(id), on);
      await load(true);
    } catch (e) {
      setError(`The cup was not created: ${(e as Error).message}`);
    } finally {
      setBusy(null);
    }
  };
  const stop = async () => {
    setBusy("stop");
    try {
      await store.deleteRecurrence(Number(id));
      router.push("/events");
    } catch (e) {
      setError(`The cup still repeats: ${(e as Error).message}`);
      setBusy(null);
    }
  };

  const occurrences: Row[] = [...(recurrence?.occurrences || [])].reverse();
  const today = new Date().toISOString().slice(0, 10);

  return (
    <>
      <Link href="/events" className="mb-2 inline-block text-sm">
        ← Events
      </Link>
      <StatusAlert modelValue={error} onClose={() => setError(null)} />
      {loading ? <Progress value={null} /> : null}
      {recurrence ? (
        <>
          <PageHeader
            title={
              <span className="inline-flex items-center gap-2">
                <Icon name="mdi-calendar-sync" />
                {recurrence.name}
              </span>
            }
            lead={`${ruleLine(recurrence)}, ${recurrence.zone}. Each time is a cup of its own.`}
          >
            {runs ? (
              <Button variant="outline" onClick={() => setEditing(true)}>
                <Icon name="mdi-pencil" />
                Edit
              </Button>
            ) : null}
            {runs ? (
              <Button variant="outline" className="text-error" onClick={() => setStopping(true)}>
                <Icon name="mdi-calendar-remove" />
                Stop repeating
              </Button>
            ) : null}
          </PageHeader>

          <div className="grid items-start gap-4 min-[960px]:grid-cols-2">
            <Card className="card">
              <CardHeader>
                <CardTitle>Coming days</CardTitle>
                {runs ? <p className="text-sm text-muted-foreground">Create copies the latest cup onto that day: its format, maps, sign-up rules and organizers.</p> : null}
              </CardHeader>
              <CardContent className="px-0">
                {upcomingRows(recurrence).length ? (
                  <ul className="flex flex-col">
                    {upcomingRows(recurrence).map((row: Row) => (
                      <li key={row.on} className="flex min-h-12 flex-wrap items-center gap-3 border-t border-border px-4 py-1">
                        <span className="tnum w-32 font-bold">{dayText(row.on)}</span>
                        {row.occurrence ? (
                          <Link href={`/events/${row.occurrence.event_id}`} className="min-w-0 flex-1">
                            {row.occurrence.name}
                          </Link>
                        ) : (
                          <span className="min-w-0 flex-1 text-sm text-muted-foreground">Not created yet</span>
                        )}
                        {!row.occurrence && runs && row.on >= today ? (
                          <Button size="sm" disabled={!!busy} onClick={() => create(row.on)}>
                            {busy === row.on ? <Icon name="mdi-loading mdi-spin" /> : <Icon name="mdi-plus" />}
                            Create
                          </Button>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="px-4 pb-4 text-muted-foreground">The rule has no day left.</p>
                )}
              </CardContent>
            </Card>

            <Card className="card">
              <CardHeader>
                <CardTitle>Cups so far</CardTitle>
              </CardHeader>
              <CardContent className="px-0">
                <ul className="flex flex-col">
                  {occurrences.map((row) => (
                    <li key={row.event_id} className="flex min-h-12 flex-wrap items-center gap-3 border-t border-border px-4 py-1">
                      <Link href={`/events/${row.event_id}`} className="min-w-0 flex-1 font-bold">
                        {row.name}
                      </Link>
                      {row.cancelled_at ? (
                        <Badge variant="outline">Cancelled</Badge>
                      ) : row.closed_at ? (
                        <Badge className={toneClass(null)}>Finished</Badge>
                      ) : row.published === false ? (
                        <Badge variant="outline">Draft</Badge>
                      ) : (
                        <Badge className={toneClass("info")}>Coming up</Badge>
                      )}
                      <span className="text-sm text-muted-foreground">{dateRange_({ starts_at: row.starts_at }) || dayText(row.occurs_on)}</span>
                      {runs ? (
                        <Button size="sm" variant="outline" nativeButton={false} render={<Link href={`/events/${row.event_id}/admin`} />}>
                          <Icon name="mdi-tune-variant" />
                          Run it
                        </Button>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        </>
      ) : null}

      {editing && recurrence ? <RecurrenceEditDialog recurrence={recurrence} open onOpenChange={setEditing} onSaved={setRecurrence} /> : null}
      <Dialog open={stopping} onOpenChange={setStopping}>
        <DialogContent size="confirm" className="gap-0 p-0">
          <DialogTitle className="banner bg-banner px-4 py-3 text-primary">Stop repeating</DialogTitle>
          <div className="flex flex-col gap-3 p-4">
            <p>No more days are offered. Every cup made so far stays as it is.</p>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setStopping(false)}>
                Cancel
              </Button>
              <Button className="bg-error text-white" disabled={busy === "stop"} onClick={stop}>
                Stop repeating
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
