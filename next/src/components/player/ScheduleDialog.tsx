"use client";
import { useImperativeHandle, useRef, useState } from "react";
import Link from "next/link";
import { DateTime } from "luxon";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Icon } from "@/components/ui/Icon";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { toneClass } from "@/components/ui/tone";
import { PlayerName } from "@/components/PlayerName";
import { SimpleDatePicker } from "@/components/SimpleDatePicker";
import { SimpleTimePicker } from "@/components/SimpleTimePicker";
import { StatusAlert } from "@/components/StatusAlert";
import { backendUrl, fetchWrapper } from "@/helpers";
import { authHeader } from "@/helpers/fetch-wrapper";
import { commonHours } from "@/helpers/blocks.mjs";
import { roundEndLine } from "@/helpers/rounds.mjs";
import { blockedSpans, dayCells, insideBlocked, windowDays, zoneRow } from "@/helpers/schedule-grid.mjs";
import { seriesContext } from "@/helpers/series-actions.mjs";
import { pickedInstant, pickerParts, viewerZone } from "@/helpers/timezone.mjs";
import { useBreakpoint, XS } from "@/hooks/breakpoint";
import { cn } from "@/lib/utils";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>;
type Span = { start: DateTime; end: DateTime };
type Cell = { at: DateTime; label: string; outside: boolean; blocked: boolean };
type Day = { key: string; day: DateTime; label: string; today: boolean; first: DateTime; last: DateTime };
type Clock = { zone: string; gmt: string; time: string; date: string; differs: boolean };
type Picked = { row?: Row; id?: number; date?: Date | null; time?: string };

export type ScheduleDialogHandle = { open: (item: Row) => void };

// The helpers are plain JS, so their defaults type the parameters; the seam names the real shapes.
const spansOf = blockedSpans as unknown as (free: Row[], start: string, end: string) => Span[];
const daysOf = windowDays as unknown as (start: string, end: string, zone: string) => Day[];
const cellsOf = dayCells as unknown as (day: Day, blocked: Span[]) => Cell[];
const isBlocked = insideBlocked as unknown as (pick: DateTime | null, blocked: Span[]) => boolean;
const clockOf = zoneRow as unknown as (pick: DateTime, zone: string, viewer: string) => Clock;
const contextOf = seriesContext as unknown as (series: Row, options: { playerId?: number | null }) => string;

const CAPTION = "text-xs text-muted-foreground";
const SWATCH = "h-3 w-3 rounded-sm";
// The days one calendar page holds, so the grid never widens the dialog; the pager walks the window
const PAGE_DAYS = { phone: 3, wide: 7 };

