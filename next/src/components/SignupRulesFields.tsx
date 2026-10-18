"use client";
import { useId } from "react";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Note } from "@/components/ui/Note";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>;

/** One labelled number field. */
function NumberField({ label, hint, className, ...rest }: { label: string; hint?: string } & React.ComponentProps<typeof Input>) {
  const id = useId();
  return (
    <Field label={label} hint={hint} htmlFor={id} className={className}>
      <Input id={id} type="number" {...rest} />
    </Field>
  );
}

/** A cup's sign-up rules, as Create cup's sign-up step and the run page's Sign-up rules dialog both
 *  edit them: the eligibility check, the MMR and games it holds a player to, and whether only the
 *  sign-up race counts. The fields lay out by the room they get, so a dialog stacks them;
 *  `rulesPayload` in `cup-wizard.mjs` turns the form into the fields an event writes. */
export function SignupRulesFields({ form, set, className }: { form: Row; set: (patch: Row) => void; className?: string }) {
  const off = !form.eligibility_required;
  return (
    <div className={cn("@container", className)}>
      <div className="grid grid-cols-12 gap-3">
        <div className="col-span-12">
          <Label className="flex min-h-11 items-center gap-2">
            <Switch checked={!off} onCheckedChange={(eligibility_required) => set({ eligibility_required })} />
            Only eligible players can sign up
          </Label>
          <p className="text-sm text-muted-foreground">
            {off
              ? "Everyone can sign up. The rules below are off until you turn this on."
              : "A player needs a W3Champions rating on the race they sign up with, and the MMR and games below. Anyone else is refused, also when you add them by hand."}
          </p>
        </div>
        {/* the rules below apply only to eligible players, so they wait, disabled, while the check is off */}
        <NumberField className="col-span-6 @min-[520px]:col-span-4" min="0" label="MMR from" placeholder="No floor" disabled={off} value={form.mmr_min} onChange={(e) => set({ mmr_min: e.target.value })} />
        <NumberField className="col-span-6 @min-[520px]:col-span-4" min="0" label="MMR to" placeholder="No cap" disabled={off} value={form.mmr_max} onChange={(e) => set({ mmr_max: e.target.value })} />
        <NumberField
          className="col-span-12 @min-[520px]:col-span-4"
          min="0"
          label="Games at least"
          hint="Over all races, this W3C season and the one before"
          placeholder="No minimum"
          disabled={off}
          value={form.min_games}
          onChange={(e) => set({ min_games: e.target.value })}
        />
        <div className="col-span-12">
          <Label className="flex min-h-11 items-center gap-2">
            <Switch checked={!!form.signup_race_only} disabled={off} onCheckedChange={(signup_race_only) => set({ signup_race_only })} />
            Only the sign-up race counts for the MMR check
          </Label>
        </div>
        {form.signup_race_only ? null : (
          <>
            {off ? null : <Note className="col-span-12">{"The MMR of a player's other races also counts toward the MMR range: the best race with enough games is checked."}</Note>}
            <NumberField
              className="col-span-12 @min-[520px]:col-span-4"
              min="1"
              label="A race counts from"
              hint="Lifetime games on a race before its MMR counts, so a few games on an off race never decide"
              placeholder="20"
              disabled={off}
              value={form.race_games_min}
              onChange={(e) => set({ race_games_min: e.target.value })}
            />
          </>
        )}
      </div>
    </div>
  );
}
