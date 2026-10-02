"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/DataTable";
import { Icon } from "@/components/ui/Icon";
import { TapTooltip } from "@/components/ui/TapTooltip";
import { AvailabilityCalendar } from "@/components/AvailabilityCalendar";
import { HeadToHeadCell } from "@/components/HeadToHeadCell";
import { TeamName } from "@/components/TeamName";
import { record } from "@/helpers/figures.mjs";
import { cn } from "@/lib/utils";
import { PlayerBlock } from "./PlayerBlock";
import type { SortOrder } from "./SortChips";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>;
type Loaded = { state: "loading" } | { state: "ok"; data: Row } | { state: "error"; message: string };

/** A column title with the priority the sort chips give it. */
function Head({ label, sortKey, order }: { label: string; sortKey?: string; order: SortOrder }) {
  const index = sortKey ? order.findIndex((one) => one.key === sortKey) : -1;
  return (
    <span className={cn("inline-flex items-center gap-1.5", index >= 0 && "text-primary-text")}>
      {label}
      {index >= 0 ? <span className="inline-grid size-4 place-items-center rounded-full bg-primary text-[10px] text-on-primary tnum">{index + 1}</span> : null}
    </span>
  );
}

/** The last ten counted ladder games, newest first, as marks with their record beside them. */
function Form({ player }: { player: Row }) {
  const games = String(player.form || "").split("").filter((one) => one === "W" || one === "L");
  if (!games.length) return <span className="text-muted-foreground">No ladder games in the event window</span>;
  const wins = games.filter((one) => one === "W").length;
  return (
    <span className="inline-flex items-center gap-2" aria-label={`${player.name}: last ${games.length} ladder games, newest first, ${wins} won and ${games.length - wins} lost`}>
      <span className="w-20 truncate">{player.name}</span>
      <span className="inline-flex gap-0.5" aria-hidden="true">
        {games.map((one, index) => (
          <span key={index} className={cn("size-3 rounded-sm", one === "W" ? "bg-win" : "bg-loss")} />
        ))}
      </span>
      <span className="tnum text-muted-foreground">{record(wins, games.length - wins)}</span>
    </span>
  );
}

/** The possible matchups in the order of the sort chips: each player's block, the series each has
 *  played this season, the MMR difference and the time the two share. A row opens when the two can
 *  play, with each player's blocked hours, their recent form and their head to head. */
export function MatchupTable({
  rows,
  picks,
  order,
  team1,
  team2,
  maxPlayed,
  narrow,
  busy,
  addLabel,
  addDisabled,
  onAdd,
  loadFreeTime,
  onMeetings,
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
  addLabel: (row: Row) => string;
  addDisabled: boolean;
  onAdd: (row: Row) => void;
  loadFreeTime: (row: Row) => Promise<Row>;
  onMeetings: (userA: number, userB: number) => Promise<Row[]>;
  empty: string;
}) {
  const [loaded, setLoaded] = useState<Record<string, Loaded>>({});

  // One read per pair while the page is open; a pair where nobody entered anything reads nothing
  const load = async (row: Row) => {
    if (row.neitherEntered || loaded[row.key]?.state === "ok" || loaded[row.key]?.state === "loading") return;
    setLoaded((was) => ({ ...was, [row.key]: { state: "loading" } }));
    try {
      const data = await loadFreeTime(row);
      setLoaded((was) => ({ ...was, [row.key]: { state: "ok", data } }));
    } catch (error: any) {
      setLoaded((was) => ({ ...was, [row.key]: { state: "error", message: error?.error || error?.message || String(error) } }));
    }
  };

  const detail = (row: Row) => {
    const free = loaded[row.key];
    return (
      <div className="grid gap-4 py-2 min-[1280px]:grid-cols-[minmax(0,1fr)_18rem]">
        <section className="flex min-w-0 flex-col gap-2">
          <h4 className="text-sm font-medium">
            When can {row.a.name} and {row.b.name} play?
            {row.hoursKnown ? <span className="ml-2 font-normal text-muted-foreground tnum">{Math.round(row.hours)} h free for both in this round</span> : null}
          </h4>
          {row.neitherEntered ? (
            <p className="text-sm text-muted-foreground">Neither player entered availability, so every hour counts as free.</p>
          ) : !free || free.state === "loading" ? (
            <p role="status" className="text-sm text-muted-foreground">Loading the blocked hours</p>
          ) : free.state === "error" ? (
            <p className="text-sm text-error">
              The blocked hours did not load: {free.message}{" "}
              <Button variant="link" size="sm" onClick={() => { setLoaded((was) => { const next = { ...was }; delete next[row.key]; return next; }); load(row); }}>
                Try again
              </Button>
            </p>
          ) : (
            <AvailabilityCalendar
              freeTime={free.data}
              players={[
                { name: row.a.name, zone: row.a.timezone, entered: !!row.a.availability_entered },
                { name: row.b.name, zone: row.b.timezone, entered: !!row.b.availability_entered },
              ]}
            />
          )}
        </section>
        <section className="flex flex-col gap-3 text-sm">
          <div className="flex flex-col gap-1">
            <span className="text-muted-foreground">Last 10 ladder games, newest first</span>
            <Form player={row.a} />
            <Form player={row.b} />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-muted-foreground">Head to head in series</span>
            <HeadToHeadCell pair={row.pair ?? undefined} onMeetings={() => onMeetings(row.a.user_id, row.b.user_id)} />
          </div>
        </section>
      </div>
    );
  };

  return (
    <DataTable
      data={rows}
      rowId={(row: Row) => row.key}
      mobileStack={narrow}
      empty={empty}
      expand={detail}
      expandLabel="Show when they can play, their form and their head to head"
      onExpand={load}
      columns={[
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
                    <TapTooltip content="A top pick of your sort">
                      <Icon name="mdi-star" className="text-primary-text" />
                      <span className="sr-only">Top pick</span>
                    </TapTooltip>
                  ) : null,
              },
            ]
          : []),
        {
          id: "team1",
          header: () => <TeamName team={team1} plain />,
          meta: { label: team1?.name ?? "Team 1" },
          enableSorting: false,
          cell: ({ row }: { row: { original: Row } }) => <PlayerBlock player={row.original.a} opponent={row.original.b} faced={row.original.facedA} />,
        },
        {
          id: "team2",
          header: () => <TeamName team={team2} plain />,
          meta: { label: team2?.name ?? "Team 2" },
          enableSorting: false,
          cell: ({ row }: { row: { original: Row } }) => <PlayerBlock player={row.original.b} opponent={row.original.a} faced={row.original.facedB} />,
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
                {one.neitherEntered ? (
                  <TapTooltip content="Neither player entered availability">
                    <Icon name="mdi-calendar-remove" size={16} className="text-muted-foreground" />
                    <span className="sr-only">Neither player entered availability</span>
                  </TapTooltip>
                ) : null}
              </span>
            );
          },
        },
        {
          id: "add",
          header: () => <span className="sr-only">Add</span>,
          meta: { label: "" },
          enableSorting: false,
          cell: ({ row }: { row: { original: Row } }) => (
            <span className="flex justify-end">
              <Button
                variant="outline"
                size="sm"
                className="text-primary-text"
                disabled={busy || addDisabled}
                onClick={(event) => {
                  event.stopPropagation();
                  onAdd(row.original);
                }}
              >
                <Icon name="mdi-plus" />
                {addLabel(row.original)}
              </Button>
            </span>
          ),
        },
      ]}
    />
  );
}

export default MatchupTable;
