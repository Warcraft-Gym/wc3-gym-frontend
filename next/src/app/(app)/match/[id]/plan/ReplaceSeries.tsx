"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/Icon";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { PlayerName } from "@/components/PlayerName";
import { matchupRows, sortMatchups } from "@/helpers/planner.mjs";
import { cn } from "@/lib/utils";
import { InfoTip, Notice } from "./InfoTip";
import { MatchupTable, type SortKey, type SortOrder } from "./MatchupTable";
import { PlayerFocus } from "./PlayerFocus";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>;
type Out = "player1" | "player2" | "both";

const PRESETS = [100, 150, 200, 300];
const ANY = "any";

/** A new match for one published series that holds no result: who leaves it, one player or both, the
 *  MMR range to weigh, and the matchups that fit, at first only those of the player who stays. When
 *  none of them is good, the captain takes the filter away and picks any matchup. Each pick becomes a
 *  draft that proposes a replacement of the series; the captains publish one with "Publish and
 *  replace", and the other proposals leave the draft with the series. */
export function ReplaceSeries({
  series,
  proposals,
  team1,
  team2,
  team1Id,
  side1,
  side2,
  byId,
  nameOf,
  startRange,
  order,
  onSort,
  taken,
  pairOf,
  at,
  maxPlayed,
  narrow,
  busy,
  noteOf,
  marked,
  onPlayer,
  loadFreeTime,
  onSubmit,
  onCancel,
}: {
  series: Row;
  /** The drafts that already propose a replacement of this series. */
  proposals: Row[];
  team1: Row;
  team2: Row;
  team1Id: number;
  side1: Row[];
  side2: Row[];
  byId: Map<number, Row>;
  nameOf: (id: number) => string;
  startRange: number;
  order: SortOrder;
  onSort: (key: SortKey) => void;
  taken: Set<string>;
  pairOf: (player1Id: number, player2Id: number) => any;
  at: string | null;
  maxPlayed: [number, number];
  narrow: boolean;
  busy: boolean;
  noteOf: (player: Row, row: Row) => string | null;
  marked: (row: Row) => boolean;
  onPlayer: (player: Row, opponent: Row, row: Row) => void;
  loadFreeTime: (row: Row) => Promise<Row>;
  onSubmit: (pairs: { player1_id: number; player2_id: number }[]) => Promise<boolean>;
  onCancel: () => void;
}) {
  const [out, setOut] = useState<Out | null>(null);
  const [range, setRange] = useState<number | null>(startRange || PRESETS[0]);
  // the players whose opponents the list shows: the one who stays, until the captain takes the filter away
  const [keep, setKeep] = useState<number[]>([]);
  // the matchups the captain proposes as replacements, kept whatever the filter or the range shows
  const [chosen, setChosen] = useState<Record<string, Row>>({});

  const p1 = series.player1_id as number;
  const p2 = series.player2_id as number;
  const choose = (next: Out) => {
    setOut(next);
    setKeep(next === "both" ? [] : [next === "player1" ? p2 : p1]);
    setChosen({});
  };

  const gone = out === "both" ? [p1, p2] : out === "player1" ? [p1] : out === "player2" ? [p2] : [];
  const stays = (list: Row[]) => list.filter((player) => !gone.includes(player.user_id));
  const s1 = stays(side1);
  const s2 = stays(side2);
  const focus = keep.map((id) => byId.get(id)).filter((player): player is Row => !!player);
  // the range holds for every row here, the filter on the player who stays too
  const rows = out
    ? sortMatchups(matchupRows({ side1: s1, side2: s2, team1Id, range: range ?? Infinity, focus, pairOf, at, taken }), order).filter((row: Row) => !row.outside)
    : [];
  const picked: Row[] = Object.values(chosen);
  const presets = [...new Set([...PRESETS, startRange].filter(Boolean))].sort((x, y) => x - y);
  const focusTeams = [
    { name: team1?.name ?? "Team 1", players: s1 },
    { name: team2?.name ?? "Team 2", players: s2 },
  ];

  const submit = async () => {
    if (!picked.length) return;
    if (await onSubmit(picked.map((row: Row) => ({ player1_id: row.a.user_id, player2_id: row.b.user_id })))) onCancel();
  };

  return (
    <div className={cn("flex flex-col gap-3", picked.length > 0 && "pb-20")}>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <h3 className="text-base font-medium">Find a replacement</h3>
        <InfoTip label="Find a replacement">
          Choose who leaves the series and the MMR range. The list starts on the matchups of the player who stays; take the filter away to weigh any matchup inside the range.
          Click the rows to propose as replacements, one or several. Each becomes a draft that proposes to replace this series; once the captains agree, &quot;Publish and replace&quot; on one publishes it, removes the old series, and drops the other proposals.
        </InfoTip>
        <span className="grow" />
        <Button variant="outline" size="sm" onClick={onCancel}>
          <Icon name="mdi-arrow-left" />
          Back to the plan
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
        <span className="text-muted-foreground">Replacing</span>
        <PlayerName player={byId.get(p1) ?? series.player1} race={series.player1?.signup_race ?? byId.get(p1)?.race} mmr={byId.get(p1)?.mmr ?? null} />
        <span className="text-muted-foreground">vs</span>
        <PlayerName player={byId.get(p2) ?? series.player2} race={series.player2?.signup_race ?? byId.get(p2)?.race} mmr={byId.get(p2)?.mmr ?? null} />
      </div>
      {proposals.length ? (
        <Notice>
          Proposed already: {proposals.map((one) => `${nameOf(one.player1_id)} vs ${nameOf(one.player2_id)}`).join(", ")}. New picks join them in the draft.
        </Notice>
      ) : null}

      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
        <span className="inline-flex flex-wrap items-center gap-2 text-sm font-medium">
          Who is replaced
          <ToggleGroup variant="outline" spacing={0} aria-label="Who is replaced" value={out ? [out] : []} onValueChange={(value) => (value[0] ? choose(value[0] as Out) : undefined)}>
            <ToggleGroupItem value="player1">{nameOf(p1)}</ToggleGroupItem>
            <ToggleGroupItem value="player2">{nameOf(p2)}</ToggleGroupItem>
            <ToggleGroupItem value="both">Both</ToggleGroupItem>
          </ToggleGroup>
        </span>
        <span className="inline-flex flex-wrap items-center gap-2 text-sm font-medium">
          MMR range
          <ToggleGroup
            variant="outline"
            spacing={0}
            aria-label="MMR range"
            value={[range == null ? ANY : String(range)]}
            onValueChange={(value) => {
              if (!value[0]) return;
              setRange(value[0] === ANY ? null : Number(value[0]));
            }}
          >
            {presets.map((one) => (
              <ToggleGroupItem key={one} value={String(one)} className="tnum">
                {one}
              </ToggleGroupItem>
            ))}
            <ToggleGroupItem value={ANY}>Any</ToggleGroupItem>
          </ToggleGroup>
        </span>
      </div>

      {out ? (
        <>
          <PlayerFocus teams={focusTeams} selected={keep} disabled={busy} onChange={setKeep} />
          <div className="-mx-4">
            <MatchupTable
              rows={rows}
              picks={new Set<string>()}
              order={order}
              onSort={onSort}
              team1={team1}
              team2={team2}
              maxPlayed={maxPlayed}
              narrow={narrow}
              busy={busy}
              selected={(row) => !!chosen[row.key]}
              onToggle={(row) =>
                setChosen((was) => {
                  const next = { ...was };
                  if (next[row.key]) delete next[row.key];
                  else next[row.key] = row;
                  return next;
                })
              }
              changeLabel={null}
              onChange={() => undefined}
              noteOf={noteOf}
              marked={marked}
              onPlayer={onPlayer}
              loadFreeTime={loadFreeTime}
              empty={
                focus.length
                  ? `No opponent of ${focus.map((player) => player.name).join(", ")} inside ${range == null ? "any range" : `${range} MMR`}. Widen the range, or take the filter away for any matchup.`
                  : `No matchup inside ${range == null ? "any range" : `${range} MMR`}. Widen the range.`
              }
            />
          </div>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">Choose who is replaced to see the matchups.</p>
      )}

      {picked.length ? (
        <div
          role="region"
          aria-label="The replacement"
          className={cn(
            "fixed inset-x-0 z-30 flex flex-wrap items-center gap-3 border-t border-border bg-surface px-4 py-2 shadow-lg",
            narrow ? "bottom-[calc(3.5rem+env(safe-area-inset-bottom))]" : "bottom-0",
          )}
        >
          <span className="grow text-sm">
            Replace <strong>{nameOf(p1)} vs {nameOf(p2)}</strong> with{" "}
            {picked.map((row: Row, index: number) => (
              <span key={row.key}>
                {index ? (index === picked.length - 1 ? " or " : ", ") : ""}
                <strong>
                  {row.a.name} vs {row.b.name}
                </strong>
              </span>
            ))}
          </span>
          <Button disabled={busy} onClick={submit}>
            <Icon name="mdi-swap-horizontal" />
            {picked.length === 1 ? "Draft the replacement" : `Draft ${picked.length} proposals`}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

export default ReplaceSeries;
