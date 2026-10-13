"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/Icon";
import { PlayerName } from "@/components/PlayerName";
import { StatusAlert } from "@/components/StatusAlert";
import { TeamName } from "@/components/TeamName";
import { divisionGroups, inSeedOrder, movedOrder, seedBody } from "@/helpers/cup-divisions.mjs";
import { entrantMmr } from "@/helpers/entrants.mjs";
import { useEventStore } from "@/stores";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>;
type Group = { id: number | null; title: string | null; rows: Row[] };

const groupsOf = divisionGroups as (entrants: Row[], divisions: Row[], uses: boolean) => Group[];
const ordered = inSeedOrder as (rows: Row[]) => Row[];
const moved = movedOrder as (rows: Row[], id: number, step: number) => number[];
const bodyOf = seedBody as (source: string, divisionId: number | null, order?: number[]) => Row;

/** The seeds of a cup's first stage, beside its draw: the players in seed order, a reshuffle by
 *  MMR or at random, a move up or down, and a pin that keeps a seed through a reshuffle. A cup with
 *  divisions seeds each division on its own. Once the stage is drawn the seeds are locked and the
 *  panel only reads them; undoing the draw opens them again. */
export function CupSeedsPanel({ event, stage, entrants, drawn, onEntrants }: { event: Row; stage: Row; entrants: Row[]; drawn: boolean; onEntrants: (rows: Row[]) => void }) {
  const store = useEventStore();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const divided = !!event.uses_divisions;
  // a player in no division is seeded once the Participants tab places it
  const groups = groupsOf(entrants, event.divisions || [], divided).filter((group) => !divided || group.id != null);

  // A write answers the rows it seeded; every other row keeps its seed
  const merge = (answered: Row[]) => {
    const byId = new Map(answered.map((row) => [row.id, row]));
    onEntrants(entrants.map((row) => byId.get(row.id) ?? row));
  };
  const run = async (key: string, work: () => Promise<void>) => {
    setBusy(key);
    setError(null);
    try {
      await work();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  };
  const reseed = (group: Group, source: string, order?: number[]) =>
    run(`${group.id}-${source}`, async () => merge(await store.setSeeds(event.id, stage.id, bodyOf(source, group.id, order))));
  const step = (group: Group, rows: Row[], row: Row, by: number) => reseed(group, "manual", moved(rows, row.id, by));
  const pin = (row: Row) =>
    run(`pin-${row.id}`, async () => {
      const answered = await store.pinEntrant(event.id, row.id, { seed_pinned: !row.seed_pinned });
      onEntrants(entrants.map((old) => (old.id === answered.id ? answered : old)));
    });

  return (
    <aside className="card rounded-lg p-3 shadow-sm" aria-label="Seeds">
      <div className="mb-2 flex items-center gap-2">
        <h3 className="m-0">Seeds</h3>
        {drawn ? <span className="text-xs text-muted-foreground">Locked by the draw</span> : null}
      </div>
      <StatusAlert modelValue={error} onClose={() => setError(null)} />
      {groups.map((group) => {
        const rows = ordered(group.rows);
        return (
          <div key={group.id ?? "field"} className="mb-3">
            {group.title ? <div className="mb-1 font-bold">{group.title}</div> : null}
            {!drawn && rows.length > 1 ? (
              <div className="mb-1 flex flex-wrap gap-1">
                <Button size="sm" variant="outline" disabled={!!busy} onClick={() => reseed(group, "mmr")}>
                  <Icon name="mdi-sort-numeric-descending" />
                  By MMR
                </Button>
                <Button size="sm" variant="outline" disabled={!!busy} onClick={() => reseed(group, "random")}>
                  <Icon name="mdi-shuffle-variant" />
                  Shuffle
                </Button>
              </div>
            ) : null}
            <ol className="flex flex-col gap-0.5">
              {rows.map((row, index) => (
                <li key={row.id} className="flex items-center gap-1 text-sm">
                  <span className="tnum w-6 text-right text-muted-foreground">{row.seed ?? "–"}</span>
                  <span className="min-w-0 flex-1 truncate">{row.team ? <TeamName team={row.team} /> : <PlayerName player={row.user} race={row.race || undefined} plain />}</span>
                  <span className="tnum text-xs text-muted-foreground">{(entrantMmr(row) as number) || ""}</span>
                  {drawn ? null : (
                    <>
                      <Button variant="ghost" size="icon-sm" aria-label={`Move ${row.user?.name ?? row.team?.name ?? "player"} up`} disabled={!!busy || index === 0} onClick={() => step(group, rows, row, -1)}>
                        <Icon name="mdi-chevron-up" />
                      </Button>
                      <Button variant="ghost" size="icon-sm" aria-label={`Move ${row.user?.name ?? row.team?.name ?? "player"} down`} disabled={!!busy || index === rows.length - 1} onClick={() => step(group, rows, row, 1)}>
                        <Icon name="mdi-chevron-down" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-pressed={!!row.seed_pinned}
                        aria-label={row.seed_pinned ? "Let a reshuffle move this seed" : "Keep this seed through a reshuffle"}
                        disabled={!!busy || row.seed == null}
                        onClick={() => pin(row)}
                      >
                        <Icon name={row.seed_pinned ? "mdi-pin" : "mdi-pin-outline"} />
                      </Button>
                    </>
                  )}
                </li>
              ))}
            </ol>
          </div>
        );
      })}
      {!drawn ? <p className="m-0 text-xs text-muted-foreground">The draw seeds any player still without a seed by MMR, after the ones above.</p> : null}
    </aside>
  );
}

export default CupSeedsPanel;
