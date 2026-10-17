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
import { Note } from "@/components/ui/Note";
import { BestOfPlan } from "@/components/BestOfPlan";
import { MapPoolPicker, type PoolMap } from "@/components/MapPoolPicker";
import { CustomMapPicker } from "@/components/CustomMapPicker";
import { bestOfLine } from "@/helpers/best-of-plan.mjs";
import { blankCup, cupCheckin, CUP_FORMATS, CUP_GAMES, CUSTOM_MODES, cupTeamSize, isCustom, FFA_MODES, FFA_TEAM_SIZES, ffaModeLine, ffaAdvance, ffaLine, ffaPoints, isFfa, CUP_PLAYS, cupPayload, cupProblem, cupSteps, DEFAULT_POINTS, laterRounds, livesLine, MAX_ROUNDS, PLACEMENT_LIVES, planFormat, PLAYOFFS, pointsOf, repeatChoices, repeatName, SWISS_MODES, swissLine, teamSizeOf } from "@/helpers/cup-wizard.mjs";
import { ladderModeOf } from "@/helpers/cup-teams.mjs";
import { cupMode } from "@/helpers/map-modes.mjs";
import { dateRange } from "@/helpers/event-labels.mjs";
import { dayText } from "@/helpers/cup-recurrence.mjs";
import { dayIso } from "@/helpers/date-input.mjs";
import { checkinSummary } from "@/helpers/checkin-window.mjs";
import { CheckinSettings } from "@/components/CheckinSettings";
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

