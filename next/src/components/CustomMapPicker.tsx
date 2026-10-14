"use client";
import { useEffect, useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/Combobox";
import { Field } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import { Input } from "@/components/ui/input";
import { forMode, modesLine } from "@/helpers/map-modes.mjs";
import { useMapStore } from "@/stores";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>;
export type CustomMap = { id: number; name: string };

/** The one map a custom game cup is played on: one of the app's maps, the custom maps first, or
 *  a map added by its name when the app has none of that name yet (`POST /maps/custom`). */
export function CustomMapPicker({ value, onChange, problem }: { value: CustomMap | null; onChange: (map: CustomMap | null) => void; problem?: string | null }) {
  const mapStore = useMapStore();
  const nameId = useId();
  const [maps, setMaps] = useState<Row[]>([]);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    mapStore
      .fetchMaps()
      .then(setMaps)
      .catch(() => setMaps([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const add = async () => {
    setBusy(true);
    setError(null);
    try {
      const made: Row = await mapStore.addCustomMap(name.trim());
      onChange({ id: made.id, name: made.name });
      setName("");
    } catch (e) {
      setError((e as Error).message || "The map was not added");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">A custom game is played on one map: every game of every match, and every lobby. Nothing is vetoed.</p>
      {value ? (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-primary/60 p-3">
          <Icon name="mdi-map-marker" className="text-primary-text" />
          <span className="min-w-0 flex-1">
            Played on <strong>{value.name}</strong>
          </span>
          <Button variant="ghost" size="sm" onClick={() => onChange(null)}>
            <Icon name="mdi-swap-horizontal" />
            Pick another map
          </Button>
        </div>
      ) : (
        <>
          <div className="max-w-[420px]">
            <Combobox
              label="Pick the map"
              placeholder="Search the maps"
              items={forMode(maps, "custom").map((row: Row) => ({ value: String(row.id), title: row.name as string, modes: modesLine(row.modes) }))}
              row={(item) => (
                <span className="flex flex-col text-left">
                  <span>{item.title}</span>
                  <span className="text-xs text-muted-foreground">{item.modes}</span>
                </span>
              )}
              value={null}
              onChange={(picked) => {
                const row = maps.find((one) => String(one.id) === picked);
                if (row) onChange({ id: row.id, name: row.name });
              }}
            />
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <Field className="min-w-[240px] flex-1" label="Not in the list? Add it by name" htmlFor={nameId} hint="An admin can add its picture on the Maps page later">
              <Input id={nameId} value={name} maxLength={50} placeholder="Footmen Frenzy" onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && name.trim() && add()} />
            </Field>
            <Button variant="outline" disabled={!name.trim() || busy} onClick={add}>
              <Icon name={busy ? "mdi-loading mdi-spin" : "mdi-plus"} />
              Add the map
            </Button>
          </div>
        </>
      )}
      {error ? <p className="text-sm text-error">{error}</p> : null}
      {problem && !value ? <p className="text-sm text-muted-foreground">{problem}</p> : null}
    </div>
  );
}
