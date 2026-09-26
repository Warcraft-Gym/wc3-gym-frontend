"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DateTime } from "luxon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DataTable } from "@/components/ui/DataTable";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Field } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { toneClass } from "@/components/ui/tone";
import { PageHeader } from "@/components/PageHeader";
import { StatusAlert } from "@/components/StatusAlert";
import { dateRange, STATE_COLOR, STATE_LABEL } from "@/helpers/event-labels.mjs";
import { nightState } from "@/helpers/koth.mjs";
import { MD_AND_UP, useBreakpoint } from "@/hooks/breakpoint";
import { useEventStore } from "@/stores";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>;

// One page of nights; the backend sorts and cuts it, and counts them all
const PAGE_SIZE = 25;
// event-labels.mjs is plain JS, so its records index by a known key; the seam widens them
const stateColor = STATE_COLOR as Record<string, string>;
const stateLabel = STATE_LABEL as Record<string, string>;

// The bracket cuts a first night takes, weakest first, the way the module names them
const DEFAULT_BOUNDS = [0, 1450, 1600];

/** The KOTH nights, newest first, one page at a time. A night is one event of the KOTH league, so this page
 *  only opens tonight's and hands the run over to the night's run page. */
export function KothView() {
  const router = useRouter();
  const store = useEventStore();
  const mdAndUp = useBreakpoint(MD_AND_UP);

  const [nights, setNights] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  // The newest night, from the first page, which the dialog prefills from on any page
  const [latestId, setLatestId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ starts_at: "", lower_bounds: [...DEFAULT_BOUNDS] });

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const { items, total: count } = await store.fetchEventsPage("koth", PAGE_SIZE, page * PAGE_SIZE);
        setNights(items);
        setTotal(count ?? items.length);
        if (page === 0) setLatestId(items[0]?.id ?? null);
      } catch (e) {
        setError(`The nights did not load: ${(e as Error).message}`);
      } finally {
        setLoading(false);
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  // Tonight at the hour the last night started, and its bracket cuts, weakest first.
  // The list read carries no divisions, so the last night is read in full for them.
  const openDialog = async () => {
    setDialogError(null);
    const last: Row | null = latestId ? await store.fetchEvent(latestId).catch(() => null) : null;
    const started = last?.starts_at ? DateTime.fromISO(last.starts_at, { zone: "utc" }).toLocal() : null;
    const start = DateTime.now().set({ hour: started?.hour ?? 20, minute: started?.minute ?? 0, second: 0, millisecond: 0 });
    const bounds: number[] = [...(last?.divisions || [])].sort((a: Row, b: Row) => b.position - a.position).map((band: Row) => band.lower_bound ?? 0);
    setForm({
      starts_at: start.toFormat("yyyy-LL-dd'T'HH:mm"),
      lower_bounds: bounds.length === 3 ? bounds : [...DEFAULT_BOUNDS],
    });
    setDialogOpen(true);
  };

  const openNight = async () => {
    setSaving(true);
    setDialogError(null);
    try {
      const night = await store.openNight({
        starts_at: DateTime.fromISO(form.starts_at).toUTC().toISO(),
        lower_bounds: form.lower_bounds,
      });
      setDialogOpen(false);
      router.push(`/koth/nights/${night.id}`);
    } catch (e) {
      setDialogError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeader
        title={
          <span className="inline-flex items-center gap-2">
            <Icon name="mdi-crown" />
            KOTH Nights
          </span>
        }
      >
        <Button nativeButton={false} variant="outline" className="text-primary-text" render={<Link href="/koth/dashboard" />}>
          <Icon name="mdi-view-dashboard" />
          Dashboard
        </Button>
        <Button disabled={loading} onClick={openDialog}>
          <Icon name="mdi-plus" />
          Open tonight
        </Button>
      </PageHeader>

      <StatusAlert modelValue={error} onClose={() => setError(null)} />

      <Card className="card">
        {loading ? <Progress value={null} /> : null}
        <DataTable
          data={nights}
          rowId={(night: Row) => String(night.id)}
          rowCount={total}
          page={page}
          onPageChange={setPage}
          pageSize={PAGE_SIZE}
          columnVisibility={{ date: mdAndUp }}
          empty={loading ? null : <div className="py-6 text-center">No night has run yet.</div>}
          columns={[
            {
              id: "name",
              header: "Night",
              enableSorting: false,
              cell: ({ row }) => (
                <div className="py-1">
                  <Link href={`/koth/nights/${row.original.id}`}>
                    <strong>{row.original.name}</strong>
                  </Link>
                  {/* a phone drops the date column, so the date rides under the name */}
                  <div className="text-xs text-muted-foreground min-[960px]:hidden">{dateRange(row.original)}</div>
                </div>
              ),
            },
            {
              id: "date",
              header: "Date",
              enableSorting: false,
              cell: ({ row }) => <span className="whitespace-nowrap">{dateRange(row.original) || "—"}</span>,
            },
            {
              id: "state",
              header: "State",
              enableSorting: false,
              cell: ({ row }) => (
                <Badge className={toneClass(stateColor[nightState(row.original)])}>{stateLabel[nightState(row.original)] || "—"}</Badge>
              ),
            },
          ]}
        />
      </Card>

      {/* Tonight's night: when it starts, and where its three brackets cut */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent showCloseButton={false} className="max-w-[520px] gap-0 p-0 sm:max-w-[520px]">
          <DialogTitle className="bg-primary px-4 py-3 text-on-primary">Open tonight</DialogTitle>
          <div className="flex flex-col gap-3 p-4">
            <StatusAlert modelValue={dialogError} onClose={() => setDialogError(null)} />
            <Field label="Starts at" htmlFor="night-starts-at">
              <Input id="night-starts-at" type="datetime-local" value={form.starts_at} onChange={(e) => setForm({ ...form, starts_at: e.target.value })} />
            </Field>
            <div className="text-sm font-medium">The MMR each bracket opens at</div>
            <div className="grid gap-2 sm:grid-cols-3">
              {form.lower_bounds.map((bound, index) => (
                <Field key={index} label={`Bracket ${index + 1}`} htmlFor={`night-bound-${index}`}>
                  <Input
                    id={`night-bound-${index}`}
                    type="number"
                    value={bound}
                    onChange={(e) => setForm({ ...form, lower_bounds: form.lower_bounds.map((one, at) => (at === index ? Number(e.target.value) : one)) })}
                  />
                </Field>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2 p-4 pt-0">
            <Button variant="ghost" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button disabled={!form.starts_at || saving} onClick={openNight}>
              {saving ? <Icon name="mdi-loading mdi-spin" /> : null}
              Open tonight
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default KothView;
