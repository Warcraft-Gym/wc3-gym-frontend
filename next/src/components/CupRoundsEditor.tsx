"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Icon } from "@/components/ui/Icon";
import { Input } from "@/components/ui/input";
import { SimpleDatePicker } from "@/components/SimpleDatePicker";
import { SimpleTimePicker } from "@/components/SimpleTimePicker";
import { StatusAlert } from "@/components/StatusAlert";
import { legTitle } from "@/helpers/cup-rounds.mjs";
import { pickerParts, storedUtc } from "@/helpers/timezone.mjs";
import { useEventStore } from "@/stores";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>;
type Draft = { name: string; date: Date | null; time: string };

const draftOf = (leg: Row): Draft => {
  const parts = leg.starts_at ? (pickerParts(leg.starts_at) as { date: Date; time: string }) : null;
  return { name: leg.name === `Round ${leg.number}` ? "" : leg.name || "", date: parts?.date ?? null, time: parts?.time ?? "" };
};
const stamp = (draft: Draft) => (draft.date && draft.time ? (storedUtc(draft.date, draft.time) as string | null) : null);
// the next round's default: a week after the last one, at its time
const weekAfter = (leg: Row | undefined): Draft => {
  const last = leg ? draftOf(leg) : null;
  const date = last?.date ? new Date(last.date.getFullYear(), last.date.getMonth(), last.date.getDate() + 7) : null;
  return { name: "", date, time: last?.time ?? "" };
};

/** "Edit rounds" on a cup over rounds: each round's name, day and start time, saved one round at
 *  a time; a round not drawn yet can go, the later ones moving up a number; and a round can be
 *  added after the last, playing the same format. The first round's start is the cup's start.
 *  `onChanged` reads the cup again, because adding or removing a round changes its stages. */
