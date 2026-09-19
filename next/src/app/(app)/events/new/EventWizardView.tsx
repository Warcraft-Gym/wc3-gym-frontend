"use client";
import { useEffect, useId, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/Combobox";
import { Field } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pick } from "@/components/ui/Pick";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/PageHeader";
import { SimpleDatePicker } from "@/components/SimpleDatePicker";
import { SimpleTimePicker } from "@/components/SimpleTimePicker";
import { StatusAlert } from "@/components/StatusAlert";
import {
  dateRange, dateText, FORMATS, MAP_RULES, NO_ROUND_END_ZONE, ROUND_END_ZONES, SCHEDULING_MODES,
  SERIES_PER_ENTRANT_PER_ROUND, SERIES_PER_FIXTURE, seriesPerEntrant, SIGNUP_POLICIES, titleOf,
} from "@/helpers/event-labels.mjs";
import {
  BEST_OF, blankForm, blankStage, createPayload, divisionsPayload, eventPayload,
  stepProblem, stepsFor, WIZARD_ENTRANT_KINDS, WIZARD_KINDS,
} from "@/helpers/event-wizard.mjs";
import { useEventStore } from "@/stores";
import { cn } from "@/lib/utils";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>;

const DIVISION_COUNTS = [{ value: 0, title: "None" }, ...[2, 3, 4, 5, 6].map((value) => ({ value, title: `${value} divisions` }))];

// The helpers are plain JS, so their defaults type the parameters; the seam names the real shapes.
const blankForm_ = blankForm as (league?: Row | null) => Row;
const dateRange_ = dateRange as (event: Row) => string;

const orNone = (value: unknown) => (value === "" || value === null || value === undefined ? "None" : String(value));

// The twelve-column grid of the form: a field spans the row on a phone unless it says half
const FULL = "col-span-12";
const HALF = "col-span-6 min-[960px]:col-span-4";
const MD3 = "col-span-12 min-[960px]:col-span-3";
const MD4 = "col-span-12 min-[960px]:col-span-4";
const MD5 = "col-span-12 min-[960px]:col-span-5";
const MD6 = "col-span-12 min-[960px]:col-span-6";

/** One labelled text or number field of the wizard. */
function TextField({ label, hint, className, ...rest }: { label: string; hint?: string } & React.ComponentProps<typeof Input>) {
  const id = useId();
  return (
    <Field label={label} hint={hint} htmlFor={id} className={className}>
      <Input id={id} {...rest} />
    </Field>
  );
}

/** Creating one event: the steps an admin answers, then the write that makes the event
 *  with its stages, and the second write that adds its divisions. A signup-only event plays
 *  no stage, so the wizard leaves that step out and writes an empty stage list. The stepper
 *  numbers the steps it asks for, so one lookup picks the block each number carries. */