/** Create cup: the few things an organizer decides for a cup, in five short steps, or six for a
 *  cup played over rounds, which also sets the points each place of a round pays.
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
  const steps = cupSteps(form);
  const key = steps[step - 1].key;
  const rounds = form.play === "rounds";
  const later: Row[] = laterRounds(form);
  // a round the organizer changed keeps its own day and time from then on
  const setLater = (index: number, patch: Row) => set({ later_rounds: later.map((row, at) => (at === index ? { ...row, ...patch, edited: true } : row)) });
  // how often a cup on the picked day can repeat, and the one picked
  const repeats: { value: number | null; title: string }[] = repeatChoices(form.start_date);
  const repeatsAs = repeats.find((item) => item.value === form.repeat_nth) || repeats[0];
  const ffa = isFfa(form);
  const custom = isCustom(form);
  // the players a team fields, or null for single players; a team FFA seats teams in its lobbies
  const teamSize: number | null = cupTeamSize(form);
  const ordinal = (place: number) => (place === 1 ? "1st" : place === 2 ? "2nd" : place === 3 ? "3rd" : `${place}th`);
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
    rounds
      ? {
          k: "Rounds",
          v: (cupPayload(form).legs || []).map((leg: Row, index: number) => `Round ${index + 1}: ${dateRange_({ starts_at: leg.starts_at }) || "no time yet"}`).join(" · "),
        }
      : { k: "When", v: dateRange_({ starts_at: cupPayload(form).starts_at }) || "No time yet" },
    {
      k: "Game",
      v: custom
        ? `Custom game, ${ffa ? `FFA, ${ffaModeLine(form)}` : form.custom_mode}`
        : ffa
          ? `FFA, ${ffaModeLine(form)}`
          : CUP_GAMES.find((game) => game.value === form.game)?.title,
    },
    {
      k: "Format",
      v: ffa ? ffaLine(form) : [
        format?.title,
        form.format === "single_elimination" && form.third_place ? "a match for third place" : null,
        form.format === "double_elimination" ? (form.grand_final_reset ? "grand final reset" : "one grand final") : null,
        form.format === "placement" ? livesLine(form.placement_lives) : null,
        form.format === "swiss" ? swissLine(form) : null,
      ]
        .filter(Boolean)
        .join(", "),
    },
    ffa
      ? { k: "Points per place", v: `${(ffaPoints(form) as number[]).join(", ")}; every lobby is one game` }
      : { k: "Best of", v: bestOfLine(Number(form.best_of), form.best_of_plan, planFormat(form)) },
    { k: "Seeds", v: form.hide_seeds ? "Hidden from players" : "Shown to everyone" },
    custom
      ? { k: "Map", v: form.custom_map ? `${form.custom_map.name}, every game; no veto` : "No map yet" }
      : { k: "Maps", v: form.pool.length ? form.pool.map((row: PoolMap) => row.name).join(", ") : "No maps" },
    {
      k: "Eligibility",
      v: [
        form.eligibility_required ? "Rated players only" : "Everyone can sign up",
        form.eligibility_required && (form.mmr_min || form.mmr_max) ? `MMR ${form.mmr_min || "any"} to ${form.mmr_max || "any"}` : null,
        form.eligibility_required && form.min_games ? `at least ${form.min_games} games` : null,
        form.eligibility_required ? (form.signup_race_only ? "only the sign-up race counts" : form.race_games_min ? `another race counts from ${form.race_games_min} games` : null) : null,
      ]
        .filter(Boolean)
        .join(", "),
    },
    {
      k: "Players",
      v: [form.entrant_min ? `at least ${form.entrant_min}` : null, form.entrant_cap ? `at most ${form.entrant_cap}` : null].filter(Boolean).join(", ") || "No bounds",
    },
    { k: "Divisions", v: form.uses_divisions ? "Split by MMR on the run page" : "One field" },
    ...(rounds ? [{ k: "Points per place", v: pointsOf(form).join(", ") }] : []),
    {
      k: "Repeats",
      v: form.repeat
        ? [`"${repeatName(form)}": ${repeatsAs?.title ?? "every week"} at ${form.start_time || "the start time"}`, form.repeat_until ? `until ${dayText(dayIso(form.repeat_until))}` : null]
            .filter(Boolean)
            .join(", ") + ". You create each next cup on its page."
        : "No, this cup stands alone",
    },
    { k: "Check-in", v: checkinSummary(cupCheckin(form), rounds ? "rounds" : "cup", cupPayload(form).starts_at) },
    { k: "Visible", v: form.published ? "Published, sign-ups open" : "Draft: only you and the admins see it, and it takes no sign-ups" },
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

      <div className="card mx-auto max-w-[860px] rounded-lg p-4">
        {key === "basics" ? (
          <div className="grid grid-cols-12 gap-3">
            <TextField className="col-span-12" label="Name" autoFocus placeholder="Friday Night Cup #13" value={form.name} onChange={(e) => set({ name: e.target.value })} />
            <div className="col-span-12 min-[600px]:col-span-6">
              <SimpleDatePicker modelValue={form.start_date} label={rounds ? "Round 1 day" : "Day"} onUpdateModelValue={(start_date) => set({ start_date })} />
            </div>
            <div className="col-span-12 min-[600px]:col-span-6">
              <SimpleTimePicker modelValue={form.start_time} label="Start time" onUpdateModelValue={(start_time) => set({ start_time })} />
            </div>
            <div className="col-span-12">
              <Choice label="How it is played" items={CUP_PLAYS} value={form.play} onChange={(play) => set({ play })} />
              <p className="mt-1 text-sm text-muted-foreground">
                {rounds
                  ? "Each round is a cup of its own with the same format. Players sign up once and check in for each round; every round's places pay points into an overall table."
                  : "The whole cup is played on one evening."}
              </p>
            </div>
            {rounds ? (
              <>
                <TextField
                  className="col-span-12 min-[600px]:col-span-4"
                  type="number"
                  min="2"
                  max={MAX_ROUNDS}
                  label="Rounds"
                  hint="Each a week after the one before; change any round's day below"
                  value={form.round_count}
                  onChange={(e) => set({ round_count: e.target.value })}
                />
                {later.map((row, index) => (
                  <div key={index} className="col-span-12 grid grid-cols-12 gap-3">
                    <div className="col-span-12 min-[600px]:col-span-6">
                      <SimpleDatePicker modelValue={row.date} label={`Round ${index + 2} day`} onUpdateModelValue={(date) => setLater(index, { date })} />
                    </div>
                    <div className="col-span-12 min-[600px]:col-span-6">
                      <SimpleTimePicker modelValue={row.time} label="Start time" onUpdateModelValue={(time) => setLater(index, { time })} />
                    </div>
                  </div>
                ))}
              </>
            ) : null}
            <div className="col-span-12 flex flex-col gap-3 rounded-lg border border-border p-3">
              <Label className="flex min-h-11 items-center gap-2">
                <Switch checked={!!form.repeat} onCheckedChange={(repeat) => set({ repeat })} />
                Repeat this cup on a schedule
              </Label>
              {form.repeat ? (
                repeats.length ? (
                  <>
                    <Choice label="How often" items={repeats.map((item) => ({ value: String(item.value), title: item.title }))} value={String(repeatsAs?.value ?? null)} onChange={(value) => set({ repeat_nth: value === "null" ? null : Number(value) })} />
                    <div className="grid grid-cols-12 gap-3">
                      <TextField
                        className="col-span-12 min-[600px]:col-span-6"
                        label="Name of the recurring cup"
                        hint="Each next cup is named after it and its day"
                        placeholder={repeatName({ name: form.name }) || "Friday Night Cup"}
                        value={form.repeat_name}
                        onChange={(e) => set({ repeat_name: e.target.value })}
                      />
                      <div className="col-span-12 min-[600px]:col-span-6">
                        <SimpleDatePicker modelValue={form.repeat_until} label="Last day (optional)" onUpdateModelValue={(repeat_until) => set({ repeat_until })} />
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Each time is a cup of its own with its own sign-ups. After creating, the recurring cup&apos;s page lists the coming days, and you create each next cup there with one press, as a copy of the last one.
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">Pick the day first; the cup repeats on that weekday.</p>
                )
              ) : null}
            </div>
            <div className="col-span-12">
              <Choice label="Game" items={CUP_GAMES} value={form.game} onChange={(game) => set({ game })} />
              {custom ? (
                <div className="mt-3">
                  <Choice label="Mode" items={CUSTOM_MODES} value={form.custom_mode} onChange={(custom_mode) => set({ custom_mode })} />
                </div>
              ) : null}
              {ffa ? (
                <div className="mt-3">
                  <Choice label="FFA mode" items={FFA_TEAM_SIZES} value={Number(form.ffa_team_size) || 1} onChange={(ffa_team_size) => set({ ffa_team_size })} />
                </div>
              ) : null}
              <p className="mt-1 text-sm text-muted-foreground">
                {custom ? "A custom game is played on one map you pick in the Maps step, every game on it and nothing vetoed. " : ""}
                {ffa
                  ? teamSize
                    ? `Free for all of teams of ${teamSize}: every lobby seats as many teams as play in it (${teamSize}v${teamSize}v${teamSize}…). A captain signs a team up and invites the others, every player confirms, and any player of a team in a lobby reports its places.`
                    : "Free for all, every player for themselves: every lobby seats as many players as play in it (1v1v1…), is one game, and a player of the lobby reports its places."
                  : teamSizeOf(form.game)
                    ? `A captain signs a team of ${teamSizeOf(form.game)} up and invites the others; every player confirms. Custom game cups come later.`
                    : "Custom game cups come later."}
              </p>
            </div>
            <Field className="col-span-12" label="Description" htmlFor="cup-description">
              <Textarea id="cup-description" rows={3} value={form.description} placeholder="Maps, rules, how results are reported" onChange={(e) => set({ description: e.target.value })} />
            </Field>
          </div>
        ) : key === "format" && ffa ? (
          <div className="flex flex-col gap-5">
            <div role="radiogroup" aria-label="Format" className="grid gap-3 min-[600px]:grid-cols-2">
              {FFA_MODES.map((item: Row) => (
                <button
                  key={item.value}
                  type="button"
                  role="radio"
                  aria-checked={item.value === form.ffa_mode}
                  onClick={() => set({ ffa_mode: item.value })}
                  className={cn("flex flex-col gap-1 rounded-lg border-2 p-4 text-left", item.value === form.ffa_mode ? "border-primary bg-primary/10" : "border-border")}
                >
                  <span className="font-heading text-lg font-bold">{item.title}</span>
                  <span className="text-sm text-muted-foreground">{item.hint}</span>
                </button>
              ))}
            </div>
            <div className="grid grid-cols-12 gap-3">
              <TextField
                className="col-span-12 min-[600px]:col-span-4"
                type="number"
                min={3}
                max={form.ffa_mode === "league" ? 12 : 8}
                label={form.ffa_mode === "league" ? (teamSize ? "Teams in the lobby" : "Players in the lobby") : teamSize ? "Teams per heat" : "Players per heat"}
                hint={form.ffa_mode === "league" ? (teamSize ? "Also the most teams the cup takes" : "Also the most players the cup takes") : "Uneven fields share out over the heats"}
                value={form.lobby_size}
                onChange={(e) => set({ lobby_size: e.target.value, ffa_points: [] })}
              />
              {form.ffa_mode === "league" ? (
                <TextField className="col-span-12 min-[600px]:col-span-4" type="number" min={2} max={10} label="Games" hint="The lobby plays them one after another" value={form.ffa_games} onChange={(e) => set({ ffa_games: e.target.value })} />
              ) : (
                <TextField
                  className="col-span-12 min-[600px]:col-span-4"
                  type="number"
                  min={1}
                  label="Places that go on"
                  hint="From every heat to the next round"
                  placeholder={String(ffaAdvance({ ...form, lobby_advance: "" }))}
                  value={form.lobby_advance}
                  onChange={(e) => set({ lobby_advance: e.target.value })}
                />
              )}
            </div>
            <div className="flex flex-col gap-2">
              <span className="text-sm text-muted-foreground">
                Points each place pays{form.ffa_mode === "league" ? ", added up over the games" : "; the final lobby decides the top places"}
              </span>
              <div className="grid grid-cols-4 gap-2 min-[600px]:grid-cols-8">
                {(ffaPoints(form) as number[]).map((value, index, all) => (
                  <TextField
                    key={index}
                    type="number"
                    min="0"
                    label={ordinal(index + 1)}
                    value={(form.ffa_points as string[])[index] ?? String(value)}
                    onChange={(e) => set({ ffa_points: all.map((old, at) => (at === index ? e.target.value : (form.ffa_points as string[])[at] ?? String(old))) })}
                  />
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <p className="text-sm text-muted-foreground">You seed the players on the evening; the heats share the seeds out so the strongest meet late.</p>
              <Label htmlFor="cup-hide-seeds" className="flex min-h-11 items-center gap-2">
                <Switch id="cup-hide-seeds" checked={!!form.hide_seeds} onCheckedChange={(hide_seeds) => set({ hide_seeds })} />
                Hide seeds from players
              </Label>
            </div>
          </div>
        ) : key === "format" ? (
          <div className="flex flex-col gap-5">
            <div role="radiogroup" aria-label="Format" className="grid gap-3 min-[600px]:grid-cols-2 min-[960px]:grid-cols-4">
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
            ) : form.format === "double_elimination" ? (
              <Label className="flex min-h-11 items-center gap-2">
                <Switch checked={!!form.grand_final_reset} onCheckedChange={(grand_final_reset) => set({ grand_final_reset })} />
                Grand final reset: the lower-bracket winner must win twice
              </Label>
            ) : form.format === "swiss" ? (
              <div className="flex flex-col gap-3">
                <div role="radiogroup" aria-label="How long it runs" className="flex flex-wrap items-center gap-2">
                  <span className="text-sm text-muted-foreground">It runs</span>
                  {SWISS_MODES.map((item) => (
                    <Button
                      key={item.value}
                      type="button"
                      size="sm"
                      role="radio"
                      aria-checked={item.value === form.swiss_mode}
                      variant={item.value === form.swiss_mode ? "secondary" : "outline"}
                      className="min-h-10 rounded-full"
                      onClick={() => set({ swiss_mode: item.value })}
                    >
                      {item.title}
                    </Button>
                  ))}
                </div>
                {form.swiss_mode === "all" ? (
                  <p className="text-sm text-muted-foreground">
                    Every player meets every other player once, and the table is the result. An odd field gives one player a bye each round.
                  </p>
                ) : (
                  <Field
                    label="Rounds"
                    hint="Each round pairs players on the same score. 8 players usually play 3 rounds, 16 play 4, 32 play 5; more rounds than the field holds are cut at the draw."
                    htmlFor="cup-swiss-rounds"
                  >
                    <Input
                      id="cup-swiss-rounds"
                      type="number"
                      min={2}
                      max={20}
                      className="w-28"
                      value={form.swiss_rounds}
                      onChange={(e) => set({ swiss_rounds: e.target.value })}
                    />
                  </Field>
                )}
                <div role="radiogroup" aria-label="Then a playoff" className="flex flex-wrap items-center gap-2">
                  <span className="text-sm text-muted-foreground">Then</span>
                  {PLAYOFFS.map((item) => (
                    <Button
                      key={item.value}
                      type="button"
                      size="sm"
                      role="radio"
                      aria-checked={item.value === Number(form.playoff)}
                      variant={item.value === Number(form.playoff) ? "secondary" : "outline"}
                      className="min-h-10 rounded-full"
                      onClick={() => set({ playoff: item.value })}
                    >
                      {item.title}
                    </Button>
                  ))}
                </div>
                <p className="text-sm text-muted-foreground">
                  {Number(form.playoff)
                    ? `The top ${form.playoff} of the table play a single elimination, drawn by itself once the last result is in.`
                    : "The table after the last round gives every place."}{" "}
                  The next round draws itself once every result of a round is in.
                </p>
                {Number(form.playoff) ? (
                  <Label className="flex min-h-11 items-center gap-2">
                    <Switch checked={!!form.third_place} onCheckedChange={(third_place) => set({ third_place })} />
                    The playoff plays a match for third place
                  </Label>
                ) : null}
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <div role="radiogroup" aria-label="A player stops after" className="flex flex-wrap items-center gap-2">
                  <span className="text-sm text-muted-foreground">A player stops after</span>
                  {PLACEMENT_LIVES.map((item) => (
                    <Button
                      key={item.title}
                      type="button"
                      size="sm"
                      role="radio"
                      aria-checked={item.value === (form.placement_lives ?? null)}
                      variant={item.value === (form.placement_lives ?? null) ? "secondary" : "outline"}
                      className="min-h-10 rounded-full"
                      onClick={() => set({ placement_lives: item.value })}
                    >
                      {item.title}
                    </Button>
                  ))}
                </div>
                <p className="text-sm text-muted-foreground">{PLACEMENT_LIVES.find((item) => item.value === (form.placement_lives ?? null))?.hint}</p>
              </div>
            )}
            <div className="flex flex-col gap-1">
              <span className="text-sm text-muted-foreground">Best of</span>
              <BestOfPlan format={planFormat(form)} bestOf={Number(form.best_of)} plan={form.best_of_plan} onChange={(best_of, best_of_plan) => set({ best_of, best_of_plan })} />
            </div>
            <div className="flex flex-col gap-1">
              <p className="text-sm text-muted-foreground">You seed the players on the evening: by MMR, at random or by hand.</p>
              <Label htmlFor="cup-hide-seeds" className="flex min-h-11 items-center gap-2">
                <Switch id="cup-hide-seeds" aria-describedby="cup-hide-seeds-hint" checked={!!form.hide_seeds} onCheckedChange={(hide_seeds) => set({ hide_seeds })} />
                Hide seeds from players
              </Label>
              {/* the hint starts under the label text, past the switch and its gap */}
              <p id="cup-hide-seeds-hint" className="pl-10 text-sm text-muted-foreground">Only the organizers and admins see the seed numbers.</p>
            </div>
          </div>
        ) : key === "maps" && custom ? (
          // the step's footer names what is missing, so the picker does not repeat it
          <CustomMapPicker value={form.custom_map} onChange={(custom_map) => set({ custom_map })} />
        ) : key === "maps" ? (
          <MapPoolPicker
            pool={form.pool}
            onChange={(pool) => set({ pool })}
            problem={problem}
            // no FFA ladder pool to import: the FFA maps of the app come first
            ladderMode={ffa ? null : (ladderModeOf(teamSizeOf(form.game)) as string | null)}
            mode={ffa ? "ffa" : cupMode(teamSizeOf(form.game))}
          />
        ) : key === "signups" ? (
          <div className="flex flex-col gap-6">
            <section className="grid grid-cols-12 gap-3" aria-labelledby="cup-signup-info">
              <h3 id="cup-signup-info" className="col-span-12 text-lg">Sign-up information</h3>
              <TextField className="col-span-6" type="number" min="2" label="Minimum players" placeholder="No minimum" value={form.entrant_min} onChange={(e) => set({ entrant_min: e.target.value })} />
              <TextField className="col-span-6" type="number" min="2" label="Maximum players" placeholder="No maximum" value={form.entrant_cap} onChange={(e) => set({ entrant_cap: e.target.value })} />
              <p className="col-span-12 text-sm text-muted-foreground">
                The bracket is drawn with the players who are still in on the evening. Below the minimum you choose to wait, move the start or cancel.
              </p>
              <div className="col-span-12">
                <Label className="flex min-h-11 items-center gap-2">
                  <Switch checked={!!form.uses_divisions} onCheckedChange={(uses_divisions) => set({ uses_divisions })} />
                  Split the players into divisions
                </Label>
                <p className="text-sm text-muted-foreground">You cut the divisions by MMR on the run page once the players have signed up. Each division plays its own bracket.</p>
              </div>
              <div className="col-span-12">
                <CheckinSettings id="cup-checkin" kind={rounds ? "rounds" : "cup"} value={cupCheckin(form)} onChange={set} startsAt={cupPayload(form).starts_at} />
              </div>
              <div className="col-span-12">
                <Label className="flex min-h-11 items-center gap-2">
                  <Switch checked={!!form.published} onCheckedChange={(published) => set({ published })} />
                  Publish now
                </Label>
                <p className="text-sm text-muted-foreground">
                  {form.published ? "Players see the cup and can sign up as soon as you create it." : "A draft only you and the admins see. It takes no sign-ups until it is published."}
                </p>
              </div>
            </section>

            <section className="grid grid-cols-12 gap-3" aria-labelledby="cup-signup-rules">
              <h3 id="cup-signup-rules" className="col-span-12 text-lg">Sign-up rules</h3>
              <div className="col-span-12">
                <Label className="flex min-h-11 items-center gap-2">
                  <Switch checked={!!form.eligibility_required} onCheckedChange={(eligibility_required) => set({ eligibility_required })} />
                  Only eligible players can sign up
                </Label>
                <p className="text-sm text-muted-foreground">
                  {form.eligibility_required
                    ? "A player needs a W3Champions rating on the race they sign up with, and the MMR and games below. Anyone else is refused, also when you add them by hand."
                    : "Everyone can sign up. The rules below are off until you turn this on."}
                </p>
              </div>
              {/* the rules below apply only to eligible players, so they wait, disabled, while the check is off */}
              <TextField className="col-span-6 min-[600px]:col-span-4" type="number" min="0" label="MMR from" placeholder="No floor" disabled={!form.eligibility_required} value={form.mmr_min} onChange={(e) => set({ mmr_min: e.target.value })} />
              <TextField className="col-span-6 min-[600px]:col-span-4" type="number" min="0" label="MMR to" placeholder="No cap" disabled={!form.eligibility_required} value={form.mmr_max} onChange={(e) => set({ mmr_max: e.target.value })} />
              <TextField
                className="col-span-12 min-[600px]:col-span-4"
                type="number"
                min="0"
                label="Games at least"
                hint="Over all races, this W3C season and the one before"
                placeholder="No minimum"
                disabled={!form.eligibility_required}
                value={form.min_games}
                onChange={(e) => set({ min_games: e.target.value })}
              />
              <div className="col-span-12">
                <Label className="flex min-h-11 items-center gap-2">
                  <Switch
                    checked={!!form.signup_race_only}
                    disabled={!form.eligibility_required}
                    onCheckedChange={(signup_race_only) => set({ signup_race_only })}
                  />
                  Only the sign-up race counts for the MMR check
                </Label>
              </div>
              {form.signup_race_only ? null : (
                <>
                  {form.eligibility_required ? <Note className="col-span-12">{"The MMR of a player's other races also counts toward the MMR range: the best race with enough games is checked."}</Note> : null}
                  <TextField
                    className="col-span-12 min-[600px]:col-span-4"
                    type="number"
                    min="1"
                    label="A race counts from"
                    hint="Lifetime games on a race before its MMR counts, so a few games on an off race never decide"
                    placeholder="20"
                    disabled={!form.eligibility_required}
                    value={form.race_games_min}
                    onChange={(e) => set({ race_games_min: e.target.value })}
                  />
                </>
              )}
            </section>
          </div>
        ) : key === "points" ? (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">
              The points each place of a round pays. A player who misses a round scores 0 for it, and a place past the list pays 0. Players level on points are split by their best single result.
            </p>
            <div className="grid grid-cols-3 gap-3 min-[600px]:grid-cols-6">
              {(form.points as string[]).map((value, index) => (
                <TextField
                  key={index}
                  type="number"
                  min="0"
                  label={ordinal(index + 1)}
                  value={value}
                  onChange={(e) => set({ points: (form.points as string[]).map((old, at) => (at === index ? e.target.value : old)) })}
                />
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => set({ points: [...form.points, ""] })}>
                <Icon name="mdi-plus" />
                Add a place
              </Button>
              <Button variant="outline" disabled={form.points.length <= 1} onClick={() => set({ points: form.points.slice(0, -1) })}>
                <Icon name="mdi-minus" />
                Remove the last place
              </Button>
              <Button variant="ghost" onClick={() => set({ points: DEFAULT_POINTS.map(String) })}>
                Reset to {DEFAULT_POINTS.join(", ")}
              </Button>
            </div>
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
        {step < steps.length ? (
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
