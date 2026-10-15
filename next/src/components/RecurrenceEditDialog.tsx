"use client";
import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Field } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import { Input } from "@/components/ui/input";
import { SimpleDatePicker } from "@/components/SimpleDatePicker";
import { SimpleTimePicker } from "@/components/SimpleTimePicker";
import { StatusAlert } from "@/components/StatusAlert";
import { dayDate, dayIso } from "@/helpers/date-input.mjs";
import { ruleLine, ruleProblem } from "@/helpers/cup-recurrence.mjs";
import { useEventStore } from "@/stores";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>;

/** "Edit" on a recurring cup's page: its name, its start time and its last day. The day of the
 *  week and how often stay as set up. A change reaches the cups created from then on; the cups
 *  made already keep their own start. */
export function RecurrenceEditDialog({ recurrence, open, onOpenChange, onSaved }: { recurrence: Row; open: boolean; onOpenChange: (open: boolean) => void; onSaved: (recurrence: Row) => void }) {
  const store = useEventStore();
  const nameId = useId();
  const [name, setName] = useState<string>(recurrence.name);
  const [time, setTime] = useState<string>(recurrence.start_time);
  const [until, setUntil] = useState<Date | null>(recurrence.ends_on ? (dayDate(recurrence.ends_on) as Date | null) : null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ends_on = until ? (dayIso(until) as string) : null;
  const problem = ruleProblem({ name, start_time: time });

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      onSaved(await store.updateRecurrence(recurrence.id, { name: name.trim(), start_time: time, ends_on }));
      onOpenChange(false);
    } catch (e) {
      setError((e as Error).message || "The change was not saved");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="sm" className="gap-0 p-0">
        <DialogTitle className="banner bg-banner px-4 py-3 text-primary">Edit the recurring cup</DialogTitle>
        <div className="flex flex-col gap-4 p-4">
          <StatusAlert modelValue={error} onClose={() => setError(null)} />
          <Field label="Name" htmlFor={nameId} hint="Each next cup is named after it and its day">
            <Input id={nameId} value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <div className="grid gap-3 min-[600px]:grid-cols-2">
            <SimpleTimePicker modelValue={time} label="Start time" onUpdateModelValue={setTime} />
            <div>
              <SimpleDatePicker modelValue={until} label="Last day (optional)" onUpdateModelValue={setUntil} />
              {until ? (
                <Button size="sm" variant="ghost" className="mt-1" onClick={() => setUntil(null)}>
                  <Icon name="mdi-close" />
                  No last day
                </Button>
              ) : null}
            </div>
          </div>
          <p className="text-sm">
            <Icon name="mdi-calendar-sync" className="mr-1" />
            {ruleLine({ ...recurrence, start_time: time, ends_on })}. The cups made already keep their own start.
          </p>
          <div className="flex flex-wrap items-center justify-end gap-2">
            {problem ? <span className="flex-1 text-sm text-muted-foreground">{problem}</span> : null}
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button disabled={!!problem || saving} onClick={save}>
              {saving ? <Icon name="mdi-loading mdi-spin" /> : <Icon name="mdi-content-save" />}
              Save
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