/** Whoever acts for a series sets its time over the round window, as a calendar or one track a day; a pick inside a blocked hour is named and still booked. */
export function ScheduleDialog({
  playerId = null,
  onSaved,
  ref,
}: {
  playerId?: number | null;
  onSaved?: (message: string) => void;
  ref?: React.Ref<ScheduleDialogHandle>;
}) {
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [series, setSeries] = useState<Picked>({});
  // one read per opening: undefined in flight, null failed, the answer once in
  const [freeTime, setFreeTime] = useState<Row | null | undefined>(undefined);
  const [view, setView] = useState<"calendar" | "tracks">("calendar");
  const [page, setPage] = useState(0);
  const [booked, setBooked] = useState<DateTime | null>(null);
  // the series the dialog holds now, so a late free-time answer for another one is dropped
  const held = useRef<number | null>(null);
  const phone = useBreakpoint(XS);
  const viewer: string = viewerZone();

  // A season with the tools off, or a series the backend will not answer for, shows no hours
  const readFreeTime = async (seriesId: number) => {
    const found = await fetchWrapper.get(`${backendUrl}/player-series/${seriesId}/free-time`).catch(() => null);
    if (held.current === seriesId) setFreeTime(found ?? null);
  };

  useImperativeHandle(ref, () => ({
    open: (item: Row) => {
      setErrorMessage(null);
      held.current = item.id;
      setSeries({
        row: item,
        id: item.id,
        ...(item.date_time ? pickerParts(item.date_time, viewer) : { date: null, time: "" }),
      });
      setFreeTime(undefined);
      setBooked(null);
      setPage(0);
      // the calendar reads best on a desktop, one day track a row at 390 px
      setView(phone ? "tracks" : "calendar");
      setShow(true);
      readFreeTime(item.id);
    },
  }));

  const row: Row = series.row ?? {};
  // the instant the date and time name, read on the viewer's clock
  const chosen = series.date instanceof Date && series.time ? pickedInstant(series.date, series.time, viewer) : null;
  const pickedAt = chosen ? chosen.toMillis() : null;
  // ponytail: a pick holds "HH:mm", so a repeated hour on a clock-change day resolves to the first one; store the instant if that matters
  const setPick = (at: DateTime) => {
    const local = at.setZone(viewer);
    setSeries((was) => ({ ...was, date: local.toJSDate(), time: local.toFormat("HH:mm") }));
  };

  const blocked: Span[] = freeTime ? spansOf(freeTime.ranges ?? [], freeTime.start, freeTime.end) : [];
  // One entry a day of the window, each with its half-hour cells; both views draw these
  const grid = (freeTime ? daysOf(freeTime.start, freeTime.end, viewer) : []).map((day) => {
    const cells = cellsOf(day, blocked);
    // the tab stop of a day is its picked cell, or its first cell inside the window
    const picked = cells.findIndex((cell) => cell.at.toMillis() === pickedAt);
    return { day, cells, first: picked >= 0 && !cells[picked].outside ? picked : cells.findIndex((cell) => !cell.outside) };
  });
  const rows = grid.reduce((most, one) => Math.max(most, one.cells.length), 0);
  const inBlocked = isBlocked(chosen, blocked);
  // The calendar draws one page of days, so its columns stay inside the dialog at every width
  const perPage = phone ? PAGE_DAYS.phone : PAGE_DAYS.wide;
  const pages = Math.max(1, Math.ceil(grid.length / perPage));
  const atPage = Math.min(page, pages - 1);
  const shown = grid.slice(atPage * perPage, atPage * perPage + perPage);

  // One row a side, the viewer's own side first; a captain or an admin reads them in play order
  const sides: Row[] = [row.player1 ?? {}, row.player2 ?? {}];
  const players = (row.player2_id === playerId ? [...sides].reverse() : sides)
    .map((player) => ({ player, zone: (player?.timezone as string) || null, you: !!playerId && player?.id === playerId }));

  // A round ends at midnight in the event's zone; the round cards read the same line from the same helper
  const endZone: string | null = row.match?.season?.round_end_zone || null;
  const windowEnd = freeTime ? DateTime.fromISO(freeTime.end, { zone: "UTC" }) : null;
  // An event with no zone of its own still ends the window on the viewer's clock
  const endLine: string = windowEnd ? roundEndLine(windowEnd, endZone ?? viewer, viewer) : "";
  const otherZone = players.find((one) => one.zone && one.zone !== viewer)?.zone ?? null;

  const cellTitle = (at: DateTime) => {
    const mine = `${at.setZone(viewer).toFormat("ccc d LLL, HH:mm")} ${viewer}`;
    const other = otherZone ? `, ${at.setZone(otherZone).toFormat("ccc d LLL, HH:mm")} ${otherZone}` : "";
    return `${mine}${other}${isBlocked(at, blocked) ? ", inside a blocked hour" : ""}`;
  };

  // Arrow keys stay inside one day, which the grid draws as one row or one column
  const moveFocus = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const step = event.key === "ArrowRight" || event.key === "ArrowDown" ? 1 : event.key === "ArrowLeft" || event.key === "ArrowUp" ? -1 : 0;
    if (!step) return;
    const cell = (event.target as HTMLElement).closest<HTMLButtonElement>("button[data-cell]");
    const at = cell?.dataset.cell?.split("|");
    if (!at) return;
    const next = event.currentTarget.querySelector<HTMLButtonElement>(`button[data-cell="${at[0]}|${Number(at[1]) + step}"]`);
    if (!next || next.disabled) return;
    event.preventDefault();
    next.focus();
  };

  // The pick is a start time, not a half hour, so it reads as a point on the track and never as a fill
  const startMark = (
    <span className="pointer-events-none absolute inset-x-0 top-1/2 h-0.5 -translate-y-1/2 bg-primary">
      <span className="absolute left-0 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-primary" />
    </span>
  );

  const cellButton = (day: Day, cell: Cell, index: number, first: number, size: string) => {
    const picked = pickedAt === cell.at.toMillis();
    return (
      <button
        key={`${day.key}|${index}`}
        type="button"
        data-cell={`${day.key}|${index}`}
        tabIndex={index === first ? 0 : -1}
        disabled={cell.outside}
        aria-label={cellTitle(cell.at)}
        aria-pressed={picked}
        title={cellTitle(cell.at)}
        className={cn(
          "relative border-0 p-0",
          size,
          cell.outside ? "bg-surface-light hatched" : cell.blocked ? "bg-surface-light" : "bg-success/25",
          !cell.outside && "hover:bg-primary/40 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none",
        )}
        onClick={() => setPick(cell.at)}
      >
        {picked ? startMark : null}
      </button>
    );
  };

  const legend = (
    <div className={cn("flex flex-wrap items-center gap-x-4 gap-y-1", CAPTION)}>
      <span className="inline-flex items-center gap-1.5"><i className={cn(SWATCH, "bg-success/25")} />Open for both</span>
      <span className="inline-flex items-center gap-1.5"><i className={cn(SWATCH, "bg-surface-light")} />One of you is blocked</span>
      <span className="inline-flex items-center gap-1.5">
        <i className="relative h-3 w-4"><span className="absolute inset-x-0 top-1/2 h-0.5 -translate-y-1/2 bg-primary" /><span className="absolute left-0 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-primary" /></i>
        Start time
      </span>
      <span className="inline-flex items-center gap-1.5"><i className={cn(SWATCH, "bg-surface-light hatched")} />Outside the round</span>
    </div>
  );

  // A track cell is a few pixels wide on a phone, so the picked day also lists its half hours
  const pickedDay = chosen ? chosen.setZone(viewer).toISODate() : null;
  const startChips = (day: Day, cells: Cell[]) => (
    <div className="flex flex-col gap-1 min-[600px]:ml-[7.75rem]">
      <span className={CAPTION}>
        Start time on {day.label} ({viewer})
      </span>
      <div className="flex flex-wrap gap-1">
        {cells
          .filter((cell) => !cell.outside)
          .map((cell) => (
            <Button
              key={cell.at.toMillis()}
              size="sm"
              variant={pickedAt === cell.at.toMillis() ? "default" : "outline"}
              // the picked chip never wears the faint blocked style, or the one chosen chip reads as the disabled one
              className={cn(cell.blocked && pickedAt !== cell.at.toMillis() && "opacity-60")}
              aria-label={cellTitle(cell.at)}
              aria-pressed={pickedAt === cell.at.toMillis()}
              title={cellTitle(cell.at)}
              onClick={() => setPick(cell.at)}
            >
              {cell.label}
            </Button>
          ))}
      </div>
    </div>
  );

  // One row a day, the hours across: the view a phone reads
  const tracks = (
    <div className="flex flex-col gap-2" onKeyDown={moveFocus}>
      {grid.map(({ day, cells, first }) => (
        <div key={day.key} className="flex flex-col gap-2">
          <div className="flex flex-col gap-1 min-[600px]:flex-row min-[600px]:items-center min-[600px]:gap-3">
            <span className={cn("w-[7rem] shrink-0 text-sm", day.today && "font-medium")}>{day.today ? "Today" : day.label}</span>
            <div className="grid grow gap-px" style={{ gridTemplateColumns: `repeat(${cells.length}, minmax(0, 1fr))` }}>
              {cells.map((cell, index) => cellButton(day, cell, index, first, "h-6"))}
            </div>
          </div>
          {day.key === pickedDay ? startChips(day, cells) : null}
        </div>
      ))}
      <div className={cn("flex justify-between min-[600px]:ml-[7.75rem]", CAPTION)}>
        <span>00:00</span>
        <span>12:00</span>
        <span>24:00</span>
      </div>
    </div>
  );

  // One column a day, the hours down, one page of days at a time: the view a desktop reads
  const calendar = (
    <div className="flex min-w-0 flex-col gap-1">
      {pages > 1 ? (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon-sm" aria-label="Earlier days" disabled={atPage === 0} onClick={() => setPage(atPage - 1)}>
            <Icon name="mdi-chevron-left" />
          </Button>
          <Button variant="ghost" size="icon-sm" aria-label="Later days" disabled={atPage >= pages - 1} onClick={() => setPage(atPage + 1)}>
            <Icon name="mdi-chevron-right" />
          </Button>
          <span className="text-sm font-medium">
            {shown[0]?.day.day.toFormat("d LLL")} to {shown[shown.length - 1]?.day.day.toFormat("d LLL")}
          </span>
        </div>
      ) : null}
      <div className="max-h-[420px] min-w-0 overflow-y-auto">
        <div className="grid gap-px" style={{ gridTemplateColumns: `2.75rem repeat(${shown.length}, minmax(0, 1fr))` }} onKeyDown={moveFocus}>
          <span className="sticky top-0 z-10 bg-surface" />
          {shown.map(({ day }) => (
            <span key={day.key} className={cn("sticky top-0 z-10 truncate bg-surface px-1 pb-1 text-center text-xs", day.today && "font-medium")}>
              {day.today ? "Today" : day.label}
            </span>
          ))}
          {/* one row a half hour, every row the same height; the gutter names the full hours of the page's first day */}
          {Array.from({ length: rows }, (_, index) => (
            <div key={index} className="contents">
              <span className={cn("h-3 whitespace-nowrap pr-1 text-right leading-3 tnum", CAPTION)}>{index % 2 ? "" : shown[0]?.cells[index]?.label}</span>
              {shown.map(({ day, cells, first }) =>
                cells[index] ? cellButton(day, cells[index], index, first, "h-3 w-full") : <span key={day.key} />,
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // The bottom section: one aligned row a player, flag first, the pick on his own clock
  const playerRow = ({ player, zone, you }: { player: Row; zone: string | null; you: boolean }) => {
    const clock = chosen && zone ? clockOf(chosen, zone, viewer) : null;
    return (
      <div key={player?.id ?? (you ? "you" : "them")} className="grid items-center gap-x-3 gap-y-0.5 min-[600px]:grid-cols-[minmax(0,1fr)_14rem_11rem]">
        <PlayerName player={player} plain>
          {you ? <span className={CAPTION}>you</span> : null}
        </PlayerName>
        <span className="text-sm">
          {zone ?? "No time zone set"}
          {clock ? <span className={cn("ml-2", CAPTION)}>{clock.gmt}</span> : null}
        </span>
        <span className="text-sm">
          {clock ? (
            <>
              <span className={cn(clock.differs && cn("rounded px-1", toneClass("warning")))}>{clock.date}</span>
              <span className="ml-2 font-medium">{clock.time}</span>
            </>
          ) : (
            <span className={CAPTION}>{zone ? "dd mmm, hh:mm" : ""}</span>
          )}
        </span>
      </div>
    );
  };

  // The booked point on each clock, the viewer's side first; a player with no zone reads none
  const bookedRows = booked
    ? players.filter((one) => one.zone).map((one) => ({ ...one, clock: clockOf(booked, one.zone as string, viewer) }))
    : [];

  const save = async () => {
    setSaving(true);
    try {
      // One route for every writer, an admin included, because it is the one that refreshes the bot's post of the series
      const formData = new FormData();
      formData.append("date_time", chosen!.toUTC().toFormat("yyyy-MM-dd HH:mm:ss"));
      formData.append("action", "scheduled");
      const url = `${backendUrl}/player-series/${series.id}`;
      const response = await fetch(url, { method: "PUT", headers: await authHeader("PUT", url), body: formData });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Update failed");
      }
      setBooked(chosen);
      onSaved?.("Schedule updated successfully!");
    } catch (error) {
      setErrorMessage((error as Error).message || "Error saving schedule.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={show} onOpenChange={setShow}>
      <DialogContent
        showCloseButton={false}
        className={cn("max-h-[90vh] gap-0 overflow-y-auto p-0", booked ? "max-w-[520px] md:max-w-[520px]" : "max-w-[1100px] md:max-w-[1100px]")}
      >
        <DialogTitle className="flex items-start gap-3 bg-primary px-4 py-3 text-on-primary">
          <Icon name="mdi-calendar-edit" className="mt-0.5" />
          <div className="min-w-0">
            <div>Schedule</div>
            <div className="text-sm font-normal">{contextOf(row, { playerId })}</div>
          </div>
        </DialogTitle>

        {booked ? (
          <>
            <div className={cn("m-4 flex items-start gap-2 rounded px-3 py-2", toneClass("success"))}>
              <Icon name="mdi-check-circle-outline" />
              <div>
                {bookedRows.map(({ player, zone, clock }, index) => (
                  <div key={player?.id ?? index} className={index ? CAPTION : "font-medium"}>
                    {index ? "" : "Booked for "}
                    {clock.date}, {clock.time} {zone}
                  </div>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2 p-4 pt-0">
              <Button variant="ghost" onClick={() => setShow(false)}>
                Later
              </Button>
              <Button nativeButton={false} render={<Link href={`/player-series/${series.id}/veto`} />}>
                <Icon name="mdi-map-outline" />
                Veto maps
              </Button>
            </div>
          </>
        ) : (
          <>
            {/* min-w-0 keeps the grid inside the dialog: without it a wide grid widens this column */}
            <div className="flex min-w-0 flex-col gap-3 p-4">
              <StatusAlert modelValue={errorMessage} onClose={() => setErrorMessage(null)} className="mb-0" />
              {freeTime === undefined ? (
                <div className={CAPTION} role="status">
                  Loading the open hours
                </div>
              ) : freeTime ? (
                <>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                    <span className="text-sm font-medium">{commonHours(freeTime.hours)}</span>
                    {endLine ? <span className={CAPTION}>{endLine}</span> : null}
                    <ToggleGroup
                      className="ml-auto"
                      variant="outline"
                      spacing={0}
                      aria-label="Schedule view"
                      value={[view]}
                      onValueChange={(value) => setView((value[0] as "calendar" | "tracks") ?? view)}
                    >
                      <ToggleGroupItem value="calendar">Calendar</ToggleGroupItem>
                      <ToggleGroupItem value="tracks">Day tracks</ToggleGroupItem>
                    </ToggleGroup>
                  </div>
                  {grid.length ? (view === "calendar" ? calendar : tracks) : <div className={CAPTION}>The round window has passed.</div>}
                  {legend}
                </>
              ) : (
                <div className={CAPTION}>The open hours did not load. Enter a date and time below.</div>
              )}

              {inBlocked ? (
                <div className={cn("flex items-start gap-2 rounded px-3 py-2 text-sm", toneClass("warning"))}>
                  <Icon name="mdi-alert-outline" />
                  <span>This time is inside a blocked hour. You can still book it when you both agree.</span>
                </div>
              ) : null}

              <form className="grid gap-3 md:grid-cols-2" onSubmit={(event) => event.preventDefault()}>
                <SimpleDatePicker modelValue={series.date} label="Date" onUpdateModelValue={(date) => setSeries((was) => ({ ...was, date }))} />
                <SimpleTimePicker modelValue={series.time} label={`Time (${viewer})`} onUpdateModelValue={(time) => setSeries((was) => ({ ...was, time }))} />
              </form>

              <div className="flex flex-col gap-1.5 border-t pt-3">{players.map(playerRow)}</div>
            </div>
            <div className="flex justify-end gap-2 p-4 pt-0">
              <Button variant="ghost" disabled={saving} onClick={() => setShow(false)}>
                Cancel
              </Button>
              <Button aria-busy={saving} disabled={!chosen || saving} onClick={save}>
                <Icon name={saving ? "mdi-loading mdi-spin" : "mdi-calendar-check"} />
                Book this time
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default ScheduleDialog;
