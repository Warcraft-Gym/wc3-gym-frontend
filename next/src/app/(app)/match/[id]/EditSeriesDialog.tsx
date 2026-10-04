/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { Fragment } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Field } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PlayerName } from "@/components/PlayerName";
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
  zone,
  editWins,
  scoreProblem,
  error,
  onSave,
  onClearResult,
  onCancel,
}: {
  open: boolean;
  series: Row | null;
  onPatch: (part: Row) => void;
  date: Date | null;
  onDateChange: (value: Date | null) => void;
  time: string | null;
  onTimeChange: (value: string) => void;
  zone: string; // the editor's own zone, which the picked time is read in
  editWins: number;
  scoreProblem: string | null;
  error: string;
  onSave: () => void;
  onClearResult?: () => void; // only while the stored series holds a result
  onCancel: () => void;
}) {
  if (!series) return null;

  // A series nobody played is stored 0-0; unticking clears both scores again
  const notPlayed = neverPlayed(editedScore(series.player1_score), editedScore(series.player2_score));
  const hostPlayers: Row[] = [series.player1, series.player2].filter(Boolean);

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? undefined : onCancel())} disablePointerDismissal>
      <DialogContent showCloseButton={false} size="md" className="flex flex-col gap-0 overflow-hidden p-0">
        <DialogTitle className="flex items-center gap-2 banner bg-banner px-4 py-3 text-primary">
          <Icon name="mdi-pencil" />
          Edit series
        </DialogTitle>

        <StatusAlert modelValue={error || null} className="mx-4 mt-4" />

        <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
          {/* When the series is played and who hosts it */}
          <div className="grid gap-4 @xl/dialog:grid-cols-3 @xl/dialog:items-end">
            <SimpleDatePicker modelValue={date} label="Scheduled Date" onUpdateModelValue={onDateChange} />
            <SimpleTimePicker modelValue={time} label={`Scheduled Time (${zone})`} onUpdateModelValue={onTimeChange} />
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
          </div>

          {/* The two players face each other: each one's score and the race he played, under his name */}
          <div className="grid gap-4 @xl/dialog:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
            {([1, 2] as const).map((n) => {
              const player: Row | null = series[`player${n}`] ?? null;
              const offRace: string | null = series[`player${n}_off_race`] ?? null;
              // The race that side signed the season up on, which the player of the payload carries
              const signupRace: string | null = player?.signup_race ?? null;
              return (
                <Fragment key={n}>
                  {n === 2 ? <span className="hidden self-center text-muted-foreground @xl/dialog:block">vs</span> : null}
                  <section aria-label={player?.name} className="flex min-w-0 flex-col gap-3 rounded border p-3">
                    <PlayerName player={player ?? {}} plain />
                    <Field label="Score" htmlFor={`p${n}-score`}>
                      <Input
                        id={`p${n}-score`}
                        type="number"
                        min={0}
                        max={editWins}
                        aria-label={`${player?.name} score`}
                        value={series[`player${n}_score`] ?? ""}
                        onChange={(event) => onPatch({ [`player${n}_score`]: event.target.value === "" ? null : Number(event.target.value) })}
                      />
                    </Field>
                    <Field
                      label="Race played"
                      htmlFor={`off-race-${n}`}
                      hint={offRace ? "An off race: not the race he signed up on" : signupRace ? "The race he signed up on" : undefined}
                    >
                      <div className="flex items-center gap-1">
                        <RaceSelect
                          id={`off-race-${n}`}
                          // The stored off race, else the signup race; shown only, a save writes what the editor picks
                          value={offRace ?? signupRace}
                          onChange={(value) => onPatch({ [`player${n}_off_race`]: value })}
                        />
                        {/* The picker itself offers no empty row, so the race played goes back to the signup race here */}
                        {offRace ? (
                          <Button variant="ghost" size="icon-sm" aria-label="Clear the race played" onClick={() => onPatch({ [`player${n}_off_race`]: null })}>
                            <Icon name="mdi-close" />
                          </Button>
                        ) : null}
                      </div>
                    </Field>
                  </section>
                </Fragment>
              );
            })}
          </div>

          {scoreProblem ? <div className="text-xs text-error">{scoreProblem}</div> : null}

          <div>
            <Label className="flex items-center gap-2">
              <Checkbox checked={notPlayed} onCheckedChange={(checked) => onPatch({ player1_score: checked ? 0 : null, player2_score: checked ? 0 : null })} />
              Not played
            </Label>
            <p className="mt-1 text-xs text-muted-foreground">Stores 0-0 and pays neither team.</p>
          </div>

          <Label className="flex items-center gap-2">
            <Checkbox checked={!!series.is_fantasy_match} onCheckedChange={(checked) => onPatch({ is_fantasy_match: !!checked })} />
            Is fantasy match
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
          {onClearResult ? (
            <Button variant="ghost" className="ml-auto text-error" onClick={onClearResult}>
              <Icon name="mdi-eraser" />
              Clear result
            </Button>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default EditSeriesDialog;