export function EventWizardView() {
  const router = useRouter();
  const search = useSearchParams();
  const store = useEventStore();
  const [asked, setAsked] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [leagues, setLeagues] = useState<Row[]>([]);
  const [form, setForm] = useState<Row>(() => blankForm_());

  const set = (patch: Row) => setForm((was) => ({ ...was, ...patch }));
  const setStage = (index: number, patch: Row) =>
    setForm((was) => ({ ...was, stages: was.stages.map((stage: Row, at: number) => (at === index ? { ...stage, ...patch } : stage)) }));

  // The steps this kind asks for. The stepper numbers them 1..n, so a step it leaves out
  // shifts every later number, and one lookup says what each number carries.
  const steps: { key: string; title: string }[] = stepsFor(form);
  // A kind with fewer steps must not leave the wizard past its last one
  const step = Math.min(asked, steps.length);
  const key = steps[step - 1]?.key;
  // The number of one step, or nothing when this kind does not ask for it
  const stepNumber = (name: string) => steps.findIndex((item) => item.key === name) + 1 || null;
  const league = leagues.find((row) => row.id === form.league_id) || null;
  // A qualifier feeds an event of the same league; a run cannot be part of itself
  const parentEvents: Row[] = league?.events || [];
  const problem: string | null = stepProblem(form, key);

  const moveStage = (index: number, delta: number) => {
    const stages = [...form.stages];
    const [stage] = stages.splice(index, 1);
    stages.splice(index + delta, 0, stage);
    set({ stages });
  };

  // The events of a league are read off the league itself, so a changed league reloads them
  const readLeague = async (id: number | null) => {
    if (!id) return;
    const full = await store.fetchLeague(id).catch(() => null);
    if (full) setLeagues((rows) => rows.map((row) => (row.id === id ? full : row)));
  };
  const pickLeague = (id: number | null) => {
    set({ league_id: id, parent_id: null });
    readLeague(id);
  };

  const review = () => {
    const it = form;
    const body: Row = eventPayload(it);
    return [
      {
        title: "Basics",
        step: stepNumber("basics"),
        rows: [
          { k: "League", v: league?.name || "—" },
          { k: "Name", v: it.name || "—" },
          { k: "Kind", v: titleOf(WIZARD_KINDS, it.kind) },
          { k: "Part of", v: parentEvents.find((e) => e.id === it.parent_id)?.name || "Nothing" },
          { k: "Starts", v: dateRange_({ starts_at: body.starts_at, start_date: body.start_date }) || "No date" },
          { k: "Ends", v: body.end_date ? dateText(body.end_date) : "No end date" },
          { k: "Round end zone", v: body.round_end_zone || NO_ROUND_END_ZONE },
          { k: "Region", v: orNone(it.region) },
          { k: "Description", v: orNone(it.description) },
          { k: "Page link", v: orNone(it.page_url) },
          { k: "Stream link", v: orNone(it.stream_url) },
        ],
      },
      {
        title: "Entrants",
        step: stepNumber("entrants"),
        rows: [
          { k: "Who may sign up", v: titleOf(SIGNUP_POLICIES, it.signup_policy) },
          { k: "An entrant is", v: titleOf(WIZARD_ENTRANT_KINDS, it.entrant_kind) },
          ...(it.entrant_kind === "team" ? [{ k: SERIES_PER_FIXTURE, v: String(body.series_per_round) }] : []),
          { k: "Entrant cap", v: orNone(it.entrant_cap) },
          { k: "MMR maximum", v: orNone(it.mmr_max) },
          { k: "Recent games at least", v: orNone(it.min_games) },
          { k: "Count the games over", v: body.min_games_seasons ? `${body.min_games_seasons} W3C seasons` : "Every W3C season" },
          { k: "Check-in", v: it.checkin_enabled ? `${it.checkin_days} days before a round` : "Off" },
          ...(it.checkin_enabled ? [{ k: "Early check-in", v: body.early_checkin ? "On" : "Off" }] : []),
          { k: "One entry per race", v: it.multi_entry ? "On" : "Off" },
        ],
      },
      {
        title: "Stages",
        // A signup-only event answers no stages step, so the group names the shape and offers no edit
        step: stepNumber("stages"),
        rows:
          it.kind === "signup"
            ? [{ k: titleOf(WIZARD_KINDS, it.kind), v: "No stages: a sign-up list" }]
            : it.stages.map((stage: Row, index: number) => ({
                k: stage.name || `Stage ${index + 1}`,
                v: [
                  titleOf(FORMATS, stage.format),
                  `best of ${stage.best_of}`,
                  ...(seriesPerEntrant(stage) ? [`${seriesPerEntrant(stage)} series each entrant a round`] : []),
                  ...(stage.format === "swiss" && stage.swiss_rounds ? [`${stage.swiss_rounds} rounds`] : []),
                  ...(stage.format === "round_robin" && stage.group_size ? [`groups of ${stage.group_size}`] : []),
                  ...(stage.format === "round_robin" && stage.group_advance ? [`${stage.group_advance} advance from each group`] : []),
                  ...(stage.format === "ffa" && stage.lobby_size ? [`lobbies of ${stage.lobby_size}`] : []),
                  ...(stage.format === "ffa" && stage.points_by_place ? [`places pay ${stage.points_by_place}`] : []),
                  titleOf(MAP_RULES, stage.map_rule).toLowerCase(),
                  titleOf(SCHEDULING_MODES, stage.scheduling_mode).toLowerCase(),
                  stage.advance_count ? `${stage.advance_count} advance` : "nobody advances",
                  stage.auto_advance ? "advance is automatic" : "advance by hand",
                ].join(" · "),
              })),
      },
      {
        title: "Divisions",
        step: stepNumber("divisions"),
        rows: it.division_count
          ? divisionsPayload(it).map((division: Row) => ({ k: `Division ${division.position}`, v: division.name }))
          : [{ k: "Divisions", v: "None" }],
      },
    ] as { title: string; step: number | null; rows: { k: string; v: string }[] }[];
  };

  const create = async () => {
    setSaving(true);
    setError(null);
    let id: number | null = null;
    let divisions: string | null = null;
    try {
      id = (await store.createEvent(createPayload(form))).id;
      if (form.division_count) await store.setDivisions(id as number, divisionsPayload(form));
    } catch (e) {
      // an event that is already written is read, not created again
      if (id) divisions = "unsaved";
      else setError(`The event was not created: ${(e as Error).message}`);
    } finally {
      setSaving(false);
    }
    if (id) router.push(`/events/${id}${divisions ? `?divisions=${divisions}` : ""}`);
  };

  useEffect(() => {
    (async () => {
      let rows: Row[] = [];
      try {
        rows = await store.fetchLeagues();
        setLeagues(rows);
      } catch (e) {
        setError(`The leagues did not load: ${(e as Error).message}`);
      }
      const preset = rows.find((row) => row.id === Number(search.get("league"))) || null;
      setForm(blankForm_(preset));
      readLeague(preset?.id ?? null);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <PageHeader title={<><Icon name="mdi-trophy-outline" className="mr-2" />New Event</>} />

      <StatusAlert modelValue={error} onClose={() => setError(null)} />

      {/* five step names do not fit a phone, so it reads the one it is on */}
      <div className="mb-2 text-muted-foreground min-[600px]:hidden">
        Step {step} of {steps.length} · {steps[step - 1].title}
      </div>
      <ol className="mb-4 hidden items-center gap-3 min-[600px]:flex">
        {steps.map((item, index) => (
          <li key={item.key} aria-current={index + 1 === step ? "step" : undefined} className={cn("flex flex-1 items-center gap-2", index + 1 !== step && "text-muted-foreground")}>
            <span className={cn("tnum flex size-6 items-center justify-center rounded-full text-xs", index + 1 <= step ? "bg-primary text-on-primary" : "bg-muted")}>
              {index + 1 < step ? <Icon name="mdi-check" /> : index + 1}
            </span>
            {item.title}
            {index < steps.length - 1 ? <span className="h-px flex-1 bg-border" /> : null}
          </li>
        ))}
      </ol>

      <div className="card rounded-lg p-4">
        {key === "basics" ? (
          <div className="grid grid-cols-12 gap-3">
            <Pick className={MD4} label="League" items={leagues.map((row) => ({ value: row.id as number, title: row.name as string }))} value={form.league_id} onChange={pickLeague} />
            <TextField className={MD5} label="Name" autoFocus value={form.name} onChange={(e) => set({ name: e.target.value })} />
            <Pick className={MD3} label="Kind" items={WIZARD_KINDS} value={form.kind} onChange={(kind) => set({ kind })} />
            <Pick
              className={MD6}
              label="Part of"
              hint="A qualifier names the event it feeds"
              clearable
              items={parentEvents.map((row) => ({ value: row.id as number, title: row.name as string }))}
              value={form.parent_id}
              onChange={(parent_id) => set({ parent_id })}
            />
            <TextField className={MD6} label="Region" placeholder="Europe" value={form.region} onChange={(e) => set({ region: e.target.value })} />
            <div className={MD4}>
              <SimpleDatePicker modelValue={form.start_date} label="Start date" onUpdateModelValue={(start_date) => set({ start_date })} />
            </div>
            <div className={MD4}>
              <SimpleDatePicker modelValue={form.end_date} label="End date" onUpdateModelValue={(end_date) => set({ end_date })} />
            </div>
            <div className={MD4}>
              <SimpleTimePicker modelValue={form.start_time} label="Start time" onUpdateModelValue={(start_time) => set({ start_time })} />
            </div>
            <Field className={MD6} label="Round end zone" hint="A round ends at midnight in this zone." htmlFor="wizard-round-end-zone">
              <Combobox
                id="wizard-round-end-zone"
                items={ROUND_END_ZONES}
                value={form.round_end_zone || null}
                placeholder={NO_ROUND_END_ZONE}
                onChange={(round_end_zone) => set({ round_end_zone: round_end_zone || "" })}
                className={form.round_end_zone ? undefined : "text-muted-foreground"}
              />
            </Field>
            <Field className={FULL} label="Description" htmlFor="wizard-description">
              <Textarea id="wizard-description" rows={2} value={form.description} onChange={(e) => set({ description: e.target.value })} />
            </Field>
            <TextField className={MD6} label="Page link" placeholder="https://" value={form.page_url} onChange={(e) => set({ page_url: e.target.value })} />
            <TextField className={MD6} label="Stream link" placeholder="https://" value={form.stream_url} onChange={(e) => set({ stream_url: e.target.value })} />
          </div>
        ) : key === "entrants" ? (
          <div className="grid grid-cols-12 gap-3">
            <Pick className={MD6} label="Who may sign up" items={SIGNUP_POLICIES} value={form.signup_policy} onChange={(signup_policy) => set({ signup_policy })} />
            <Pick className={MD6} label="An entrant is" items={WIZARD_ENTRANT_KINDS} value={form.entrant_kind} onChange={(entrant_kind) => set({ entrant_kind })} />
            {form.entrant_kind === "team" ? (
              <TextField className={MD4} type="number" min="1" label={SERIES_PER_FIXTURE} value={form.series_per_round} onChange={(e) => set({ series_per_round: e.target.value })} />
            ) : null}
            <TextField className={MD4} type="number" label="Entrant cap" placeholder="No cap" value={form.entrant_cap} onChange={(e) => set({ entrant_cap: e.target.value })} />
            <TextField className={MD4} type="number" label="MMR maximum" placeholder="No maximum" value={form.mmr_max} onChange={(e) => set({ mmr_max: e.target.value })} />
            <TextField className={MD4} type="number" label="Recent games at least" placeholder="No floor" value={form.min_games} onChange={(e) => set({ min_games: e.target.value })} />
            <TextField
              className={MD4}
              type="number"
              min="1"
              label="Count the games over"
              placeholder="Every W3C season"
              hint="Count games over the last N W3C seasons"
              value={form.min_games_seasons}
              onChange={(e) => set({ min_games_seasons: e.target.value })}
            />
            <Label className={cn(FULL, "flex items-center gap-2")}>
              <Switch checked={!!form.checkin_enabled} onCheckedChange={(checkin_enabled) => set({ checkin_enabled })} />
              Ask entrants to check in before each round
            </Label>
            {form.checkin_enabled ? (
              <>
                <TextField className={MD4} type="number" label="Check-in opens how many days before" value={form.checkin_days} onChange={(e) => set({ checkin_days: e.target.value })} />
                <div className={cn(MD6, "flex flex-col gap-1.5")}>
                  <Label className="flex items-center gap-2">
                    <Switch aria-describedby="wizard-early-checkin-help" checked={!!form.early_checkin} onCheckedChange={(early_checkin) => set({ early_checkin })} />
                    Early check-in
                  </Label>
                  <p id="wizard-early-checkin-help" className="text-xs text-muted-foreground">Players may check in for any round that has not ended</p>
                </div>
              </>
            ) : null}
            <Label className={cn(FULL, "flex items-center gap-2")}>
              <Switch checked={!!form.multi_entry} onCheckedChange={(multi_entry) => set({ multi_entry })} />
              One entry per race
            </Label>
          </div>
        ) : key === "stages" ? (
          <>
            {form.stages.map((stage: Row, index: number) => (
              <div key={index} className="mb-3 rounded-lg border p-4">
                <div className="mb-2 flex items-center">
                  <span className="text-sm font-medium">Stage {index + 1}</span>
                  <span className="flex-1" />
                  <Button variant="ghost" size="icon-sm" disabled={index === 0} aria-label="Move up" onClick={() => moveStage(index, -1)}>
                    <Icon name="mdi-arrow-up" />
                  </Button>
                  <Button variant="ghost" size="icon-sm" disabled={index === form.stages.length - 1} aria-label="Move down" onClick={() => moveStage(index, 1)}>
                    <Icon name="mdi-arrow-down" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    disabled={form.stages.length < 2}
                    aria-label="Remove stage"
                    onClick={() => set({ stages: form.stages.filter((_: Row, at: number) => at !== index) })}
                  >
                    <Icon name="mdi-delete-outline" />
                  </Button>
                </div>
                <div className="grid grid-cols-12 gap-3">
                  <TextField className={MD4} label="Name" placeholder={`Stage ${index + 1}`} value={stage.name} onChange={(e) => setStage(index, { name: e.target.value })} />
                  <Pick className={MD4} label="Format" items={FORMATS} value={stage.format} onChange={(format) => setStage(index, { format })} />
                  <Pick className={HALF} label="Best of" items={BEST_OF} value={stage.best_of} onChange={(best_of) => setStage(index, { best_of })} />
                  <Pick className={HALF} label="Map rule" items={MAP_RULES} value={stage.map_rule} onChange={(map_rule) => setStage(index, { map_rule })} />
                  {stage.format === "ffa" ? (
                    <>
                      <TextField className={HALF} type="number" min="2" label="Players per lobby" placeholder="The whole field" value={stage.lobby_size} onChange={(e) => setStage(index, { lobby_size: e.target.value })} />
                      <TextField className={HALF} label="Points each place pays" placeholder="4,3,2,1" hint="Best place first" value={stage.points_by_place} onChange={(e) => setStage(index, { points_by_place: e.target.value })} />
                    </>
                  ) : null}
                  {stage.format === "swiss" ? (
                    <TextField className={MD4} type="number" min="1" label="Rounds" placeholder="No limit" hint="The draw stops after this many rounds" value={stage.swiss_rounds} onChange={(e) => setStage(index, { swiss_rounds: e.target.value })} />
                  ) : null}
                  {stage.format === "round_robin" ? (
                    <>
                      <TextField className={MD4} type="number" min="1" label={SERIES_PER_ENTRANT_PER_ROUND} value={stage.series_per_entrant_per_round} onChange={(e) => setStage(index, { series_per_entrant_per_round: e.target.value })} />
                      <TextField className={MD4} type="number" min="2" label="Entrants per group" placeholder="One table a division" hint="The groups merge at the next stage" value={stage.group_size} onChange={(e) => setStage(index, { group_size: e.target.value })} />
                      <TextField className={MD4} type="number" min="1" label="Entrants each group advances" placeholder="Every entrant" hint="Taken from the top of each group" value={stage.group_advance} onChange={(e) => setStage(index, { group_advance: e.target.value })} />
                    </>
                  ) : null}
                  <Pick className={MD4} label="Scheduling" items={SCHEDULING_MODES} value={stage.scheduling_mode} onChange={(scheduling_mode) => setStage(index, { scheduling_mode })} />
                  <TextField className={MD4} type="number" label="Entrants who advance" placeholder="None" value={stage.advance_count} onChange={(e) => setStage(index, { advance_count: e.target.value })} />
                  <Label className={cn(FULL, "flex items-center gap-2")}>
                    <Switch checked={!!stage.auto_advance} onCheckedChange={(auto_advance) => setStage(index, { auto_advance })} />
                    Advance them as soon as the stage finishes
                  </Label>
                </div>
              </div>
            ))}
            <Button variant="outline" className="text-primary-text" onClick={() => set({ stages: [...form.stages, blankStage()] })}>
              <Icon name="mdi-plus" />
              Add stage
            </Button>
          </>
        ) : key === "divisions" ? (
          <>
            <p className="mb-4 text-muted-foreground">
              A division runs the whole event beside the others and never merges. The MMR bounds are cut on the entrants page once the signups are in.
            </p>
            <div className="grid grid-cols-12 gap-3">
              <Pick className={MD4} label="Divisions" items={DIVISION_COUNTS} value={form.division_count} onChange={(division_count) => set({ division_count: division_count ?? 0 })} />
            </div>
            <div className="mt-3 grid grid-cols-12 gap-3">
              {Array.from({ length: form.division_count }, (_, at) => (
                <TextField
                  key={at}
                  className={MD4}
                  label={`Division ${at + 1} name`}
                  placeholder={`Division ${at + 1}`}
                  value={form.division_names[at] ?? ""}
                  onChange={(e) => set({ division_names: Object.assign([...form.division_names], { [at]: e.target.value }) })}
                />
              ))}
            </div>
          </>
        ) : (
          review().map((group) => (
            <div key={group.title} className="mb-5">
              <div className="mb-1 flex items-center">
                <h2 className="text-base font-bold">{group.title}</h2>
                {group.step ? (
                  <Button variant="ghost" size="sm" className="ml-2" onClick={() => setAsked(group.step as number)}>
                    Edit
                  </Button>
                ) : null}
              </div>
              {group.rows.map((row) => (
                // a two-column row does not fit a phone
                <div key={row.k} className="grid grid-cols-[minmax(0,1fr)] gap-x-4 gap-y-0.5 border-b py-1.5 whitespace-pre-line min-[600px]:grid-cols-[240px_minmax(0,1fr)]">
                  <div className="text-muted-foreground">{row.k}</div>
                  <div>{row.v}</div>
                </div>
              ))}
            </div>
          ))
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button variant="ghost" disabled={step === 1} onClick={() => setAsked(step - 1)}>
          Back
        </Button>
        {problem ? <span className="text-sm text-muted-foreground">{problem}</span> : null}
        <span className="flex-1" />
        {step < steps.length ? (
          <Button disabled={!!problem} onClick={() => setAsked(step + 1)}>
            Next
          </Button>
        ) : (
          <Button disabled={!!problem || saving} onClick={create}>
            {saving ? <Icon name="mdi-loading mdi-spin" /> : null}
            Create event
          </Button>
        )}
      </div>
    </>
  );
}

export default EventWizardView;
