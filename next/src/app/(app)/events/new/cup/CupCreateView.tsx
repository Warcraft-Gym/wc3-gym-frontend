"use client";
import { useId, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/PageHeader";
import { SimpleDatePicker } from "@/components/SimpleDatePicker";
import { SimpleTimePicker } from "@/components/SimpleTimePicker";
import { StatusAlert } from "@/components/StatusAlert";
import { BestOfPlan } from "@/components/BestOfPlan";
import { MapPoolPicker, type PoolMap } from "@/components/MapPoolPicker";
import { bestOfLine } from "@/helpers/best-of-plan.mjs";
import { blankCup, CUP_FORMATS, CUP_GAMES, CUP_STEPS, cupPayload, cupProblem, SIGNUP_POLICIES } from "@/helpers/cup-wizard.mjs";
import { dateRange } from "@/helpers/event-labels.mjs";
import { useEventStore } from "@/stores";
import { cn } from "@/lib/utils";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>;

const dateRange_ = dateRange as (event: Row) => string;

/** One labelled text or number field. */
function TextField({ label, hint, className, ...rest }: { label: string; hint?: string } & React.ComponentProps<typeof Input>) {
  const id = useId();
  return (
    <Field label={label} hint={hint} htmlFor={id} className={className}>
      <Input id={id} {...rest} />
    </Field>
  );
}

/** A row of choices where one is picked, as large buttons a thumb reaches. */
function Choice<V extends string | number>({ label, items, value, onChange }: { label: string; items: { value: V; title: string; ready?: boolean }[]; value: V; onChange: (value: V) => void }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-col gap-2">
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <Button
            key={String(item.value)}
            role="radio"
            aria-checked={item.value === value}
            variant={item.value === value ? "secondary" : "outline"}
            disabled={item.ready === false}
            className={cn("min-h-11", item.value === value && "ring-2 ring-primary")}
            onClick={() => onChange(item.value)}
          >
            {item.title}
          </Button>
        ))}
      </div>
    </div>
  );
}

/** Create cup: the few things an organizer decides for an evening's cup, in five short steps.
 *  The cup is created with one elimination stage; seeding, check-in and the draw happen on its
 *  run page on the evening. */
