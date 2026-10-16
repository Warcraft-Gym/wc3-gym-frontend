"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/PageHeader";
import { SimpleDatePicker } from "@/components/SimpleDatePicker";
import { SimpleTimePicker } from "@/components/SimpleTimePicker";
import { StatusAlert } from "@/components/StatusAlert";
import { blankForm, createPayload, formProblem } from "@/helpers/event-wizard.mjs";
import { useEventStore } from "@/stores";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>;

/** New Sign-up List: one short form for a list of names in no league, written in one POST /events. */
export function EventWizardView() {
  const router = useRouter();
  const store = useEventStore();
  const [form, setForm] = useState<Row>(blankForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (patch: Row) => setForm((was) => ({ ...was, ...patch }));
  const problem: string | null = formProblem(form);

  const create = async (event: React.FormEvent) => {
    event.preventDefault();
    if (problem || saving) return;
    setSaving(true);
    setError(null);
    try {
      const list = await store.createEvent(createPayload(form));
      router.push(`/events/${list.id}`);
    } catch (e) {
      setError(`The list was not created: ${(e as Error).message}`);
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeader
        title={<><Icon name="mdi-clipboard-text-outline" className="mr-2" />New Sign-up List</>}
        lead="Members add their names. No matches, no bracket."
      />

      <StatusAlert modelValue={error} onClose={() => setError(null)} />

      {/* one problem line speaks for the form, so the browser's own checks stay off */}
      <form noValidate className="max-w-[600px]" onSubmit={create}>
        <div className="card grid grid-cols-12 gap-4 rounded-lg p-4">
          <Field className="col-span-12" label="Name" htmlFor="signup-list-name">
            <Input id="signup-list-name" autoFocus placeholder="Coaching night" value={form.name} onChange={(e) => set({ name: e.target.value })} />
          </Field>
          <div className="col-span-12 min-[600px]:col-span-6">
            <SimpleDatePicker id="signup-list-date" label="Date (optional)" modelValue={form.start_date} onUpdateModelValue={(start_date) => set({ start_date })} />
          </div>
          <div className="col-span-12 min-[600px]:col-span-6">
            <SimpleTimePicker id="signup-list-time" label="Start time (optional)" modelValue={form.start_time} onUpdateModelValue={(start_time) => set({ start_time })} />
          </div>
          <Field className="col-span-12" label="Description" htmlFor="signup-list-description">
            <Textarea id="signup-list-description" rows={3} placeholder="What the list is for" value={form.description} onChange={(e) => set({ description: e.target.value })} />
          </Field>
          <Field className="col-span-12 min-[600px]:col-span-8" label="Page link" htmlFor="signup-list-page">
            <Input id="signup-list-page" inputMode="url" placeholder="https://" value={form.page_url} onChange={(e) => set({ page_url: e.target.value })} />
          </Field>
          <Field className="col-span-12 min-[600px]:col-span-4" label="Sign-up cap" htmlFor="signup-list-cap">
            <Input id="signup-list-cap" type="number" min="2" inputMode="numeric" placeholder="No cap" value={form.entrant_cap} onChange={(e) => set({ entrant_cap: e.target.value })} />
          </Field>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button variant="ghost" nativeButton={false} render={<Link href="/events" />}>
            Cancel
          </Button>
          {problem ? <span className="text-sm text-muted-foreground">{problem}</span> : null}
          <span className="flex-1" />
          <Button type="submit" disabled={!!problem || saving}>
            {saving ? <Icon name="mdi-loading mdi-spin" /> : null}
            Create list
          </Button>
        </div>
      </form>
    </>
  );
}

export default EventWizardView;
