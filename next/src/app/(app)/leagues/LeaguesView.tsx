"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Field } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/PageHeader";
import { StatusAlert } from "@/components/StatusAlert";
import { ENTRANT_KINDS, LEAGUE_KINDS, leaguePayload, stateOf, titleOf } from "@/helpers/event-labels.mjs";
import { useAuth, useEventStore } from "@/stores";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>;
type Item = { value: string; title: string };

const phoneCell = "hidden min-[960px]:table-cell";
// GNL and KOTH open the home page of their own menu; other leagues open the league page
const HOME: Record<string, string> = { gnl: "/report", koth: "/koth/dashboard" };
const leagueHref = (league: Row) => HOME[league.kind] ?? `/leagues/${league.id}`;
const blank = () => ({ name: "", short_name: "", kind: "custom", entrant_kind: "solo", page_url: "" });

/** One pick of the new league form: the v-select port, which shows the item's title. */
function KindSelect({ id, items, value, onChange }: { id: string; items: Item[]; value: string; onChange: (value: string) => void }) {
  return (
    <Select value={value} onValueChange={(picked) => onChange(picked as string)}>
      <SelectTrigger id={id} className="w-full">
        <SelectValue>{(picked: string) => titleOf(items, picked)}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {items.map((item) => (
          <SelectItem key={item.value} value={item.value}>
            {item.title}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/** Every league the app runs. A league is what repeats; its events are the runs
 *  players sign up for, and they live on the league's own page. */
export function LeaguesView() {
  const auth = useAuth();
  const store = useEventStore();
  const [leagues, setLeagues] = useState<Row[]>([]);
  const [events, setEvents] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialog, setDialog] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [form, setForm] = useState(blank());

  // The list read leaves a league's events empty, so the count and the next run come
  // off the events list. The soonest run that has not finished is the next one.
  const rows = leagues.map((league) => {
    const mine = events.filter((event) => event.league_id === league.id);
    const next = mine.filter((event) => stateOf(event) !== "finished").sort((a, b) => (a.start_date || "9999").localeCompare(b.start_date || "9999"))[0] || null;
    return { league, count: mine.length, next };
  });

  const load = async () => {
    try {
      const [leagueRows, eventRows] = await Promise.all([store.fetchLeagues(), store.fetchEvents()]);
      setLeagues(leagueRows);
      setEvents(eventRows);
    } catch (e) {
      setError(`The leagues did not load: ${(e as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  const openDialog = () => {
    setForm(blank());
    setFormError(null);
    setDialog(true);
  };

  const save = async () => {
    setSaving(true);
    setFormError(null);
    try {
      await store.createLeague(leaguePayload(form));
      setDialog(false);
      setLoading(true);
      await load();
    } catch (e) {
      setFormError(`The league was not created: ${(e as Error).message}`);
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    // the loader sets state, so it runs just outside the effect body (react-hooks/set-state-in-effect)
    queueMicrotask(load);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <PageHeader
        title={
          <span className="inline-flex items-center gap-2">
            <Icon name="mdi-shield-star" />
            Leagues
          </span>
        }
      />

      <StatusAlert modelValue={error} onClose={() => setError(null)} />

      {auth.isAdmin ? (
        <div className="mb-4 flex justify-end">
          <Button onClick={openDialog}>
            <Icon name="mdi-plus" />
            New league
          </Button>
        </div>
      ) : null}

      <Card className="card">
        {loading ? <Progress value={null} /> : null}
        <div className="table-scroll overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>League</TableHead>
                <TableHead className={phoneCell}>Kind</TableHead>
                <TableHead className={phoneCell}>Entrants</TableHead>
                <TableHead className="text-right">Events</TableHead>
                <TableHead className={phoneCell}>Next event</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.league.id}>
                  <TableCell className="py-3">
                    <Link href={leagueHref(row.league)}>
                      <strong>{row.league.name}</strong>
                    </Link>
                    {/* a phone drops three columns, so their words ride under the name */}
                    <div className="text-xs text-muted-foreground min-[960px]:hidden">
                      {[titleOf(LEAGUE_KINDS, row.league.kind), titleOf(ENTRANT_KINDS, row.league.entrant_kind), row.next && `Next: ${row.next.name}`].filter(Boolean).join(" · ")}
                    </div>
                  </TableCell>
                  <TableCell className={phoneCell}>{titleOf(LEAGUE_KINDS, row.league.kind)}</TableCell>
                  <TableCell className={phoneCell}>{titleOf(ENTRANT_KINDS, row.league.entrant_kind)}</TableCell>
                  <TableCell className="tnum text-right">{row.count}</TableCell>
                  <TableCell className={phoneCell}>{row.next ? <Link href={`/events/${row.next.id}`}>{row.next.name}</Link> : <span className="text-muted-foreground">—</span>}</TableCell>
                </TableRow>
              ))}
              {!rows.length && !loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-6 text-center text-muted-foreground">
                    No leagues yet. A league holds the events that repeat, like the GNL or KOTH.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </div>
      </Card>

      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent showCloseButton={false} className="max-w-[600px] gap-0 p-0 sm:max-w-[600px]">
          <DialogTitle className="px-4 pt-4 text-xl">New league</DialogTitle>
          <div className="p-4">
            <StatusAlert modelValue={formError} onClose={() => setFormError(null)} />
            <div className="grid gap-3 min-[960px]:grid-cols-12">
              <Field className="min-[960px]:col-span-8" label="Name" htmlFor="league-name">
                <Input id="league-name" autoFocus value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </Field>
              <Field className="min-[960px]:col-span-4" label="Short name" htmlFor="league-short-name">
                <Input id="league-short-name" value={form.short_name} onChange={(e) => setForm({ ...form, short_name: e.target.value })} />
              </Field>
              <Field className="min-[960px]:col-span-6" label="Kind" htmlFor="league-kind">
                <KindSelect id="league-kind" items={LEAGUE_KINDS} value={form.kind} onChange={(kind) => setForm({ ...form, kind })} />
              </Field>
              <Field className="min-[960px]:col-span-6" label="Entrants" htmlFor="league-entrant-kind">
                <KindSelect id="league-entrant-kind" items={ENTRANT_KINDS} value={form.entrant_kind} onChange={(entrant_kind) => setForm({ ...form, entrant_kind })} />
              </Field>
              <Field className="min-[960px]:col-span-12" label="Page link" htmlFor="league-page-url">
                <Input id="league-page-url" placeholder="https://" value={form.page_url} onChange={(e) => setForm({ ...form, page_url: e.target.value })} />
              </Field>
            </div>
          </div>
          <div className="flex justify-end gap-2 p-4 pt-0">
            <Button variant="ghost" onClick={() => setDialog(false)}>
              Cancel
            </Button>
            <Button disabled={saving || !form.name.trim()} onClick={save}>
              {saving ? <Icon name="mdi-loading mdi-spin" /> : null}
              Create league
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default LeaguesView;
