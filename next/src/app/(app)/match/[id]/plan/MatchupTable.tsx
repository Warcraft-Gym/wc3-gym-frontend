"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DataTable } from "@/components/ui/DataTable";
import { Icon } from "@/components/ui/Icon";
import { TapTooltip } from "@/components/ui/TapTooltip";
import { TeamName } from "@/components/TeamName";
import { sortLabel, sortsUp } from "@/helpers/planner.mjs";
import { cn } from "@/lib/utils";
import { PairTimeDialog, type Loaded } from "./PairTimeDialog";
import { PlayerBlock } from "./PlayerBlock";

export type SortKey = "games" | "mmr" | "time" | "mmr1" | "mmr2";
export type SortOrder = { key: SortKey; dir: 1 | -1 }[];

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>;

/** A column title that sorts the list: a click joins the sort, a second turns it round, a third takes
 *  it out. While it sorts, an arrow says which way and the number its place in the sort. */
function SortHead({
  label,
  name,
  sortKey,
  order,
  teams,
  onSort,
}: {
  label: React.ReactNode;
  name: string;
  sortKey: SortKey;
  order: SortOrder;
  teams: { team1: string; team2: string };
  onSort: (key: SortKey) => void;
}) {
  const index = order.findIndex((one) => one.key === sortKey);
  const one = order[index];
  const state = one ? `sort ${index + 1}, ${sortLabel(sortKey, one.dir, teams)}` : "not sorted";
  const action = !one ? "sort by it" : one.dir === 1 ? "turn the sort round" : "stop sorting by it";
  return (
    <button
      type="button"
      className={cn("inline-flex items-center gap-1 rounded font-medium hover:text-primary-text", one && "text-primary-text")}
      aria-label={`${name}: ${state}. Click to ${action}`}
      onClick={(event) => {
        event.stopPropagation();
        onSort(sortKey);
      }}
    >
      {label}
      {one ? (
        <span className="inline-flex items-center" aria-hidden="true">
          <Icon name={sortsUp(sortKey, one.dir) ? "mdi-arrow-up" : "mdi-arrow-down"} size={14} />
          <span className="text-[10px] tnum">{index + 1}</span>
        </span>
      ) : (
        <Icon name="mdi-swap-vertical" size={14} className="opacity-30" />
      )}
    </button>
  );
}

// a control inside a row keeps its click to itself, so the row under it is not selected
const stop = (event: React.SyntheticEvent) => event.stopPropagation();

/** The possible matchups in the order the column titles set: each player's block, the series each has
 *  played this season, the MMR difference and the time the two share. A click on a row selects it.
 *  A row whose player already holds a match this round wears a tint, and the player's note names the
 *  match. The calendar button opens when the two can play; a name opens the player's stats. */
export function MatchupTable({
  rows,
  picks,
  order,
  onSort,
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
  onSort: (key: SortKey) => void;
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
  const teams = { team1: team1?.name ?? "Team 1", team2: team2?.name ?? "Team 2" };
  const head = (key: SortKey, name: string, label: React.ReactNode = name) => (
    <SortHead label={label} name={name} sortKey={key} order={order} teams={teams} onSort={onSort} />
  );
  // the phone hides the column titles, so the same sort sits in a row above the cards
  const columnsToSort: { key: SortKey; name: string }[] = [
    { key: "mmr1", name: `${teams.team1} MMR` },
    { key: "mmr2", name: `${teams.team2} MMR` },
    { key: "games", name: "Series played" },
    { key: "mmr", name: "MMR difference" },
    { key: "time", name: "Time" },
  ];

  return (
    <>
      {narrow ? (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 pb-2 text-sm" role="group" aria-label="Sort the matchups">
          <span className="text-muted-foreground">Sort</span>
          {columnsToSort.map((one) => (
            <span key={one.key}>{head(one.key, one.name)}</span>
          ))}
        </div>
      ) : null}
      <DataTable
        data={rows}
        rowId={(row: Row) => row.key}
        mobileStack={narrow}
        empty={empty}
        onRowClick={changing ? undefined : onToggle}
        // a bar on the left edge and a tint mark the row: primary when selected, info when a player already holds a match;
        // a stacked row is a block, so the bar runs down the whole card there
        rowClassName={(row: Row) =>
          !changing && selected(row)
            ? "bg-primary/12 [&>td:first-child]:shadow-[inset_4px_0_0_var(--color-primary)] [.table-stack_&]:shadow-[inset_4px_0_0_var(--color-primary)] [&>td]:py-1.5"
            : marked?.(row)
              ? "bg-info/15 [&>td:first-child]:shadow-[inset_4px_0_0_var(--color-info)] [.table-stack_&]:shadow-[inset_4px_0_0_var(--color-info)] [&>td]:py-1.5"
              : "[&>td]:py-1.5"
        }
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
            header: () => head("mmr1", `${teams.team1} MMR`, <TeamName team={team1} plain />),
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
            header: () => head("mmr2", `${teams.team2} MMR`, <TeamName team={team2} plain />),
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
            header: () => head("games", "Series played"),
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
            header: () => head("mmr", "MMR difference"),
            meta: { label: "MMR difference" },
            enableSorting: false,
            cell: ({ row }: { row: { original: Row } }) => (
              <span className="flex items-center justify-end gap-1.5 tnum">
                {row.original.outside ? (
                  <TapTooltip content="Outside the MMR range">
                    <span className="inline-flex items-center gap-0.5 text-xs text-warning">
                      <Icon name="mdi-alert" size={13} />
                      outside
                    </span>
                  </TapTooltip>
                ) : null}
                {Number.isFinite(row.original.difference) ? row.original.difference : "—"}
              </span>
            ),
          },
          {
            id: "time",
            header: () => head("time", "Time"),
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
                  <span className="flex items-center gap-2">
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
