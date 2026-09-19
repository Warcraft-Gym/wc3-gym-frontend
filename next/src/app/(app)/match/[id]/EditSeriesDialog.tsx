/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Field } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RaceSelect } from "@/components/RaceSelect";
import { SimpleDatePicker } from "@/components/SimpleDatePicker";
import { SimpleTimePicker } from "@/components/SimpleTimePicker";
import { StatusAlert } from "@/components/StatusAlert";
import { neverPlayed } from "@/helpers/best-of.mjs";
import type { Row } from "./match-cells";

// A blank field is no score at all, which Number() would read as a zero
const editedScore = (value: any) => (value === null || value === undefined || value === "" ? NaN : Number(value));

/** Edit one series: when it is played, how it ended, the races played and who hosts. */
export function EditSeriesDialog({
  open,
  series,
  onPatch,
  date,
  onDateChange,
  time,
  onTimeChange,
  adminZone,
  editWins,
  scoreProblem,
  error,
  onSave,
  onCancel,
}: {
  open: boolean;
  series: Row | null;
  onPatch: (part: Row) => void;
  date: Date | null;
  onDateChange: (value: Date | null) => void;
  time: string | null;
  onTimeChange: (value: string) => void;
  adminZone: string;
  editWins: number;
  scoreProblem: string | null;
  error: string;
  onSave: () => void;
  onCancel: () => void;
}) {
  if (!series) return null;

  // A series nobody played is stored 0-0; unticking clears both scores again
  const notPlayed = neverPlayed(editedScore(series.player1_score), editedScore(series.player2_score));
  const hostPlayers: Row[] = [series.player1, series.player2].filter(Boolean);

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? undefined : onCancel())} disablePointerDismissal>
      <DialogContent showCloseButton={false} className="flex max-h-[95vh] max-w-[65vw] flex-col gap-0 overflow-hidden p-0 sm:max-w-[65vw]">
        <DialogTitle className="flex items-center gap-2 bg-primary px-4 py-3 text-on-primary">
          <Icon name="mdi-pencil" />
          Edit series
        </DialogTitle>

        <StatusAlert modelValue={error || null} className="mx-4 mt-4" />

        <div className="grid flex-1 grid-cols-1 gap-4 overflow-y-auto p-4 sm:grid-cols-2">
          <SimpleDatePicker modelValue={date} label="Scheduled Date" onUpdateModelValue={onDateChange} />
          <SimpleTimePicker modelValue={time} label={`Scheduled Time (${adminZone})`} onUpdateModelValue={onTimeChange} />

          <Field label={`${series.player1?.name} Score`} htmlFor="p1-score">
            <Input
              id="p1-score"
              type="number"
              min={0}
              max={editWins}
              value={series.player1_score ?? ""}
              onChange={(event) => onPatch({ player1_score: event.target.value === "" ? null : Number(event.target.value) })}
            />
          </Field>
          <Field label={`${series.player2?.name} Score`} htmlFor="p2-score">
            <Input
              id="p2-score"
              type="number"
              min={0}
              max={editWins}
              value={series.player2_score ?? ""}
              onChange={(event) => onPatch({ player2_score: event.target.value === "" ? null : Number(event.target.value) })}
            />
          </Field>

          <div className="sm:col-span-2">
            <Label className="flex items-center gap-2">
              <Checkbox checked={notPlayed} onCheckedChange={(checked) => onPatch({ player1_score: checked ? 0 : null, player2_score: checked ? 0 : null })} />
              Not played
            </Label>
            <p className="mt-1 text-xs text-muted-foreground">Stores 0-0 and pays neither team.</p>
          </div>

          {scoreProblem ? <div className="text-xs text-error sm:col-span-2">{scoreProblem}</div> : null}

          {([1, 2] as const).map((n) => (
            <Field
              key={n}
              label={`${series[`player${n}`]?.name} played`}
              htmlFor={`off-race-${n}`}
              hint={series[`player${n}_off_race`] ? "An off race: not the race he signed up on" : "The race he signed up on"}
            >
              <div className="flex items-center gap-1">
                <RaceSelect
                  id={`off-race-${n}`}
                  // The stored off race, else the signup race the payload resolves. The prefill is
                  // shown only: a save writes an off race when the admin picks another race.
                  value={series[`player${n}_off_race`] ?? series[`player${n}_race`] ?? null}
                  onChange={(value) => onPatch({ [`player${n}_off_race`]: value })}
                />
                {/* The picker itself offers no empty row, so the race played goes back to the signup race here */}
                {series[`player${n}_off_race`] ? (
                  <Button variant="ghost" size="icon-sm" aria-label="Clear the race played" onClick={() => onPatch({ [`player${n}_off_race`]: null })}>
                    <Icon name="mdi-close" />
                  </Button>
                ) : null}
              </div>
            </Field>
          ))}

          <Field label="Choose a Host" htmlFor="host-player">
            <Select
              items={hostPlayers.map((player) => ({ value: player.id, label: player.battleTag }))}
              value={series.host_player_id ?? null}
              onValueChange={(value) => onPatch({ host_player_id: value as number })}
            >
              <SelectTrigger id="host-player" aria-label="Choose a Host" className="w-full">
                <SelectValue placeholder="Choose a Host" />
              </SelectTrigger>
              <SelectContent>
                {hostPlayers.map((player) => (
                  <SelectItem key={player.id} value={player.id}>
                    {player.battleTag}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Label className="flex items-center gap-2">
            <Checkbox checked={!!series.is_fantasy_match} onCheckedChange={(checked) => onPatch({ is_fantasy_match: !!checked })} />
            Is Fantasy Match
          </Label>
        </div>

        <div className="flex gap-2 border-t p-4">
          <Button onClick={onSave} disabled={!!scoreProblem}>
            <Icon name="mdi-check" />
            Save
          </Button>
          <Button variant="secondary" onClick={onCancel}>
            <Icon name="mdi-close" />
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default EditSeriesDialog;
