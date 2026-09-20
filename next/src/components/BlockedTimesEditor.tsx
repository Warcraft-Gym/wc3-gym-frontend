"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { SimpleDatePicker } from "@/components/SimpleDatePicker";
import { SimpleTimePicker } from "@/components/SimpleTimePicker";
import { StatusAlert } from "@/components/StatusAlert";
import { backendUrl, fetchWrapper } from "@/helpers";
import { DAY_NAMES, asBlock, asBusy, blockFields, blockLine, busyFields, busyLine, mark, weekFree, zoneBody } from "@/helpers/blocks.mjs";
import { viewerZone } from "@/helpers/timezone.mjs";

// A row is the editor's fields plus its own `key`; `was` is the row before an edit, `saved` what the backend holds
type Row = { key: string; editing: boolean; id: number | null; label: string; saved?: string };
type BlockRow = Row & { days: number[]; start: string; end: string; was?: BlockRow };
type BusyRow = Row & { first: Date | null; last: Date | null; was?: BusyRow };
type SetRows<R> = React.Dispatch<React.SetStateAction<R[]>>;
type Shape<R> = (row: R) => Record<string, unknown>;

let nextKey = 0;
const key = () => `row-${nextKey++}`;

const blockRow = (row: unknown): BlockRow => ({ key: key(), editing: false, ...blockFields(row) });
const busyRow = (row: unknown): BusyRow => ({ key: key(), editing: false, ...busyFields(row) });

const blockValid = (row: BlockRow) => row.days.length > 0 && !!row.start && !!row.end && row.start !== row.end;
const busyValid = (row: BusyRow) => !!row.first && !!row.last && row.last >= row.first;

const blockPreview = (row: BlockRow) => (blockValid(row) ? blockLine(asBlock(row)) : "Pick the days and the hours.");
const busyPreview = (row: BusyRow) => (busyValid(row) ? busyLine(asBusy(row)) : "Pick the first and last day.");

/** When a player cannot play: repeating weekly hours and runs of busy days.
 *  Each saved row reads as one line until the player opens it to edit. */
