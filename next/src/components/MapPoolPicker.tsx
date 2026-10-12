"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/Combobox";
import { Icon } from "@/components/ui/Icon";
import { Pick } from "@/components/ui/Pick";
import { useEventStore, useMapStore } from "@/stores";
import { forMode, modesLine } from "@/helpers/map-modes.mjs";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>;
export type PoolMap = { id: number; name: string; shortname?: string | null };

const asPoolMap = (row: Row): PoolMap => ({ id: row.id, name: row.name, shortname: row.shortname ?? null });

/** A cup's map pool, in the order the veto board lists it. It fills from the current 1v1 ladder
 *  pool, from the pool of an earlier cup, or one map at a time, and each map leaves on its own
 *  row. A ladder map the app does not hold yet is named, since only an admin adds a map. */
export function MapPoolPicker({
  pool,
  onChange,
  problem,
  excludeEventId,
  ladderMode = "1v1",
  mode = "1v1",
}: {
  pool: PoolMap[];
  onChange: (pool: PoolMap[]) => void;
  problem?: string | null;
  excludeEventId?: number | null;
  // the W3Champions ladder a cup of this size reads its pool from; none hides the button
  ladderMode?: string | null;
  // the mode the cup is played as; its maps lead the "Add a map" list
  mode?: string;
}) {
  const mapStore = useMapStore();
  const eventStore = useEventStore();
  const [maps, setMaps] = useState<Row[]>([]);
  const [cups, setCups] = useState<Row[]>([]);
  const [copyFrom, setCopyFrom] = useState<number | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const [all, own, open] = await Promise.all([
        mapStore.fetchMaps().catch(() => []),
        eventStore.myOrganizedEvents().catch(() => []),
        eventStore.fetchEvents(null, "cup").catch(() => []),
      ]);
      setMaps(all);
      // the cups this reader runs lead, then every other cup, each once
      const seen = new Set<number>();
      setCups([...own, ...open].filter((row: Row) => row.kind === "cup" && row.id !== excludeEventId && !seen.has(row.id) && seen.add(row.id)));
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const inPool = new Set(pool.map((row) => row.id));
  const add = (rows: PoolMap[]) => onChange([...pool, ...rows.filter((row) => !inPool.has(row.id))]);

  // The whole ladder pool: the ladder maps the app lacks are imported first, then every one joins
  const useLadder = async () => {
    setBusy("ladder");
    setNote(null);
    try {
      const mode = ladderMode || "1v1";
      let rows: Row[] = await mapStore.fetchLadderMapImport(mode);
      const lacking = rows.filter((row) => row.status !== "off_ladder" && row.map_id == null).map((row) => row.w3c_name);
      let all = maps;
      if (lacking.length) {
        await mapStore.importLadderMaps(lacking, mode);
        [rows, all] = await Promise.all([mapStore.fetchLadderMapImport(mode), mapStore.fetchMaps(true)]);
        setMaps(all);
      }
      const ladder = rows.filter((row) => row.status !== "off_ladder");
      const known = ladder.filter((row) => row.map_id != null);
      const byId = new Map(all.map((row: Row) => [row.id, row]));
      add(known.map((row) => asPoolMap(byId.get(row.map_id) ?? { id: row.map_id, name: row.matched_name || row.w3c_name, shortname: row.shortname })));
      const missing = ladder.filter((row) => row.map_id == null).map((row) => row.w3c_name);
      setNote(missing.length ? `These ladder maps could not be added: ${missing.join(", ")}.` : `${known.length} ladder maps added.`);
    } catch (e) {
      setNote(`The ladder pool did not load: ${(e as Error).message}`);
    } finally {
      setBusy(null);
    }
  };

  const copy = async () => {
    if (copyFrom == null) return;
    setBusy("copy");
    setNote(null);
    try {
      const event = await eventStore.fetchEvent(copyFrom);
      onChange((event.maps || []).map(asPoolMap));
      if (!(event.maps || []).length) setNote("That cup has no maps yet.");
    } catch (e) {
      setNote(`That cup did not load: ${(e as Error).message}`);
    } finally {
      setBusy(null);
    }
  };

  const move = (index: number, by: number) => {
    const rows = [...pool];
    const [row] = rows.splice(index, 1);
    rows.splice(index + by, 0, row);
    onChange(rows);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-2">
        {ladderMode ? (
          <Button variant="outline" disabled={busy === "ladder"} onClick={useLadder}>
            <Icon name={busy === "ladder" ? "mdi-loading mdi-spin" : "mdi-ladder"} />
            Use the {ladderMode} ladder pool
          </Button>
        ) : null}
        <div className="flex min-w-[260px] flex-[1_1_260px] items-end gap-2">
          <Pick
            className="flex-1"
            label="Copy from a cup"
            items={cups.map((row) => ({ value: row.id as number, title: row.name as string }))}
            value={copyFrom}
            onChange={setCopyFrom}
          />
          <Button variant="outline" disabled={copyFrom == null || busy === "copy"} onClick={copy}>
            {busy === "copy" ? <Icon name="mdi-loading mdi-spin" /> : <Icon name="mdi-content-copy" />}
            Copy
          </Button>
        </div>
      </div>

      <div className="max-w-[420px]">
        <Combobox
          label="Add a map"
          placeholder="Search the maps"
          items={forMode(
            maps.filter((row) => !inPool.has(row.id)),
            mode,
          ).map((row: Row) => ({ value: String(row.id), title: row.name as string, modes: modesLine(row.modes) }))}
          row={(item) => (
            <span className="flex flex-col text-left">
              <span>{item.title}</span>
              <span className="text-xs text-muted-foreground">{item.modes}</span>
            </span>
          )}
          value={null}
          onChange={(value) => {
            const row = maps.find((one) => String(one.id) === value);
            if (row) add([asPoolMap(row)]);
          }}
        />
      </div>

      {note ? <p className="text-sm text-muted-foreground">{note}</p> : null}

      <div>
        <div className="mb-1 flex items-baseline gap-2">
          <span className="font-medium">The pool</span>
          <span className="tnum text-sm text-muted-foreground">
            {pool.length} {pool.length === 1 ? "map" : "maps"}
          </span>
          {pool.length ? (
            <Button variant="ghost" size="sm" className="ml-auto text-error" onClick={() => onChange([])}>
              Clear
            </Button>
          ) : null}
        </div>
        <ol className="flex flex-col">
          {pool.map((row, index) => (
            <li key={row.id} className="flex min-h-10 items-center gap-2 border-t border-border">
              <span className="tnum w-6 text-right text-sm text-muted-foreground">{index + 1}</span>
              <span className="min-w-0 flex-1 truncate">{row.name}</span>
              <Button variant="ghost" size="icon-sm" aria-label={`Move ${row.name} up`} disabled={!index} onClick={() => move(index, -1)}>
                <Icon name="mdi-chevron-up" />
              </Button>
              <Button variant="ghost" size="icon-sm" aria-label={`Move ${row.name} down`} disabled={index === pool.length - 1} onClick={() => move(index, 1)}>
                <Icon name="mdi-chevron-down" />
              </Button>
              <Button variant="ghost" size="icon-sm" aria-label={`Remove ${row.name}`} onClick={() => onChange(pool.filter((one) => one.id !== row.id))}>
                <Icon name="mdi-close" />
              </Button>
            </li>
          ))}
          {!pool.length ? <li className="border-t border-border py-2 text-sm text-muted-foreground">No maps yet.</li> : null}
        </ol>
        {problem ? <p className="mt-2 text-sm text-warning">{problem}</p> : null}
        <p className="mt-2 text-sm text-muted-foreground">
          The players veto from this pool: they ban in turn until as many maps are left as the match has games, then each picks the maps for the games they may lose. Game 1 is played on the
          map left over.
        </p>
      </div>
    </div>
  );
}

export default MapPoolPicker;
