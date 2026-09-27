/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { Checkbox } from "@/components/ui/checkbox";
import { Combobox } from "@/components/ui/Combobox";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { NO_ROUND_END_ZONE, ROUND_END_ZONES, SERIES_PER_FIXTURE } from "@/helpers/event-labels.mjs";

type Row = Record<string, any>;

// The scale the series points use, as the backend stores it
const SCORE_SYSTEMS = [
  { value: "standard", label: "Standard" },
  { value: "helpstone", label: "Helpstone" },
];

/** The season's own settings: name, rounds, dates, signups, check-in and the draft limit. */
export function GeneralStep({
  season,
  set,
  stages,
  maxMmr,
  setMaxMmr,
}: {
  season: Row;
  set: (part: Row) => void;
  stages: Row[];
  maxMmr: Record<number, string>;
  setMaxMmr: (next: Record<number, string>) => void;
}) {
  // A stored zone the browser does not name still shows in the select
  const storedZone: string | null = season.round_end_zone ?? null;
  const zoneItems = storedZone && !ROUND_END_ZONES.some((item: { value: string }) => item.value === storedZone)
    ? [...ROUND_END_ZONES, { value: storedZone, title: storedZone }]
    : ROUND_END_ZONES;

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Field label="Season Name" htmlFor="edit-name">
        <Input id="edit-name" autoFocus value={season.name ?? ""} onChange={(e) => set({ name: e.target.value })} />
      </Field>
      <Field label="Number of Rounds" htmlFor="edit-rounds">
        <Input id="edit-rounds" type="number" min={1} value={season.round_count ?? ""} onChange={(e) => set({ round_count: e.target.value })} />
      </Field>
      <Field label="Start Date" hint="Round 1 starts here; each round is one week." htmlFor="edit-start-date">
        <Input id="edit-start-date" type="date" value={season.start_date ?? ""} onChange={(e) => set({ start_date: e.target.value || null })} />
      </Field>
      <Field label="End Date" htmlFor="edit-end-date">
        <Input id="edit-end-date" type="date" value={season.end_date ?? ""} onChange={(e) => set({ end_date: e.target.value || null })} />
      </Field>
      <Field label="Pick Ban Order" htmlFor="edit-pick-ban">
        <Input id="edit-pick-ban" value={season.pick_ban ?? ""} onChange={(e) => set({ pick_ban: e.target.value })} />
      </Field>
      <Field label={SERIES_PER_FIXTURE} htmlFor="edit-series">
        <Input id="edit-series" type="number" value={season.series_per_round ?? ""} onChange={(e) => set({ series_per_round: e.target.value })} />
      </Field>
      <Field label="Score system" htmlFor="edit-score-system">
        <Select value={season.score_system ?? "standard"} onValueChange={(value) => set({ score_system: value })}>
          <SelectTrigger id="edit-score-system" className="w-full">
            <SelectValue>{(value: string) => SCORE_SYSTEMS.find((system) => system.value === value)?.label ?? value}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {SCORE_SYSTEMS.map((system) => (
              <SelectItem key={system.value} value={system.value}>
                {system.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <Field label="Discord Role ID" htmlFor="edit-discord-role">
        <Input id="edit-discord-role" value={season.discordRole ?? ""} onChange={(e) => set({ discordRole: e.target.value })} />
      </Field>
      <Field label="Round end zone" hint="A round ends at midnight in this zone." htmlFor="edit-round-end-zone">
        <Combobox
          id="edit-round-end-zone"
          items={zoneItems}
          value={season.round_end_zone || null}
          placeholder={NO_ROUND_END_ZONE}
          onChange={(zone) => set({ round_end_zone: zone || null })}
          className={season.round_end_zone ? undefined : "text-muted-foreground"}
        />
      </Field>
      <div className="flex flex-col justify-center gap-3">
        <Label className="flex items-center gap-2">
          <Switch checked={!!season.signups_open} onCheckedChange={(checked) => set({ signups_open: checked })} />
          Signups open
        </Label>
        <Label className="flex items-center gap-2">
          <Switch checked={!!season.scheduling_enabled} onCheckedChange={(checked) => set({ scheduling_enabled: checked })} />
          Availability tools
        </Label>
      </div>
      <Field label="Recent games at least" hint="Blank asks for no games at all." htmlFor="edit-min-games">
        <Input
          id="edit-min-games"
          type="number"
          min={0}
          value={season.min_games ?? ""}
          onChange={(e) => set({ min_games: e.target.value === "" ? "" : Number(e.target.value) })}
        />
      </Field>
      <Field label="Count the games over" hint="Blank counts every W3C season." htmlFor="edit-min-games-seasons">
        <Input
          id="edit-min-games-seasons"
          type="number"
          min={1}
          placeholder="Every W3C season"
          value={season.min_games_seasons ?? ""}
          onChange={(e) => set({ min_games_seasons: e.target.value === "" ? "" : Number(e.target.value) })}
        />
      </Field>
      <Label className="flex items-center gap-2">
        <Switch checked={!!season.checkin_enabled} onCheckedChange={(checked) => set({ checkin_enabled: checked })} />
        Check-in
      </Label>
      {/* A season with no check-in asks nobody, so the days and the early switch belong to it */}
      {season.checkin_enabled ? (
        <>
          <Field label="Check-in opens (days before a round)" hint="Blank keeps check-in open all season." htmlFor="edit-checkin">
            <Input
              id="edit-checkin"
              type="number"
              min={0}
              value={season.checkin_days ?? ""}
              onChange={(e) => set({ checkin_days: e.target.value === "" ? "" : Number(e.target.value) })}
            />
          </Field>
          <div className="flex flex-col gap-1.5">
            <Label className="flex items-center gap-2">
              <Switch aria-describedby="edit-early-checkin-help" checked={!!season.early_checkin} onCheckedChange={(checked) => set({ early_checkin: checked })} />
              Early check-in
            </Label>
            <p id="edit-early-checkin-help" className="text-xs text-muted-foreground">Players may check in for any round that has not ended</p>
          </div>
        </>
      ) : null}
      {/* The largest MMR difference belongs to a captain draft, so every other stage format leaves it out */}
      {stages
        .filter((stage) => stage.format === "gnl")
        .map((stage) => (
          <Field
            key={stage.id}
            label={stages.length > 1 ? `Largest MMR difference (${stage.name || `stage ${stage.position}`})` : "Largest MMR difference"}
            hint="Blank uses 100."
            htmlFor={`edit-max-mmr-${stage.id}`}
          >
            <Input
              id={`edit-max-mmr-${stage.id}`}
              type="number"
              min={1}
              value={maxMmr[stage.id] ?? stage.max_mmr_difference ?? ""}
              onChange={(e) => setMaxMmr({ ...maxMmr, [stage.id]: e.target.value })}
            />
          </Field>
        ))}
      <div className="flex flex-col gap-1.5">
        <Label className="flex items-center gap-2">
          <Checkbox checked={!!season.fantasy_grind} onCheckedChange={(checked) => set({ fantasy_grind: checked })} />
          Fantasy grind pick
        </Label>
        <p className="text-xs text-muted-foreground">Fantasy Captains pick a team and its achievement points pay by rank.</p>
      </div>
    </div>
  );
}

export default GeneralStep;
