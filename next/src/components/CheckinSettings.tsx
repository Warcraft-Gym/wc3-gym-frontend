"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/Icon";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { CHECKIN_UNITS, checkinProblem, checkinSummary, editOpening, openingAmount, toMinutes, unitOf } from "@/helpers/checkin-window.mjs";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>;
type Kind = "cup" | "rounds" | "gnl";

// The default close a runner picks first when check-in closes before the start
const CLOSE_BEFORE = 30;

/** The check-in settings of a cup, a cup over rounds or a GNL season: the Check-in switch and one
 *  line that says when it opens and closes, with the opening, the close and early check-in under
 *  Advanced. A cup over rounds always checks in per round, so it has no switch. */
export function CheckinSettings({
  id,
  kind,
  value,
  onChange,
  startsAt = null,
}: {
  id: string;
  kind: Kind;
  // checkin_enabled, checkin_opens_minutes, checkin_closes_minutes ('' while its minutes are blank) and early_checkin
  value: Row;
  onChange: (patch: Row) => void;
  // the start of a cup that plays once, so the line names the opening on the reader's clock
  startsAt?: string | null;
}) {
  const [advanced, setAdvanced] = useState(false);
  // the opening's unit: the one that counts the minutes whole as the block mounts, then only the Select's pick
  const [unit, setUnit] = useState(() => unitOf(value.checkin_opens_minutes));
  const opens: number | null = value.checkin_opens_minutes ?? null;
  const closes = value.checkin_closes_minutes;
  const before = closes !== null && closes !== undefined;
  const on = kind === "rounds" || value.checkin_enabled !== false;
  const problem: string | null = checkinProblem({ ...value, checkin_enabled: on });
  const start = kind === "gnl" ? "a round" : kind === "rounds" ? "each round" : "the start";

  return (
    <div className="flex flex-col gap-2">
      {kind === "rounds" ? (
        <span className="text-sm font-bold">Check-in for each round</span>
      ) : (
        <Label className="flex min-h-11 items-center gap-2">
          <Switch id={`${id}-enabled`} aria-describedby={`${id}-summary`} checked={on} onCheckedChange={(checkin_enabled) => onChange({ checkin_enabled })} />
          Check-in
        </Label>
      )}
      <p id={`${id}-summary`} className="text-sm">
        {checkinSummary({ ...value, checkin_enabled: on }, kind, startsAt)}
      </p>
      {on ? (
        <>
          <Button
            id={`${id}-advanced-toggle`}
            variant="ghost"
            size="sm"
            className="self-start text-primary-text"
            aria-expanded={advanced}
            aria-controls={`${id}-advanced`}
            onClick={() => setAdvanced(!advanced)}
          >
            <Icon name={advanced ? "mdi-chevron-up" : "mdi-chevron-down"} />
            Advanced
          </Button>
          {advanced ? (
            <div id={`${id}-advanced`} className="flex flex-col gap-4 border-l-2 border-border pl-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor={`${id}-opens`}>Opens</Label>
                <div className="flex flex-wrap items-center gap-2">
                  <Input
                    id={`${id}-opens`}
                    type="number"
                    min={0}
                    className="w-24"
                    aria-describedby={`${id}-opens-hint`}
                    value={openingAmount(opens, unit)}
                    onChange={(e) => onChange({ checkin_opens_minutes: editOpening({ minutes: opens, unit }, { amount: e.target.value }).minutes })}
                  />
                  <Select
                    value={unit}
                    onValueChange={(picked) => {
                      const next = editOpening({ minutes: opens, unit }, { unit: picked as string });
                      setUnit(next.unit);
                      if (next.minutes !== opens) onChange({ checkin_opens_minutes: next.minutes });
                    }}
                  >
                    <SelectTrigger id={`${id}-opens-unit`} aria-label="Unit" className="w-32">
                      <SelectValue>{(picked: string) => CHECKIN_UNITS.find((item) => item.value === picked)?.title ?? picked}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {CHECKIN_UNITS.map((item) => (
                        <SelectItem key={item.value} value={item.value}>
                          {item.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <span className="text-sm">before {start}</span>
                </div>
                <p id={`${id}-opens-hint`} className="text-xs text-muted-foreground">Blank opens it at sign-up.</p>
              </div>

              <div className="flex flex-col gap-1.5">
                <span id={`${id}-closes-label`} className="text-sm font-medium">
                  Closes
                </span>
                <RadioGroup
                  aria-labelledby={`${id}-closes-label`}
                  aria-describedby={`${id}-closes-hint`}
                  value={before ? "before" : "end"}
                  onValueChange={(picked) => onChange({ checkin_closes_minutes: picked === "before" ? CLOSE_BEFORE : null })}
                >
                  <label className="flex min-h-11 items-center gap-2 text-sm">
                    <RadioGroupItem id={`${id}-closes-end`} value="end" />
                    {kind === "gnl" ? "When the round ends (late check-in)" : "At the draw"}
                  </label>
                  <div className="flex min-h-11 flex-wrap items-center gap-2 text-sm">
                    <RadioGroupItem id={`${id}-closes-before`} value="before" aria-label="Minutes before the start" />
                    <Input
                      id={`${id}-closes`}
                      type="number"
                      min={0}
                      className="w-24"
                      aria-label="Minutes before the start check-in closes"
                      value={before ? String(closes) : ""}
                      // typing a number picks this close
                      onChange={(e) => onChange({ checkin_closes_minutes: e.target.value === "" ? "" : toMinutes(e.target.value, "minutes") })}
                    />
                    <label htmlFor={`${id}-closes`}>minutes before the start</label>
                  </div>
                </RadioGroup>
                <p id={`${id}-closes-hint`} className="text-xs text-muted-foreground">
                  Leaves time before the draw, for example 15 to 30 minutes for a cast cup.
                </p>
              </div>

              <div className="flex flex-col gap-1">
                <Label className="flex min-h-11 items-center gap-2">
                  <Switch id={`${id}-early`} aria-describedby={`${id}-early-hint`} checked={!!value.early_checkin} onCheckedChange={(early_checkin) => onChange({ early_checkin })} />
                  Early check-in
                </Label>
                <p id={`${id}-early-hint`} className="text-xs text-muted-foreground">
                  Players may check in at any time before it opens.
                </p>
              </div>
            </div>
          ) : null}
          {problem ? (
            <p role="alert" className="text-xs text-error">
              {problem}
            </p>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

export default CheckinSettings;
