"use client";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/Icon";
import { Pick } from "@/components/ui/Pick";
import { toneClass } from "@/components/ui/tone";
import { DivisionBracketing } from "@/components/DivisionBracketing";
import { PlayerName } from "@/components/PlayerName";
import { RowActions, type RowAction } from "@/components/RowActions";
import { StatusAlert } from "@/components/StatusAlert";
import { CupTeamName } from "@/components/CupTeamName";
import { useCupStats } from "@/components/CupPlayerStats";
import { W3CMmr } from "@/components/W3CMmr";
import { bandRange, cutChanged, divisionGroups, previewDivisions } from "@/helpers/cup-divisions.mjs";
import { bandOf, domainOf, quantileCuts } from "@/helpers/divisions.mjs";
import { bandNames, bandsPayload, cutsOf, entrantMmr, entrantName } from "@/helpers/entrants.mjs";
import { useEventStore } from "@/stores";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>;
type Group = { id: number | null; title: string | null; rows: Row[] };

// One division takes every player, for a cup with too few sign-ups to split
const COUNTS = [1, 2, 3, 4, 5].map((value) => ({ value, title: String(value) }));
// One bronze step per band, light to dark: a division is a band of amounts, not a category
const RAMP = ["heat-1", "heat-2", "heat-3", "heat-4", "heat-5"];
const groupsOf = divisionGroups as (entrants: Row[], divisions: Row[], uses: boolean) => Group[];
const cutsOf_ = cutsOf as (divisions: Row[]) => number[];
const bandNames_ = bandNames as (divisions: Row[]) => string[];
const mmrOf = (row: Row) => (entrantMmr(row) as number) || 0;
type Band = { band: number; title: string; low: number | null; high: number | null; rows: Row[] };
const previewOf = previewDivisions as (entrants: Row[], cuts: number[], names: string[], divisions: Row[]) => Band[];
const rangeOf = bandRange as (band: Band) => string;

/** The divisions of a cup that splits its players: the cut by MMR on a strip, then every player
 *  listed in its division with a move to another one. While the count or a threshold differs from
 *  the saved divisions, the cards preview the cut as saving would place the players, each one that
 *  moves marked with where it stands today; nothing is written until "Save and place the players".
 *  A move pins the player, so reassigning the saved cut leaves it where the runner put it. Once the
 *  cup is drawn the divisions stay, and the panel only reads. */
