"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DataTable } from "@/components/ui/DataTable";
import { Icon } from "@/components/ui/Icon";
import { TapTooltip } from "@/components/ui/TapTooltip";
import { TeamName } from "@/components/TeamName";
import { cn } from "@/lib/utils";
import { PairTimeDialog, type Loaded } from "./PairTimeDialog";
import { PlayerBlock } from "./PlayerBlock";
import type { SortOrder } from "./SortChips";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>;

/** A column title with the priority the sort chips give it. */
function Head({ label, sortKey, order }: { label: React.ReactNode; sortKey: string; order: SortOrder }) {
  const index = order.findIndex((one) => one.key === sortKey);
  return (
    <span className={cn("inline-flex items-center gap-1.5", index >= 0 && "text-primary-text")}>
      {label}
      {index >= 0 ? <span className="inline-grid size-4 place-items-center rounded-full bg-primary text-[10px] text-on-primary tnum">{index + 1}</span> : null}
    </span>
  );
}

// a control inside a row keeps its click to itself, so the row under it is not selected
const stop = (event: React.SyntheticEvent) => event.stopPropagation();

/** The possible matchups in the order of the sort chips: each player's block, the series each has
 *  played this season, the MMR difference and the time the two share. A click on a row selects it.
 *  A row whose player already holds a match this round wears a tint, and the player's note names the
 *  match. The calendar button opens when the two can play; a name opens the player's stats. */
