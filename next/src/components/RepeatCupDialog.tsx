"use client";
import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Field } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import { Input } from "@/components/ui/input";
import { SimpleDatePicker } from "@/components/SimpleDatePicker";
import { SimpleTimePicker } from "@/components/SimpleTimePicker";
import { StatusAlert } from "@/components/StatusAlert";
import { dayIso } from "@/helpers/date-input.mjs";
import { NTHS, ruleFrom, ruleLine, ruleProblem, WEEKDAYS } from "@/helpers/cup-recurrence.mjs";
import { useEventStore } from "@/stores";
import { cn } from "@/lib/utils";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>;

/** "Repeat this cup" on a cup's run page: the rule it repeats on, every week or the nth weekday
 *  of the month at a start time, until an optional last day. Saving makes the cup the rule's
 *  first occurrence and opens the rule's page, where each next cup is made. */
export function RepeatCupDialog({ event, open, onOpenChange }: { event: Row; open: boolean; onOpenChange: (open: boolean) => void }) {
  const router = useRouter();
  const store = useEventStore();
  const nameId = useId();
  const [rule, setRule] = useState<Row>(() => ruleFrom(event));
  const [until, setUntil] = useState<Date | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (patch: Row) => setRule((current) => ({ ...current, ...patch }));
  const problem = ruleProblem(rule);

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const made = await store.repeatCup(event.id, { ...rule, name: rule.name.trim(), ends_on: until ? dayIso(until) : null });
      router.push(`/events/recurring/${made.id}`);
    } catch (e) {
      setError((e as Error).message || "The cup was not set to repeat");
      setSaving(false);
    }
  };

  const chip = (selected: boolean) => cn("min-h-10 rounded-full", selected && "ring-2 ring-primary");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="md" className="gap-0 p-0">
        <DialogTitle className="banner bg-banner px-4 py-3 text-primary">Repeat this cup</DialogTitle>
        <div className="flex flex-col gap-4 p-4">
          <StatusAlert modelValue={error} onClose={() => setError(null)} />
          <p className="text-sm text-muted-foreground">
            Each time is a cup of its own with its own sign-ups. The recurring cup&apos;s page lists the coming days, and you create each cup there with one press, as a copy of the last one.
          </p>
          <Field label="Name" htmlFor={nameId} hint="Each cup is named after it and its day">
            <Input id={nameId} value={rule.name} onChange={(e) => set({ name: e.target.value })} />
          </Field>
          <div role="radiogroup" aria-label="Day" className="flex flex-col gap-2">
            <span className="text-sm text-muted-foreground">Day</span>
            <div className="flex flex-wrap gap-2">
              {WEEKDAYS.map((day: string, index: number) => (
                <Button key={day} size="sm" role="radio" aria-checked={rule.weekday === index} variant={rule.weekday === index ? "secondary" : "outline"} className={chip(rule.weekday === index)} onClick={() => set({ weekday: index })}>
                  {day.slice(0, 3)}
                </Button>
              ))}
            </div>
          </div>
          <div role="radiogroup" aria-label="How often" className="flex flex-col gap-2">
            <span className="text-sm text-muted-foreground">How often</span>
            <div className="flex flex-wrap gap-2">
              {NTHS.map((item: Row) => (
                <Button key={String(item.value)} size="sm" role="radio" aria-checked={rule.nth === item.value} variant={rule.nth === item.value ? "secondary" : "outline"} className={chip(rule.nth === item.value)} onClick={() => set({ nth: item.value })}>
                  {item.title}
                </Button>
              ))}
            </div>
          </div>
          <div className="grid gap-3 min-[600px]:grid-cols-2">
            <SimpleTimePicker modelValue={rule.start_time} label="Start time" onUpdateModelValue={(start_time) => set({ start_time })} />
            <SimpleDatePicker modelValue={until} label="Last day (optional)" onUpdateModelValue={setUntil} />
          </div>
          <p className="text-sm">
            <Icon name="mdi-calendar-sync" className="mr-1" />
            {ruleLine({ ...rule, ends_on: until ? dayIso(until) : null })}, in {rule.zone}.
          </p>
          <div className="flex flex-wrap items-center justify-end gap-2">
            {problem ? <span className="flex-1 text-sm text-muted-foreground">{problem}</span> : null}
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button disabled={!!problem || saving} onClick={save}>
              {saving ? <Icon name="mdi-loading mdi-spin" /> : <Icon name="mdi-calendar-sync" />}
              Repeat
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
