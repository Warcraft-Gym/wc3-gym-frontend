"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Icon } from "@/components/ui/Icon";
import { Input } from "@/components/ui/input";
import { PlayerName } from "@/components/PlayerName";
import { StatusAlert } from "@/components/StatusAlert";
import { TeamName } from "@/components/TeamName";
import { divisionGroups, inSeedOrder, movedOrder, placedOrder, seedBody } from "@/helpers/cup-divisions.mjs";
import { entrantMmr } from "@/helpers/entrants.mjs";
import { useEventStore } from "@/stores";
import { cn } from "@/lib/utils";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>;
type Group = { id: number | null; title: string | null; rows: Row[] };

const groupsOf = divisionGroups as (entrants: Row[], divisions: Row[], uses: boolean) => Group[];
const ordered = inSeedOrder as (rows: Row[]) => Row[];
const moved = movedOrder as (rows: Row[], id: number, step: number) => number[];
const placed = placedOrder as (rows: Row[], id: number, place: number) => number[] | null;
const bodyOf = seedBody as (source: string, divisionId: number | null, order?: number[]) => Row;

/** The seeds of a cup's first stage, beside its draw: the players in seed order, a reshuffle by
 *  MMR or at random, a player dragged to a place or given a seed number, a move up or down, and a
 *  pin that keeps a seed through a reshuffle. A cup with
 *  divisions seeds each division on its own. After the draw every change draws the bracket again
 *  from the new seeds in the same write (`onRedrawn` reads the draw back); while its series hold
 *  results the change asks first, because the redraw deletes them. A finished cup or round only
 *  reads its seeds. */