export function CupDivisionsPanel({ event, entrants, drawn, onEvent, onEntrants }: { event: Row; entrants: Row[]; drawn: boolean; onEvent: (event: Row) => void; onEntrants: (rows: Row[]) => void }) {
  const store = useEventStore();
  const openStats = useCupStats();
  const divisions: Row[] = event.divisions || [];
  const live = entrants.filter((row) => !row.withdrawn_at && !row.waitlisted_at);
  const [count, setCount] = useState(divisions.length || 2);
  const [cuts, setCuts] = useState<number[]>(() => (divisions.length ? cutsOf_(divisions) : (quantileCuts(live.map(mmrOf).filter(Boolean), 2) as number[])));
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  const stored = bandNames_(divisions);
  const names = stored.length === count ? stored : Array.from({ length: count }, (unused, index) => `Division ${count - index}`);
  const colors = Array.from({ length: count }, (unused, index) => RAMP[Math.round((index * (RAMP.length - 1)) / Math.max(1, count - 1))]);
  const rated = live.map(mmrOf).filter(Boolean);
  const strip = live.map((row) => ({
    id: row.id,
    who: row.user?.id ?? row.team?.id ?? row.id,
    label: entrantName(row) as string,
    mmr: mmrOf(row),
    band: mmrOf(row) > 0 ? (bandOf(mmrOf(row), cuts) as number) : null,
    pinned: !!row.division_pinned,
  }));
  const groups = groupsOf(entrants, divisions, true);
  // the strip differs from what is saved: the cards follow it live until it is saved
  const changed = !drawn && cutChanged(cuts, divisions);
  const preview = changed ? previewOf(entrants, cuts, names, divisions) : [];
  const moving = preview.reduce((total, band) => total + band.rows.filter((row) => row.from).length, 0);
  const backToSaved = () => {
    setCount(divisions.length);
    setCuts(cutsOf_(divisions));
  };

  const run = async (key: string, work: () => Promise<void>, message?: string) => {
    setBusy(key);
    setError(null);
    setSaved(null);
    try {
      await work();
      if (message) setSaved(message);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  };
  const readEntrants = async () => onEntrants(await store.fetchEntrants(event.id, true));
  const evenSplit = (to = count) => setCuts(quantileCuts(rated, to) as number[]);
  const pickCount = (to: number | null) => {
    if (!to) return;
    setCount(to);
    if (cuts.length !== to - 1) evenSplit(to);
  };
  // The cut is saved and the players are placed in one go, so a runner never sees empty divisions
  const save = () =>
    run(
      "save",
      async () => {
        await store.setDivisions(event.id, bandsPayload(cuts, names));
        onEvent(await store.assignDivisions(event.id));
        await readEntrants();
      },
      `${count} ${count === 1 ? "division" : "divisions"} saved and the players placed by MMR.`,
    );
  const moveTo = (row: Row, division: Row) =>
    run("move", async () => {
      const moved = await store.placeEntrant(event.id, row.id, { division_id: division.id, manual_placement: true });
      onEntrants(entrants.map((old) => (old.id === moved.id ? moved : old)));
      onEvent(await store.fetchEvent(event.id, true));
    });
  const unpin = (row: Row) =>
    run("pin", async () => {
      const answered = await store.pinEntrant(event.id, row.id, { division_pinned: false });
      onEntrants(entrants.map((old) => (old.id === answered.id ? answered : old)));
    });

  const actionsFor = (row: Row): RowAction[] =>
    drawn
      ? []
      : ([
          ...divisions
            .filter((division) => division.id !== row.division_id)
            .map((division) => ({ icon: "mdi-arrow-right-bold-box-outline", label: `Move to ${division.name}`, onClick: () => moveTo(row, division) })),
          row.division_pinned && { icon: "mdi-pin-off", label: "Let the MMR place this player", onClick: () => unpin(row) },
        ].filter(Boolean) as RowAction[]);

  return (
    <section className="card mb-4 rounded-lg p-4 shadow-sm" aria-label="Divisions">
      <h3 className="mb-2">Divisions</h3>
      <StatusAlert modelValue={error} onClose={() => setError(null)} />
      <StatusAlert modelValue={saved} type="success" onClose={() => setSaved(null)} />
      {drawn ? (
        <p className="mb-3 text-sm text-muted-foreground">The cup is drawn, so its divisions stay as they are. Undo the draw to cut them again.</p>
      ) : (
        <>
          <div className="mb-2 flex flex-wrap items-end gap-2">
            <span className="self-center text-muted-foreground">
              Cut the players by <W3CMmr />
            </span>
            <span className="flex-1" />
            <Pick labelAfter className="w-[130px]" label="Divisions" items={COUNTS} value={count} onChange={pickCount} />
            <Button variant="outline" disabled={!rated.length || count === 1} onClick={() => evenSplit()}>
              <Icon name="mdi-scale-balance" />
              Even split
            </Button>
            <Button disabled={busy === "save" || !live.length} onClick={save}>
              <Icon name={busy === "save" ? "mdi-loading mdi-spin" : "mdi-content-save"} />
              Save and place the players
            </Button>
          </div>
          <DivisionBracketing cuts={cuts} onUpdateCuts={setCuts} players={strip} names={names} colors={colors} domain={domainOf(rated) as number[]} stored={cutsOf_(divisions)} />
        </>
      )}
      {changed ? (
        <>
          <div className="mt-4 flex flex-wrap items-center gap-2 rounded-lg border border-dashed border-primary/60 px-3 py-2 text-sm">
            <Icon name="mdi-eye-outline" className="text-primary-text" />
            <span className="min-w-0 flex-1">
              {divisions.length
                ? `Preview of the new cut: ${moving} ${moving === 1 ? "player changes" : "players change"} division. Nothing is saved yet.`
                : "Preview of the cut. Nothing is saved yet."}
            </span>
            {divisions.length ? (
              <Button size="sm" variant="ghost" onClick={backToSaved}>
                <Icon name="mdi-undo-variant" />
                Back to the saved cut
              </Button>
            ) : null}
          </div>
          <div className="mt-3 grid gap-3 min-[700px]:grid-cols-2 min-[1200px]:grid-cols-3">
            {preview.map((band) => (
              <div key={band.band} className="rounded border border-dashed p-3">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className="font-bold">{band.title}</span>
                  <Badge className={toneClass(null)}>{band.rows.length}</Badge>
                  <span className="text-xs text-muted-foreground">MMR {rangeOf(band)}</span>
                </div>
                {band.rows.length ? (
                  <ul className="flex flex-col gap-1">
                    {band.rows.map((row) => (
                      <li key={row.id} className="flex items-center gap-2">
                        <span className="min-w-0 flex-1 truncate">{row.team ? <CupTeamName team={row.team} /> : <PlayerName player={row.user} race={row.race || undefined} plain onClick={openStats ? () => openStats(row) : undefined} />}</span>
                        {row.from ? (
                          <Badge className={toneClass("info")}>
                            <Icon name="mdi-arrow-right" />
                            from {row.from}
                          </Badge>
                        ) : null}
                        <span className="tnum text-sm text-muted-foreground">{mmrOf(row) || "–"}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">Nobody falls in this division.</p>
                )}
              </div>
            ))}
          </div>
        </>
      ) : divisions.length ? (
        <div className="mt-4 grid gap-3 min-[700px]:grid-cols-2 min-[1200px]:grid-cols-3">
          {groups.map((group) => (
            <div key={group.id ?? "none"} className="rounded border p-3">
              <div className="mb-2 flex items-center gap-2">
                <span className={group.id == null ? "font-bold text-error" : "font-bold"}>{group.title}</span>
                <Badge className={toneClass(null)}>{group.rows.length}</Badge>
              </div>
              <ul className="flex flex-col gap-1">
                {group.rows.map((row) => (
                  <li key={row.id} className="flex items-center gap-2">
                    <span className="min-w-0 flex-1 truncate">{row.team ? <CupTeamName team={row.team} /> : <PlayerName player={row.user} race={row.race || undefined} plain onClick={openStats ? () => openStats(row) : undefined} />}</span>
                    {row.division_pinned ? <Icon name="mdi-pin" className="text-muted-foreground" aria-label="Placed by hand" /> : null}
                    <span className="tnum text-sm text-muted-foreground">{mmrOf(row) || "–"}</span>
                    <RowActions actions={actionsFor(row)} menu />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">No divisions yet. Set the cut and save it to place the players.</p>
      )}
    </section>
  );
}

export default CupDivisionsPanel;
