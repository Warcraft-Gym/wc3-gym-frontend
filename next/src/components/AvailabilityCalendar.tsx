"use client";
import { useState } from "react";
import { DateTime } from "luxon";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/Icon";
import { blockedSpans, clockCell, dayCells, sideSpans, windowDays, zoneColumns } from "@/helpers/schedule-grid.mjs";
import { viewerZone } from "@/helpers/timezone.mjs";
import { useBreakpoint, XS } from "@/hooks/breakpoint";
import { cn } from "@/lib/utils";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>;
type Span = { start: DateTime; end: DateTime };
type Cell = { at: DateTime; label: string; outside: boolean; blocked: boolean; sides: boolean[] };
type Day = { key: string; day: DateTime; label: string; today: boolean; first: DateTime; last: DateTime };
type Column = { zone: string; offset: number; label: string; gmt: string };

// The helpers are plain JS, so their defaults type the parameters; the seam names the real shapes.
const spansOf = blockedSpans as unknown as (free: Row[], start: string, end: string) => Span[];
const mineOf = sideSpans as unknown as (ranges: Row[], start: string, end: string) => Span[];
const daysOf = windowDays as unknown as (start: string, end: string, zone: string) => Day[];
const cellsOf = dayCells as unknown as (day: Day, blocked: Span[], sides: Span[][]) => Cell[];
const columnsOf = zoneColumns as unknown as (viewer: string, people: { name: string; zone: string | null }[], instant: string) => Column[];
const clockOf = clockCell as unknown as (point: DateTime, zone: string, viewer: string) => { time: string; shift: string };

export type CalendarPlayer = { name: string; zone: string | null; entered: boolean };

const CAPTION = "text-xs text-muted-foreground";
const SWATCH = "inline-block h-3 w-4 rounded-sm";
// The days one page holds, so the grid never widens its card; the pager walks the rest
const PAGE_DAYS = { phone: 3, wide: 7 };

/** When two players can meet across a round, read only: a column per day and a row per half hour, a
 *  time column per clock the two players and the reader live on, green where both are free, and each
 *  player's blocked hours in his own half of a cell and his own colour. */