export function CupSeedsPanel({
  event,
  stage,
  entrants,
  drawn,
  editable = true,
  onEntrants,
  onRedrawn,
}: {
  event: Row;
  stage: Row;
  entrants: Row[];
  drawn: boolean;
  editable?: boolean;
  onEntrants: (rows: Row[]) => void;
  onRedrawn?: () => Promise<void>;
}) {
  const store = useEventStore();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // the change that waits for its confirm: what it writes, and the backend's question
  const [asking, setAsking] = useState<{ key: string; group: Group; body: Row; question: string } | null>(null);
  // the row being dragged, and the row it hovers over; a drop stays inside its own division
  const [dragging, setDragging] = useState<{ group: number | null; id: number } | null>(null);
  const [over, setOver] = useState<number | null>(null);
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
  // before the draw a seed write is all; after it the same write draws the bracket again
  const write = async (body: Row, confirm = false) => {
    if (!drawn) return merge(await store.setSeeds(event.id, stage.id, body));
    merge(await store.redrawSeeds(event.id, stage.id, body, confirm));
    await onRedrawn?.();
  };
  const reseed = (group: Group, source: string, order?: number[]) => {
    const key = `${group.id}-${source}`;
    const body = bodyOf(source, group.id, order);
    return run(key, async () => {
      try {
        await write(body);
      } catch (e) {
        const message = (e as Error).message || "";
        // results stand in the draw: ask before the redraw deletes them
        if (drawn && message.includes("confirm")) return setAsking({ key, group, body, question: message });
        throw e;
      }
    });
  };
  const confirmRedraw = () => {
    const pending = asking!;
    setAsking(null);
    return run(pending.key, () => write(pending.body, true));
  };
  const step = (group: Group, rows: Row[], row: Row, by: number) => reseed(group, "manual", moved(rows, row.id, by));
  // a drop or a typed seed moves the player straight to that place; its own place writes nothing
  const place = (group: Group, rows: Row[], id: number, to: number) => {
    const order = placed(rows, id, to);
    if (order) reseed(group, "manual", order);
  };
  const drop = (group: Group, rows: Row[], index: number) => {
    if (dragging && dragging.group === group.id) place(group, rows, dragging.id, index + 1);
    setDragging(null);
    setOver(null);
  };
  const pin = (row: Row) =>
    run(`pin-${row.id}`, async () => {
      const answered = await store.pinEntrant(event.id, row.id, { seed_pinned: !row.seed_pinned });
      onEntrants(entrants.map((old) => (old.id === answered.id ? answered : old)));
    });

  return (
    <aside className="card rounded-lg p-3 shadow-sm" aria-label="Seeds">
      <div className="mb-2 flex items-center gap-2">
        <h3 className="m-0">Seeds</h3>
        {drawn ? <span className="text-xs text-muted-foreground">{editable ? "A change draws the bracket again" : "Locked by the draw"}</span> : null}
      </div>
      <StatusAlert modelValue={error} onClose={() => setError(null)} />
      {groups.map((group) => {
        const rows = ordered(group.rows);
        return (
          <div key={group.id ?? "field"} className="mb-3">
            {group.title ? <div className="mb-1 font-bold">{group.title}</div> : null}
            {editable && rows.length > 1 ? (
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
                <li
                  key={row.id}
                  className={cn(
                    "flex items-center gap-1 rounded text-sm",
                    dragging?.id === row.id && "opacity-50",
                    over === row.id && dragging && dragging.id !== row.id && "bg-primary/15",
                  )}
                  draggable={editable && !busy}
                  onDragStart={() => setDragging({ group: group.id, id: row.id })}
                  onDragEnd={() => {
                    setDragging(null);
                    setOver(null);
                  }}
                  onDragOver={(e) => {
                    if (dragging?.group !== group.id) return;
                    e.preventDefault();
                    setOver(row.id);
                  }}
                  onDrop={() => drop(group, rows, index)}
                >
                  {editable ? (
                    <>
                      <Icon name="mdi-drag-vertical" size={16} className="cursor-grab text-muted-foreground" />
                      <Input
                        // the box reads the seed again whenever it is not being typed into
                        ref={(el) => {
                          if (el && document.activeElement !== el) el.value = String(index + 1);
                        }}
                        type="number"
                        min="1"
                        max={rows.length}
                        disabled={!!busy}
                        className="tnum h-7 w-12 px-1 text-right"
                        aria-label={`Seed of ${row.user?.name ?? row.team?.name ?? "player"}`}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") e.currentTarget.blur();
                          if (e.key === "Escape") {
                            e.currentTarget.value = String(index + 1);
                            e.currentTarget.blur();
                          }
                        }}
                        onBlur={(e) => {
                          const to = Number(e.target.value);
                          e.target.value = String(index + 1);
                          if (e.target.value !== String(to)) place(group, rows, row.id, to);
                        }}
                      />
                    </>
                  ) : (
                    <span className="tnum w-6 text-right text-muted-foreground">{row.seed ?? "–"}</span>
                  )}
                  <span className="min-w-0 flex-1 truncate">{row.team ? <TeamName team={row.team} /> : <PlayerName player={row.user} race={row.race || undefined} plain />}</span>
                  <span className="tnum text-xs text-muted-foreground">{(entrantMmr(row) as number) || ""}</span>
                  {!editable ? null : (
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
      {editable ? <p className="m-0 mb-1 text-xs text-muted-foreground">Drag a player to a new place, or type the seed and press Enter.</p> : null}
      {!drawn ? <p className="m-0 text-xs text-muted-foreground">The draw seeds any player still without a seed by MMR, after the ones above.</p> : null}
      <Dialog open={!!asking} onOpenChange={(open) => !open && setAsking(null)}>
        <DialogContent size="confirm" className="gap-0 p-0">
          <DialogTitle className="banner bg-banner px-4 py-3 text-primary">Draw the bracket again?</DialogTitle>
          <div className="flex flex-col gap-3 p-4">
            <p>
              {(asking?.question.match(/^\d+/)?.[0] ?? "Some")} series already have a result. The new seeds draw the bracket again, and those results are deleted.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setAsking(null)}>
                Keep the draw
              </Button>
              <Button className="bg-error text-white" onClick={confirmRedraw}>
                Delete the results and redraw
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </aside>
  );
}

export default CupSeedsPanel;