export function CupCreateView() {
  const router = useRouter();
  const store = useEventStore();
  const [form, setForm] = useState<Row>(blankCup());
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (patch: Row) => setForm((current) => ({ ...current, ...patch }));
  const key = CUP_STEPS[step - 1].key;
  const problem: string | null = cupProblem(form, key);
  const format = CUP_FORMATS.find((item) => item.value === form.format);

  const create = async () => {
    setSaving(true);
    setError(null);
    try {
      const event = await store.createEvent(cupPayload(form));
      router.push(`/events/${event.id}/admin`);
    } catch (e) {
      setError(`The cup was not created: ${(e as Error).message}`);
      setSaving(false);
    }
  };

  const review = [
    { k: "Name", v: form.name.trim() },
    { k: "When", v: dateRange_({ starts_at: cupPayload(form).starts_at }) || "No time yet" },
    { k: "Game", v: CUP_GAMES.find((game) => game.value === form.game)?.title },
    {
      k: "Format",
      v: [
        format?.title,
        form.format === "single_elimination" && form.third_place ? "a match for third place" : null,
        form.format === "double_elimination" ? (form.grand_final_reset ? "grand final reset" : "one grand final") : null,
      ]
        .filter(Boolean)
        .join(", "),
    },
    { k: "Best of", v: bestOfLine(Number(form.best_of), form.best_of_plan, form.format) },
    { k: "Maps", v: form.pool.length ? form.pool.map((row: PoolMap) => row.name).join(", ") : "No maps" },
    { k: "Who may sign up", v: SIGNUP_POLICIES.find((item) => item.value === (form.eligibility_required && form.bnet_required ? "members" : form.signup_policy))?.title },
    {
      k: "Eligibility",
      v: [
        form.eligibility_required ? (form.bnet_required ? "Battle.net-linked, rated players only" : "Rated players only") : "Warnings only",
        form.mmr_min || form.mmr_max ? `MMR ${form.mmr_min || "any"} to ${form.mmr_max || "any"}` : null,
        form.min_games ? `at least ${form.min_games} games` : null,
      ]
        .filter(Boolean)
        .join(", "),
    },
    {
      k: "Players",
      v: [form.entrant_min ? `at least ${form.entrant_min}` : null, form.entrant_cap ? `at most ${form.entrant_cap}` : null].filter(Boolean).join(", ") || "No bounds",
    },
    { k: "Check-in", v: form.checkin_enabled ? "Players check in before the start" : "No check-in" },
    { k: "Visible", v: form.published ? (form.signups_open ? "Published, sign-ups open" : "Published, sign-ups closed") : "Draft: only you and the admins see it" },
  ];

  return (
    <>
      <Link href="/events" className="mb-2 inline-block text-sm">
        ← Events
      </Link>
      <PageHeader title={<><Icon name="mdi-trophy-outline" className="mr-2" />Create Cup</>} />

      <StatusAlert modelValue={error} onClose={() => setError(null)} />

      {/* five step names do not fit a phone, so it reads the one it is on */}
      <div className="mb-2 text-muted-foreground min-[600px]:hidden">
        Step {step} of {CUP_STEPS.length} · {CUP_STEPS[step - 1].title}
      </div>
      <ol className="mb-4 hidden items-center gap-3 min-[600px]:flex">
        {CUP_STEPS.map((item, index) => (
          <li key={item.key} aria-current={index + 1 === step ? "step" : undefined} className={cn("flex flex-1 items-center gap-2", index + 1 !== step && "text-muted-foreground")}>
            <span className={cn("tnum flex size-6 items-center justify-center rounded-full text-xs", index + 1 <= step ? "bg-primary text-on-primary" : "bg-muted")}>
              {index + 1 < step ? <Icon name="mdi-check" /> : index + 1}
            </span>
            {item.title}
            {index < CUP_STEPS.length - 1 ? <span className="h-px flex-1 bg-border" /> : null}
          </li>
        ))}
      </ol>

      <div className="card mx-auto max-w-[860px] rounded-lg p-4">
        {key === "basics" ? (
          <div className="grid grid-cols-12 gap-3">
            <TextField className="col-span-12" label="Name" autoFocus placeholder="Friday Night Cup #13" value={form.name} onChange={(e) => set({ name: e.target.value })} />
            <div className="col-span-12 min-[600px]:col-span-6">
              <SimpleDatePicker modelValue={form.start_date} label="Day" onUpdateModelValue={(start_date) => set({ start_date })} />
            </div>
            <div className="col-span-12 min-[600px]:col-span-6">
              <SimpleTimePicker modelValue={form.start_time} label="Start time" onUpdateModelValue={(start_time) => set({ start_time })} />
            </div>
            <div className="col-span-12">
              <Choice label="Game" items={CUP_GAMES} value={form.game} onChange={(game) => set({ game })} />
              <p className="mt-1 text-sm text-muted-foreground">2v2, custom game and FFA cups come later.</p>
            </div>
            <Field className="col-span-12" label="Description" htmlFor="cup-description">
              <Textarea id="cup-description" rows={3} value={form.description} placeholder="Maps, rules, how results are reported" onChange={(e) => set({ description: e.target.value })} />
            </Field>
          </div>
        ) : key === "format" ? (
          <div className="flex flex-col gap-5">
            <div role="radiogroup" aria-label="Format" className="grid gap-3 min-[600px]:grid-cols-2">
              {CUP_FORMATS.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  role="radio"
                  aria-checked={item.value === form.format}
                  onClick={() => set({ format: item.value })}
                  className={cn("flex flex-col gap-1 rounded-lg border-2 p-4 text-left", item.value === form.format ? "border-primary bg-primary/10" : "border-border")}
                >
                  <span className="font-heading text-lg font-bold">{item.title}</span>
                  <span className="text-sm text-muted-foreground">{item.hint}</span>
                </button>
              ))}
            </div>
            {form.format === "single_elimination" ? (
              <Label className="flex min-h-11 items-center gap-2">
                <Switch checked={!!form.third_place} onCheckedChange={(third_place) => set({ third_place })} />
                Play a match for third place
              </Label>
            ) : (
              <Label className="flex min-h-11 items-center gap-2">
                <Switch checked={!!form.grand_final_reset} onCheckedChange={(grand_final_reset) => set({ grand_final_reset })} />
                Grand final reset: the lower-bracket winner must win twice
              </Label>
            )}
            <div className="flex flex-col gap-1">
              <span className="text-sm text-muted-foreground">Best of</span>
              <BestOfPlan format={form.format} bestOf={Number(form.best_of)} plan={form.best_of_plan} onChange={(best_of, best_of_plan) => set({ best_of, best_of_plan })} />
            </div>
            <p className="text-sm text-muted-foreground">You seed the players on the evening: by MMR, at random or by hand.</p>
          </div>
        ) : key === "maps" ? (
          <MapPoolPicker pool={form.pool} onChange={(pool) => set({ pool })} problem={problem} />
        ) : key === "signups" ? (
          <div className="grid grid-cols-12 gap-3">
            <div className="col-span-12 flex flex-col gap-1 rounded-lg border border-border p-3">
              <Label className="flex min-h-11 items-center gap-2">
                <Switch checked={!!form.eligibility_required} onCheckedChange={(eligibility_required) => set({ eligibility_required })} />
                Only eligible players can sign up
              </Label>
              <p className="text-sm text-muted-foreground">
                {form.eligibility_required
                  ? "A player needs a W3Champions rating on the race they sign up with, and the MMR and games below. Anyone else is refused, also when you add them by hand."
                  : "Everyone can sign up; a player outside the MMR or games below only gets a warning on their row."}
              </p>
              {form.eligibility_required ? (
                <Label className="flex min-h-11 items-center gap-2 pl-1">
                  <Switch checked={!!form.bnet_required} onCheckedChange={(bnet_required) => set({ bnet_required })} />
                  The battle tag must be linked to Battle.net too
                </Label>
              ) : null}
            </div>
            <TextField className="col-span-6 min-[600px]:col-span-4" type="number" min="0" label="MMR from" placeholder="No floor" value={form.mmr_min} onChange={(e) => set({ mmr_min: e.target.value })} />
            <TextField className="col-span-6 min-[600px]:col-span-4" type="number" min="0" label="MMR to" placeholder="No cap" value={form.mmr_max} onChange={(e) => set({ mmr_max: e.target.value })} />
            <TextField
              className="col-span-12 min-[600px]:col-span-4"
              type="number"
              min="0"
              label="Games at least"
              hint="On the race they sign up with, this W3C season and the one before"
              placeholder="No minimum"
              value={form.min_games}
              onChange={(e) => set({ min_games: e.target.value })}
            />
            <div className="col-span-12">
              <Choice
                label="Who may sign up"
                items={SIGNUP_POLICIES.map((item) => ({ ...item, ready: item.value === "members" || !(form.eligibility_required && form.bnet_required) }))}
                value={form.eligibility_required && form.bnet_required ? "members" : form.signup_policy}
                onChange={(signup_policy) => set({ signup_policy })}
              />
            </div>
            <TextField className="col-span-6" type="number" min="2" label="Minimum players" placeholder="No minimum" value={form.entrant_min} onChange={(e) => set({ entrant_min: e.target.value })} />
            <TextField className="col-span-6" type="number" min="2" label="Maximum players" placeholder="No maximum" value={form.entrant_cap} onChange={(e) => set({ entrant_cap: e.target.value })} />
            <p className="col-span-12 text-sm text-muted-foreground">
              The bracket is drawn with the players who are still in on the evening. Below the minimum you choose to wait, move the start or cancel.
            </p>
            <Label className="col-span-12 flex min-h-11 items-center gap-2">
              <Switch checked={!!form.checkin_enabled} onCheckedChange={(checkin_enabled) => set({ checkin_enabled })} />
              Players check in before the start
            </Label>
            <Label className="col-span-12 flex min-h-11 items-center gap-2">
              <Switch checked={!!form.published} onCheckedChange={(published) => set({ published })} />
              Publish now; off keeps it a draft only you and the admins see
            </Label>
            <Label className="col-span-12 flex min-h-11 items-center gap-2">
              <Switch checked={!!form.signups_open} onCheckedChange={(signups_open) => set({ signups_open })} />
              Open sign-ups now
            </Label>
          </div>
        ) : (
          review.map((row) => (
            // a two-column row does not fit a phone
            <div key={row.k} className="grid grid-cols-[minmax(0,1fr)] gap-x-4 gap-y-0.5 border-b py-1.5 min-[600px]:grid-cols-[200px_minmax(0,1fr)]">
              <div className="text-muted-foreground">{row.k}</div>
              <div>{row.v}</div>
            </div>
          ))
        )}
      </div>

      <div className="mx-auto mt-4 flex max-w-[860px] flex-wrap items-center gap-3">
        {step === 1 ? (
          <Button variant="ghost" nativeButton={false} render={<Link href="/events" />}>
            Cancel
          </Button>
        ) : (
          <Button variant="ghost" onClick={() => setStep(step - 1)}>
            Back
          </Button>
        )}
        {problem ? <span className="text-sm text-muted-foreground">{problem}</span> : null}
        <span className="flex-1" />
        {step < CUP_STEPS.length ? (
          <Button disabled={!!problem} onClick={() => setStep(step + 1)}>
            Next
          </Button>
        ) : (
          <Button disabled={saving} onClick={create}>
            {saving ? <Icon name="mdi-loading mdi-spin" /> : null}
            Create cup
          </Button>
        )}
      </div>
    </>
  );
}

export default CupCreateView;