export function AvailabilityCalendar({ freeTime, players }: { freeTime: Row; players: [CalendarPlayer, CalendarPlayer] }) {
  const phone = useBreakpoint(XS);
  const [page, setPage] = useState(0);
  const viewer: string = viewerZone();

  const blocked = spansOf(freeTime.ranges ?? [], freeTime.start, freeTime.end);
  const lanes = [mineOf(freeTime.blocked1 ?? [], freeTime.start, freeTime.end), mineOf(freeTime.blocked2 ?? [], freeTime.start, freeTime.end)];
  const columns = columnsOf(viewer, players, freeTime.start);
  const grid = daysOf(freeTime.start, freeTime.end, viewer).map((day) => ({ day, cells: cellsOf(day, blocked, lanes) }));

  const perPage = phone ? PAGE_DAYS.phone : PAGE_DAYS.wide;
  const pages = Math.max(1, Math.ceil(grid.length / perPage));
  const atPage = Math.min(page, pages - 1);
  const shown = grid.slice(atPage * perPage, atPage * perPage + perPage);
  const rows = shown.reduce((most, one) => Math.max(most, one.cells.length), 0);

  const whose = (cell: Cell) => {
    if (cell.outside) return "outside the round";
    const [a, b] = cell.sides;
    if (a && b) return "both blocked";
    if (a) return `${players[0].name} blocked`;
    if (b) return `${players[1].name} blocked`;
    return cell.blocked ? "blocked" : "free for both";
  };
  const titleOf = (day: Day, cell: Cell) => {
    const clocks = columns.map((column) => {
      const clock = clockOf(cell.at, column.zone, viewer);
      return `${column.label} ${clock.time}${clock.shift ? ` (${clock.shift})` : ""}`;
    });
    return `${day.label}: ${clocks.join(" · ")}, ${whose(cell)}`;
  };

  if (!grid.length) return <div className={CAPTION}>The round window has passed.</div>;

  const missing = players.filter((one) => !one.entered);
  const legendOf = (one: CalendarPlayer) => (one.entered ? `${one.name} blocked` : `${one.name} entered none`);

  return (
    <div className="flex min-w-0 flex-col gap-2">
      {missing.length === 1 ? (
        <div className="flex items-center gap-2 text-sm text-warning">
          <Icon name="mdi-calendar-remove" size={16} />
          {missing[0].name} entered no availability, so only {players.find((one) => one.entered)?.name}&apos;s blocked hours show.
        </div>
      ) : null}
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
      <div
        role="img"
        aria-label={`${players[0].name} and ${players[1].name}: ${Math.round(freeTime.hours ?? 0)} hours free for both in this round`}
        className="grid max-w-[1060px] gap-px"
        style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(3.5rem, auto)) repeat(${shown.length}, minmax(0, 1fr))` }}
      >
        {columns.map((column) => (
          <span key={`zone-${column.offset}`} className="flex flex-col justify-end pr-1 pb-1 text-right text-[11px] leading-tight">
            <span className="truncate font-medium">{column.label}</span>
            <span className="text-muted-foreground">{column.gmt}</span>
          </span>
        ))}
        {shown.map(({ day }) => (
          <span key={day.key} className={cn("truncate px-1 pb-1 text-center text-xs self-end", day.today && "font-medium")}>
            {day.today ? "Today" : day.label}
          </span>
        ))}
        {/* one row a half hour; each time column names the full hours of the page's first day on its own clock */}
        {Array.from({ length: rows }, (_, index) => {
          const point = shown[0]?.cells[index]?.at;
          return (
            <div key={index} className="contents">
              {columns.map((column) => {
                const clock = point && index % 2 === 0 ? clockOf(point, column.zone, viewer) : null;
                return (
                  <span key={column.offset} className={cn("h-2 overflow-visible whitespace-nowrap pr-1 text-right text-[10px] leading-3 tnum text-muted-foreground")}>
                    {clock ? (
                      <>
                        {clock.time}
                        {clock.shift ? <span className="ml-0.5 text-[9px] text-warning">{clock.shift}</span> : null}
                      </>
                    ) : null}
                  </span>
                );
              })}
              {shown.map(({ day, cells }) => {
                const cell = cells[index];
                if (!cell) return <span key={day.key} />;
                return (
                  <span
                    key={day.key}
                    title={titleOf(day, cell)}
                    className={cn("relative h-2", cell.outside ? "bg-surface-light hatched" : cell.blocked ? "bg-surface-light" : "bg-success/25")}
                  >
                    {!cell.outside && cell.sides[0] ? <span className="absolute inset-y-0 left-0 w-1/2 bg-side-1" /> : null}
                    {!cell.outside && cell.sides[1] ? <span className="absolute inset-y-0 right-0 w-1/2 bg-side-2" /> : null}
                  </span>
                );
              })}
            </div>
          );
        })}
      </div>
      <div className={cn("flex flex-wrap items-center gap-x-4 gap-y-1", CAPTION)}>
        <span className="inline-flex items-center gap-1.5"><i className={cn(SWATCH, "bg-success/25")} />Free for both</span>
        <span className="inline-flex items-center gap-1.5"><i className={cn(SWATCH, "bg-[linear-gradient(90deg,var(--color-side-1)_50%,var(--color-surface-light)_50%)]")} />{legendOf(players[0])}</span>
        <span className="inline-flex items-center gap-1.5"><i className={cn(SWATCH, "bg-[linear-gradient(90deg,var(--color-surface-light)_50%,var(--color-side-2)_50%)]")} />{legendOf(players[1])}</span>
        <span className="inline-flex items-center gap-1.5"><i className={cn(SWATCH, "bg-[linear-gradient(90deg,var(--color-side-1)_50%,var(--color-side-2)_50%)]")} />Both blocked</span>
        <span className="inline-flex items-center gap-1.5"><i className={cn(SWATCH, "bg-surface-light hatched")} />Outside the round</span>
        <span>Hover an hour for everyone&apos;s time</span>
      </div>
    </div>
  );
}

export default AvailabilityCalendar;