export function CupRoundsEditor({ event, legs, open, onOpenChange, onChanged }: { event: Row; legs: Row[]; open: boolean; onOpenChange: (open: boolean) => void; onChanged: () => Promise<void> }) {
  const store = useEventStore();
  const [drafts, setDrafts] = useState<Record<number, Draft>>(() => Object.fromEntries(legs.map((leg) => [leg.id, draftOf(leg)])));
  const [added, setAdded] = useState<Draft>(() => weekAfter(legs[legs.length - 1]));
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const set = (id: number, patch: Partial<Draft>) => setDrafts((current) => ({ ...current, [id]: { ...current[id], ...patch } }));
  const dirty = (leg: Row) => {
    const draft = drafts[leg.id];
    const was = draftOf(leg);
    return !!draft && (draft.name.trim() !== was.name || stamp(draft) !== stamp(was));
  };
  const run = async (key: string, work: () => Promise<Row[]>, after?: (legs: Row[]) => void) => {
    setBusy(key);
    setError(null);
    try {
      const answered = await work();
      after?.(answered);
      await onChanged();
    } catch (e) {
      setError((e as Error).message || "The change was not saved");
    } finally {
      setBusy(null);
    }
  };
  const save = (leg: Row) => {
    const draft = drafts[leg.id];
    return run(`save-${leg.id}`, () => store.updateLeg(event.id, leg.id, { name: draft.name.trim(), starts_at: stamp(draft) }));
  };
  const remove = (leg: Row) =>
    run(`remove-${leg.id}`, () => store.removeLeg(event.id, leg.id), (answered) => setDrafts(Object.fromEntries(answered.map((one) => [one.id, draftOf(one)]))));
  const add = () =>
    run(
      "add",
      () => store.addLeg(event.id, { name: added.name.trim() || null, starts_at: stamp(added) }),
      (answered) => {
        setDrafts(Object.fromEntries(answered.map((one) => [one.id, draftOf(one)])));
        setAdded(weekAfter(answered[answered.length - 1]));
      },
    );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg" className="gap-0 p-0">
        <DialogTitle className="banner bg-banner px-4 py-3 text-primary">Edit rounds</DialogTitle>
        <div className="flex max-h-[80vh] flex-col gap-3 overflow-y-auto p-4">
          <StatusAlert modelValue={error} onClose={() => setError(null)} />
          <p className="text-sm text-muted-foreground">
            Change a round&apos;s name, day or time, and save that round. A round that is not drawn yet can be removed; the rounds after it move up a number. Round 1&apos;s start is the cup&apos;s start.
          </p>
          <ol className="flex flex-col gap-3">
            {legs.map((leg) => {
              const draft = drafts[leg.id] ?? draftOf(leg);
              return (
                <li key={leg.id} className="grid grid-cols-12 items-end gap-2 rounded-lg border border-border p-3">
                  <div className="col-span-12 font-bold min-[700px]:col-span-2 min-[700px]:self-center">Round {leg.number}</div>
                  <div className="col-span-12 min-[700px]:col-span-3">
                    <label className="mb-1 block text-sm text-muted-foreground" htmlFor={`leg-name-${leg.id}`}>
                      Name
                    </label>
                    <Input id={`leg-name-${leg.id}`} placeholder={`Round ${leg.number}`} value={draft.name} onChange={(e) => set(leg.id, { name: e.target.value })} />
                  </div>
                  <div className="col-span-6 min-[700px]:col-span-3">
                    <SimpleDatePicker modelValue={draft.date} label="Day" onUpdateModelValue={(date) => set(leg.id, { date })} />
                  </div>
                  <div className="col-span-6 min-[700px]:col-span-2">
                    <SimpleTimePicker modelValue={draft.time} label="Start time" onUpdateModelValue={(time) => set(leg.id, { time })} />
                  </div>
                  <div className="col-span-12 flex justify-end gap-1 min-[700px]:col-span-2">
                    <Button size="sm" disabled={!dirty(leg) || !!busy} onClick={() => save(leg)} aria-label={`Save ${legTitle(leg)}`}>
                      {busy === `save-${leg.id}` ? <Icon name="mdi-loading mdi-spin" /> : <Icon name="mdi-content-save" />}
                      Save
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-error"
                      disabled={!!busy || !!leg.finished_at || legs.length <= 2}
                      onClick={() => remove(leg)}
                      aria-label={`Remove ${legTitle(leg)}`}
                      title={legs.length <= 2 ? "A cup over rounds keeps two rounds or more" : undefined}
                    >
                      {busy === `remove-${leg.id}` ? <Icon name="mdi-loading mdi-spin" /> : <Icon name="mdi-delete-outline" />}
                    </Button>
                  </div>
                </li>
              );
            })}
          </ol>
          <div className="grid grid-cols-12 items-end gap-2 rounded-lg border border-dashed border-primary/60 p-3">
            <div className="col-span-12 font-bold min-[700px]:col-span-2 min-[700px]:self-center">New round</div>
            <div className="col-span-12 min-[700px]:col-span-3">
              <label className="mb-1 block text-sm text-muted-foreground" htmlFor="leg-name-new">
                Name
              </label>
              <Input id="leg-name-new" placeholder={`Round ${legs.length + 1}`} value={added.name} onChange={(e) => setAdded({ ...added, name: e.target.value })} />
            </div>
            <div className="col-span-6 min-[700px]:col-span-3">
              <SimpleDatePicker modelValue={added.date} label="Day" onUpdateModelValue={(date) => setAdded({ ...added, date })} />
            </div>
            <div className="col-span-6 min-[700px]:col-span-2">
              <SimpleTimePicker modelValue={added.time} label="Start time" onUpdateModelValue={(time) => setAdded({ ...added, time })} />
            </div>
            <div className="col-span-12 flex justify-end min-[700px]:col-span-2">
              <Button size="sm" variant="outline" disabled={!!busy || !stamp(added)} onClick={add}>
                {busy === "add" ? <Icon name="mdi-loading mdi-spin" /> : <Icon name="mdi-plus" />}
                Add round
              </Button>
            </div>
          </div>
          <div className="flex justify-end">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Done
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