export function MatchupTable({
  rows,
  picks,
  order,
  team1,
  team2,
  maxPlayed,
  narrow,
  busy,
  selected,
  onToggle,
  changeLabel,
  onChange,
  noteOf,
  marked,
  onPlayer,
  loadFreeTime,
  empty,
}: {
  rows: Row[];
  picks: Set<string>;
  order: SortOrder;
  team1: Row;
  team2: Row;
  maxPlayed: [number, number];
  narrow: boolean;
  busy: boolean;
  selected: (row: Row) => boolean;
  onToggle: (row: Row) => void;
  /** The label of the direct write while a draft pairing changes its opponent; null otherwise. */
  changeLabel: ((row: Row) => string) | null;
  onChange: (row: Row) => void;
  noteOf?: (player: Row, row: Row) => string | null;
  marked?: (row: Row) => boolean;
  onPlayer: (player: Row, opponent: Row, row: Row) => void;
  loadFreeTime: (row: Row) => Promise<Row>;
  empty: string;
}) {
  const [loaded, setLoaded] = useState<Record<string, Loaded>>({});
  const [timeRow, setTimeRow] = useState<Row | null>(null);

  // One read per pair while the page is open; a pair where nobody entered anything reads nothing
  const load = async (row: Row, again = false) => {
    if (row.neitherEntered) return;
    if (!again && (loaded[row.key]?.state === "ok" || loaded[row.key]?.state === "loading")) return;
    setLoaded((was) => ({ ...was, [row.key]: { state: "loading" } }));
    try {
      const data = await loadFreeTime(row);
      setLoaded((was) => ({ ...was, [row.key]: { state: "ok", data } }));
    } catch (error: any) {
      setLoaded((was) => ({ ...was, [row.key]: { state: "error", message: error?.error || error?.message || String(error) } }));
    }
  };
  const openTime = (row: Row) => {
    setTimeRow(row);
    load(row);
  };
  const changing = !!changeLabel;

  return (
    <>
      <DataTable
        data={rows}
        rowId={(row: Row) => row.key}
        mobileStack={narrow}
        empty={empty}
        onRowClick={changing ? undefined : onToggle}
        rowClassName={(row: Row) => (!changing && selected(row) ? "bg-primary/10" : marked?.(row) ? "bg-info/8" : undefined)}
        columns={[
          ...(changing
            ? []
            : [
                {
                  id: "select",
                  header: () => <span className="sr-only">Select</span>,
                  meta: { label: "Selected" },
                  enableSorting: false,
                  cell: ({ row }: { row: { original: Row } }) => (
                    <span className="inline-flex" onClick={stop}>
                      <Checkbox
                        checked={selected(row.original)}
                        disabled={busy}
                        aria-label={`Select ${row.original.a.name} vs ${row.original.b.name}`}
                        onCheckedChange={() => onToggle(row.original)}
                      />
                    </span>
                  ),
                },
              ]),
          // the star column stands only while the sort names top picks
          ...(picks.size
            ? [
                {
                  id: "top",
                  header: () => <span className="sr-only">Top pick</span>,
                  meta: { label: "Top pick" },
                  enableSorting: false,
                  cell: ({ row }: { row: { original: Row } }) =>
                    picks.has(row.original.key) ? (
                      <span className="inline-flex" onClick={stop}>
                        <TapTooltip content="A top pick of your sort">
                          <Icon name="mdi-star" className="text-primary-text" />
                          <span className="sr-only">Top pick</span>
                        </TapTooltip>
                      </span>
                    ) : null,
                },
              ]
            : []),
          {
            id: "team1",
            header: () => <Head label={<TeamName team={team1} plain />} sortKey="mmr1" order={order} />,
            meta: { label: team1?.name ?? "Team 1" },
            enableSorting: false,
            cell: ({ row }: { row: { original: Row } }) => (
              <PlayerBlock
                player={row.original.a}
                opponent={row.original.b}
                faced={row.original.facedA}
                note={noteOf?.(row.original.a, row.original)}
                onPlayer={() => onPlayer(row.original.a, row.original.b, row.original)}
              />
            ),
          },
          {
            id: "team2",
            header: () => <Head label={<TeamName team={team2} plain />} sortKey="mmr2" order={order} />,
            meta: { label: team2?.name ?? "Team 2" },
            enableSorting: false,
            cell: ({ row }: { row: { original: Row } }) => (
              <PlayerBlock
                player={row.original.b}
                opponent={row.original.a}
                faced={row.original.facedB}
                note={noteOf?.(row.original.b, row.original)}
                onPlayer={() => onPlayer(row.original.b, row.original.a, row.original)}
              />
            ),
          },
          {
            id: "games",
            header: () => <Head label="Series played" sortKey="games" order={order} />,
            meta: { label: "Series played" },
            enableSorting: false,
            cell: ({ row }: { row: { original: Row } }) => {
              const { a, b } = row.original;
              const low = (player: Row, most: number) => (player.played < most ? "font-medium text-primary-text" : "");
              return (
                <span className="block text-right tnum" title={`Series this season: ${a.name} ${a.played}, ${b.name} ${b.played}`}>
                  <span className={low(a, maxPlayed[0])}>{a.played}</span> · <span className={low(b, maxPlayed[1])}>{b.played}</span>
                </span>
              );
            },
          },
          {
            id: "mmr",
            header: () => <Head label="MMR difference" sortKey="mmr" order={order} />,
            meta: { label: "MMR difference" },
            enableSorting: false,
            cell: ({ row }: { row: { original: Row } }) => (
              <span className="flex flex-col items-end tnum">
                {Number.isFinite(row.original.difference) ? row.original.difference : "—"}
                {row.original.outside ? <span className="text-xs text-warning">outside the range</span> : null}
              </span>
            ),
          },
          {
            id: "time",
            header: () => <Head label="Time" sortKey="time" order={order} />,
            meta: { label: "Time" },
            enableSorting: false,
            cell: ({ row }: { row: { original: Row } }) => {
              const one = row.original;
              return (
                <span className="flex items-center gap-2" onClick={stop}>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className={one.neitherEntered ? "text-muted-foreground" : "text-primary-text"}
                    aria-label={`When can ${one.a.name} and ${one.b.name} play?`}
                    title="When can they play?"
                    onClick={() => openTime(one)}
                  >
                    <Icon name={one.neitherEntered ? "mdi-calendar-remove" : "mdi-calendar-clock"} />
                  </Button>
                  <span className="flex flex-col items-start gap-0.5">
                    {one.hoursKnown ? (
                      <span className="tnum" title="Hours both are free in this round">
                        {Math.round(one.hours)} h
                      </span>
                    ) : null}
                    {one.tzWarn ? (
                      <TapTooltip content="Players 8 h or more apart rarely find a time to play">
                        <span className="inline-flex items-center gap-1 text-xs text-warning tnum">
                          <Icon name="mdi-alert" size={14} />
                          {one.tzGap} h apart
                        </span>
                      </TapTooltip>
                    ) : null}
                  </span>
                </span>
              );
            },
          },
          ...(changing
            ? [
                {
                  id: "change",
                  header: () => <span className="sr-only">Change</span>,
                  meta: { label: "" },
                  enableSorting: false,
                  cell: ({ row }: { row: { original: Row } }) => (
                    <span className="flex justify-end" onClick={stop}>
                      <Button variant="outline" size="sm" className="text-primary-text" disabled={busy} onClick={() => onChange(row.original)}>
                        <Icon name="mdi-swap-horizontal" />
                        {changeLabel!(row.original)}
                      </Button>
                    </span>
                  ),
                },
              ]
            : []),
        ]}
      />
      <PairTimeDialog
        row={timeRow}
        free={timeRow ? loaded[timeRow.key] : undefined}
        onClose={() => setTimeRow(null)}
        onRetry={() => (timeRow ? load(timeRow, true) : undefined)}
      />
    </>
  );
}

export default MatchupTable;