export function BlockedTimesEditor({
  zone = null,
  onZone,
  onSaved,
}: {
  zone?: string | null; // the profile zone the backend resolves blocks against
  onZone?: (zone: string) => void;
  onSaved?: () => void; // a block reached the backend, so what reads the blocks reads again
}) {
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [blocks, setBlocks] = useState<BlockRow[]>([]);
  const [busy, setBusy] = useState<BusyRow[]>([]);
  const [busyKey, setBusyKey] = useState<string | null>(null); // the row a save or delete is out for
  const [wroteZone, setWroteZone] = useState<string | null>(null); // the zone this editor wrote, before the page reads the player again

  // Every row that reads as a block, saved or not, so the preview follows what is on screen
  const week = weekFree(blocks.filter(blockValid).map(asBlock));

  const patch = <R extends Row>(setRows: SetRows<R>, rowKey: string, part: Partial<R>) =>
    setRows((rows) => rows.map((row) => (row.key === rowKey ? { ...row, ...part } : row)));
  const remove = <R extends Row>(setRows: SetRows<R>, rowKey: string) => setRows((rows) => rows.filter((row) => row.key !== rowKey));

  // A row opened for edit remembers what it looked like, so Cancel puts it back
  const edit = <R extends Row>(setRows: SetRows<R>, row: R) => patch(setRows, row.key, { was: { ...row }, editing: true } as unknown as Partial<R>);
  const cancel = <R extends Row & { was?: R }>(setRows: SetRows<R>, row: R) => {
    if (!row.id) return remove(setRows, row.key);
    patch(setRows, row.key, { ...row.was, editing: false } as Partial<R>);
  };

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const data = await fetchWrapper.get(`${backendUrl}/player-blocks`);
        if (!alive) return;
        setBlocks((data.repeating || []).map((row: unknown) => mark(blockRow(row), asBlock)));
        setBusy((data.busy || []).map((row: unknown) => mark(busyRow(row), asBusy)));
      } catch {
        if (alive) setErrorMessage("Could not load your blocked times.");
      } finally {
        if (alive) setIsLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  // The backend refuses every block while the profile has no zone, so the browser zone goes first
  const ensureZone = async () => {
    const browserZone = viewerZone();
    const body = zoneBody(zone || wroteZone, browserZone);
    if (!body) return;
    const { user } = await fetchWrapper.put(`${backendUrl}/user-info`, body);
    const wrote: string = user?.timezone || browserZone;
    setWroteZone(wrote);
    onZone?.(wrote);
  };

  // One write, then the row carries what the backend stored and closes
  const write = async <R extends Row>(setRows: SetRows<R>, row: R, url: string, fields: (saved: unknown) => Partial<R>, shape: Shape<R>) => {
    setBusyKey(row.key);
    setErrorMessage(null);
    const body = shape(row);
    try {
      await ensureZone();
      const saved = row.id ? await fetchWrapper.put(`${url}/${row.id}`, body) : await fetchWrapper.post(url, body);
      patch(setRows, row.key, mark({ ...row, ...fields(saved), editing: false }, shape));
      onSaved?.();
    } catch (error) {
      setErrorMessage((error as Error).message || "Could not save the block.");
    } finally {
      setBusyKey(null);
    }
  };

  const saveBlock = (row: BlockRow) => write(setBlocks, row, `${backendUrl}/player-blocks/repeating`, blockFields, asBlock);
  const saveBusy = (row: BusyRow) => write(setBusy, row, `${backendUrl}/player-blocks/busy`, busyFields, asBusy);

  // A row never written has nothing to delete on the backend
  const drop = async <R extends Row>(setRows: SetRows<R>, row: R, path: string) => {
    if (!row.id) return remove(setRows, row.key);
    setBusyKey(row.key);
    setErrorMessage(null);
    try {
      await fetchWrapper.delete(`${backendUrl}/player-blocks/${path}/${row.id}`);
      remove(setRows, row.key);
      onSaved?.();
    } catch (error) {
      setErrorMessage((error as Error).message || "Could not delete the block.");
    } finally {
      setBusyKey(null);
    }
  };

  const addBlock = () => setBlocks((rows) => [...rows, { ...blockRow(null), editing: true }]);
  const addBusy = () => setBusy((rows) => [...rows, { ...busyRow(null), editing: true }]);

  // Phone: every chip and button meets the 48 px minimum
  const rowBtn = "max-[600px]:min-h-12";

  const editor = <R extends Row>(row: R, fields: React.ReactNode, preview: string, valid: boolean, onCancel: () => void, onSave: () => void) => (
    <div key={row.key} className="card mb-3 rounded-lg p-4">
      {fields}
      <p className="mt-2 text-xs text-muted-foreground">{preview}</p>
      <div className="mt-2 flex justify-end gap-2">
        <Button variant="ghost" className={rowBtn} disabled={busyKey === row.key} onClick={onCancel}>
          Cancel
        </Button>
        <Button className={rowBtn} disabled={!valid || busyKey === row.key} onClick={onSave}>
          <Icon name={busyKey === row.key ? "mdi-loading" : "mdi-content-save"} className={busyKey === row.key ? "animate-spin" : undefined} />
          Save
        </Button>
      </div>
    </div>
  );

  // The label wraps above its line on a phone, and the week lines below share this label column
  const line = <R extends Row>(row: R, fallback: string, text: string, onEdit: () => void, onDelete: () => void) => (
    <div key={row.key} className="grid grid-cols-[1fr_auto] items-center gap-3 border-b border-border py-2 text-sm last:border-b-0 min-[601px]:grid-cols-[minmax(5rem,8rem)_1fr_auto]">
      <span className="text-muted-foreground max-[600px]:col-span-full">{row.label || fallback}</span>
      <span>{text}</span>
      <span className="flex gap-1">
        <Button variant="ghost" size="icon-sm" aria-label="Edit" onClick={onEdit}>
          <Icon name="mdi-pencil" />
        </Button>
        <Button variant="ghost" size="icon-sm" className="text-error" aria-label="Delete" disabled={busyKey === row.key} onClick={onDelete}>
          <Icon name={busyKey === row.key ? "mdi-loading" : "mdi-delete"} className={busyKey === row.key ? "animate-spin" : undefined} />
        </Button>
      </span>
    </div>
  );

  const labelField = <R extends Row>(setRows: SetRows<R>, row: R, className: string) => (
    <Field label="Label (optional)" htmlFor={`${row.key}-label`} className={className}>
      <Input id={`${row.key}-label`} value={row.label} maxLength={40} onChange={(event) => patch(setRows, row.key, { label: event.target.value } as Partial<R>)} />
    </Field>
  );

  return (
    <div>
      <StatusAlert modelValue={errorMessage} onClose={() => setErrorMessage(null)} />
      {isLoading ? <Progress value={null} className="mb-4" /> : null}

      <div>
        {blocks.map((row) =>
          row.editing
            ? editor(
                row,
                <>
                  <ToggleGroup
                    multiple
                    variant="outline"
                    className="mb-3 w-full flex-wrap"
                    aria-label="Days"
                    value={row.days.map(String)}
                    onValueChange={(days) => patch(setBlocks, row.key, { days: days.map(Number).sort((a, b) => a - b) })}
                  >
                    {DAY_NAMES.map((name: string, day: number) => (
                      <ToggleGroupItem
                        key={name}
                        value={String(day + 1)}
                        size="lg"
                        className="rounded-full px-4 aria-pressed:border-primary aria-pressed:bg-primary/12 aria-pressed:text-primary-text max-[600px]:min-h-12 max-[600px]:min-w-12"
                      >
                        {row.days.includes(day + 1) ? <Icon name="mdi-check" /> : null}
                        {name}
                      </ToggleGroupItem>
                    ))}
                  </ToggleGroup>
                  <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                    <SimpleTimePicker modelValue={row.start} label="From" onUpdateModelValue={(start) => patch(setBlocks, row.key, { start })} />
                    <SimpleTimePicker modelValue={row.end} label="To" onUpdateModelValue={(end) => patch(setBlocks, row.key, { end })} />
                    {labelField(setBlocks, row, "col-span-2")}
                  </div>
                </>,
                blockPreview(row),
                blockValid(row),
                () => cancel(setBlocks, row),
                () => saveBlock(row),
              )
            : line(row, "Weekly", blockLine(asBlock(row)), () => edit(setBlocks, row), () => drop(setBlocks, row, "repeating")),
        )}

        {busy.map((row) =>
          row.editing
            ? editor(
                row,
                <div className="grid gap-2 md:grid-cols-3">
                  <SimpleDatePicker modelValue={row.first} label="First day" onUpdateModelValue={(first) => patch(setBusy, row.key, { first })} />
                  <SimpleDatePicker modelValue={row.last} label="Last day" onUpdateModelValue={(last) => patch(setBusy, row.key, { last })} />
                  {labelField(setBusy, row, "")}
                </div>,
                busyPreview(row),
                busyValid(row),
                () => cancel(setBusy, row),
                () => saveBusy(row),
              )
            : line(row, "Dates", busyLine(asBusy(row)), () => edit(setBusy, row), () => drop(setBusy, row, "busy")),
        )}
        {!isLoading && !errorMessage && !blocks.length && !busy.length ? (
          <p className="text-sm text-muted-foreground">You have not blocked any time. Every hour is open.</p>
        ) : null}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <Button variant="outline" className={`${rowBtn} border-primary text-primary-text`} onClick={addBlock}>
          <Icon name="mdi-plus" />
          Weekly
        </Button>
        <Button variant="outline" className={`${rowBtn} border-primary text-primary-text`} onClick={addBusy}>
          <Icon name="mdi-plus" />
          Dates
        </Button>
      </div>

      {!isLoading && !errorMessage ? (
        <div className="mt-6 border-t border-border pt-4">
          <h3 className="mb-2">What a round leaves open</h3>
          {week.map((day: { day: number; name: string; line: string }) => (
            <div key={day.day} className="grid grid-cols-[3rem_1fr] gap-3 py-1 text-sm min-[601px]:grid-cols-[minmax(5rem,8rem)_1fr]">
              <span className="text-muted-foreground">{day.name}</span>
              <span>{day.line}</span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export default BlockedTimesEditor;
