"use client";
import { useImperativeHandle, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Icon } from "@/components/ui/Icon";
import { toneClass } from "@/components/ui/tone";
import { PlayerName } from "@/components/PlayerName";
import { SimpleDatePicker } from "@/components/SimpleDatePicker";
import { SimpleTimePicker } from "@/components/SimpleTimePicker";
import { StatusAlert } from "@/components/StatusAlert";
import { backendUrl, fetchWrapper } from "@/helpers";
import { authHeader } from "@/helpers/fetch-wrapper";
import { commonHours, freeLines } from "@/helpers/blocks.mjs";
import { actsForSeries } from "@/helpers/series-actions.mjs";
import { pickedInstant, pickerParts, viewerZone, zoneLabel } from "@/helpers/timezone.mjs";
import { cn } from "@/lib/utils";
import { useAuth } from "@/stores";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>;
type Picked = { id?: number; date?: Date | null; time?: string; opponent?: Row; asAdmin?: boolean };

export type ScheduleDialogHandle = { open: (item: Row) => void };

const HINT_LINES = 6;
const CAPTION = "text-xs text-muted-foreground";

/** The player sets the time of one of his series, in his own clock. The hours both
 *  sides are open are a hint under the pickers, never a reason to refuse a save. */
export function ScheduleDialog({
  playerId = null,
  onSaved,
  ref,
}: {
  playerId?: number | null;
  onSaved?: (message: string) => void;
  ref?: React.Ref<ScheduleDialogHandle>;
}) {
  const { isAdmin } = useAuth();
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [series, setSeries] = useState<Picked>({});
  // The hours both players are open this round; a hint only
  const [freeTime, setFreeTime] = useState<Row | null>(null);
  // the series the dialog holds now, so a late free-time answer for another one is dropped
  const held = useRef<number | null>(null);
  const userTimezone: string = viewerZone();

  // A season with the tools off, or a series the backend will not answer for, shows nothing
  const readFreeTime = async (seriesId: number) => {
    const found = await fetchWrapper.get(`${backendUrl}/player-series/${seriesId}/free-time`).catch(() => null);
    if (held.current === seriesId) setFreeTime(found);
  };

  useImperativeHandle(ref, () => ({
    open: (item: Row) => {
      setErrorMessage(null);
      const mine = item.player1_id === playerId;
      held.current = item.id;
      setSeries({
        id: item.id,
        ...(item.date_time ? pickerParts(item.date_time, userTimezone) : { date: null, time: "" }),
        opponent: (mine ? item.player2 : item.player1) ?? { name: "your opponent" },
        // Only an admin the side gate answers nothing for writes the admin route; a member of a team side keeps the player route
        asAdmin: isAdmin && !actsForSeries(item, { id: playerId }),
      });
      setFreeTime(null);
      setShow(true);
      readFreeTime(item.id);
    },
  }));

  const sharedLines: string[] = freeLines(freeTime?.ranges ?? [], userTimezone).slice(0, HINT_LINES);
  const moreLines = Math.max((freeTime?.ranges?.length ?? 0) - HINT_LINES, 0);

  // the instant the dialog's date and time name, read in the player's zone
  const chosen = series.date instanceof Date && series.time ? pickedInstant(series.date, series.time, userTimezone) : null;
  // the opponent's zone and the chosen time on their clock; their availability stays private
  const opponentZone = zoneLabel(series.opponent?.timezone, userTimezone, chosen);
  const opponentTime = opponentZone && chosen ? chosen.setZone(series.opponent?.timezone).toFormat("ccc d LLL, HH:mm") : "";

  const isValid = !!(series.date && series.time);

  const save = async () => {
    setSaving(true);
    try {
      if (series.asAdmin) {
        await fetchWrapper.put(`${backendUrl}/series/${series.id}`, { date_time: chosen?.toUTC().toISO() });
        setShow(false);
        onSaved?.("Schedule updated successfully!");
        return;
      }
      const formData = new FormData();
      const utcDateTime = chosen?.toUTC().toFormat("yyyy-MM-dd HH:mm:ss") ?? null;
      if (utcDateTime) formData.append("date_time", utcDateTime);
      formData.append("action", "scheduled");

      const url = `${backendUrl}/player-series/${series.id}`;
      const response = await fetch(url, { method: "PUT", headers: await authHeader("PUT", url), body: formData });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Update failed");
      }
      setShow(false);
      onSaved?.("Schedule updated successfully!");
    } catch (error) {
      setErrorMessage((error as Error).message || "Error saving schedule.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={show} onOpenChange={setShow}>
      <DialogContent showCloseButton={false} className="max-w-[500px] gap-0 p-0 sm:max-w-[500px]">
        <DialogTitle className="flex items-center gap-2 bg-primary px-4 py-3 text-on-primary">
          <Icon name="mdi-calendar-edit" />
          Edit schedule
        </DialogTitle>
        <div className="flex flex-col gap-3 p-4">
          <StatusAlert modelValue={errorMessage} onClose={() => setErrorMessage(null)} className="mb-0" />
          <div className={cn("flex items-start gap-2 rounded px-3 py-2 text-sm", toneClass("info"))}>
            <Icon name="mdi-information-outline" />
            <span>Enter time in your local timezone ({zoneLabel(userTimezone, userTimezone, chosen)}).</span>
          </div>
          <form className="grid gap-3 md:grid-cols-2" onSubmit={(event) => event.preventDefault()}>
            <SimpleDatePicker modelValue={series.date} label="Date" onUpdateModelValue={(date) => setSeries((was) => ({ ...was, date }))} />
            <SimpleTimePicker modelValue={series.time} label={`Time (${userTimezone})`} onUpdateModelValue={(time) => setSeries((was) => ({ ...was, time }))} />
          </form>
          {opponentZone ? (
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <PlayerName player={series.opponent ?? {}} plain />
                {opponentTime ? <strong className="whitespace-nowrap">{opponentTime}</strong> : null}
              </div>
              <div className={CAPTION}>{opponentZone}</div>
            </div>
          ) : null}
          {freeTime ? (
            <div>
              <div className="text-sm font-medium">{commonHours(freeTime.hours)}</div>
              {sharedLines.map((line) => (
                <div key={line} className={CAPTION}>{line}</div>
              ))}
              {moreLines ? <div className={CAPTION}>+{moreLines} more</div> : null}
              <div className={cn(CAPTION, "mt-2")}>Open hours are a starting point, not a promise. Agree the time with your opponent.</div>
            </div>
          ) : null}
        </div>
        <div className="flex justify-end gap-2 p-4 pt-0">
          <Button variant="ghost" disabled={saving} onClick={() => setShow(false)}>
            Cancel
          </Button>
          <Button disabled={!isValid || saving} onClick={save}>
            <Icon name={saving ? "mdi-loading mdi-spin" : "mdi-content-save"} />
            Save
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default ScheduleDialog;
