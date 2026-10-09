/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/Icon";
import { NewMapDialog } from "@/components/admin/NewMapDialog";
import { PickBanBuilder } from "@/components/admin/PickBanBuilder";
import { PickGrid } from "@/components/admin/PickGrid";
import { LadderImportDialog, type ImportRow } from "@/components/LadderImportDialog";
import { StatusAlert } from "@/components/StatusAlert";
import { W3CIcon } from "@/components/W3CIcon";
import { orderOf } from "@/helpers/pick-ban.mjs";
import { hideMissingImage } from "@/helpers/team-image";
import { useMapStore } from "@/stores";

type Row = Record<string, any>;

/** The season's map pool, ticked from every map. A map missing from the list is created here,
 *  or the W3C 1v1 pool is imported into the map list; either way the new maps join the pool ticked.
 *  The pool keeps the order the maps were ticked in. The pick and ban order is built below the pool
 *  and saved with it: a step with no map ticked saves neither. */
export function MapsStep({
  maps,
  selected,
  onChange,
  onMapsChanged,
  pickBan,
  mapRules,
  onPickBan,
}: {
  maps: Row[];
  selected: number[];
  onChange: (ids: number[]) => void;
  // reload the map list, then tick the maps the callback picks from it
  onMapsChanged: (pick: (maps: Row[]) => number[]) => Promise<void>;
  // the order as the season stores it, steps joined by |
  pickBan: string | null | undefined;
  mapRules: string | null | undefined;
  onPickBan: (pickBan: string) => void;
}) {
  const mapStore = useMapStore();
  const [newOpen, setNewOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [importRows, setImportRows] = useState<ImportRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  const openImport = async () => {
    setError(null);
    setImportOpen(true);
    setImportLoading(true);
    setImportRows([]);
    try {
      setImportRows(await mapStore.fetchLadderMapImport());
    } catch (err) {
      console.error("Failed to read the ladder pool", err);
      setError((err as Error).message);
      setImportOpen(false);
    } finally {
      setImportLoading(false);
    }
  };

  // The import renames a known map to its ladder name, so the maps it touched are found by that name.
  // A row off the ladder only gets its picture, so it is not ticked.
  const confirmImport = async (names: string[]) => {
    setError(null);
    try {
      await mapStore.importLadderMaps(names);
      const ladder = new Set(
        importRows.filter((row) => row.status !== "off_ladder" && names.includes(row.w3c_name)).map((row) => row.w3c_name.toLowerCase()),
      );
      setImportOpen(false);
      await onMapsChanged((list) => list.filter((map) => ladder.has(String(map.name).toLowerCase())).map((map) => map.id));
    } catch (err) {
      console.error("Failed to import the ladder pool", err);
      setError((err as Error).message);
    }
  };

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="flex-1 font-medium">
          {selected.length} {selected.length === 1 ? "map" : "maps"} in the pool
        </span>
        <Button variant="outline" onClick={openImport}>
          <W3CIcon size={18} />
          Import W3C map pool
        </Button>
        <Button variant="outline" onClick={() => setNewOpen(true)}>
          <Icon name="mdi-map-plus" />
          New map
        </Button>
      </div>
      <StatusAlert modelValue={error} className="mb-3" onClose={() => setError(null)} />
      <PickGrid
        items={maps as { id: number; name: string }[]}
        selected={selected}
        onChange={onChange}
        imageOf={(map: Row) => map.image}
        onImageError={hideMissingImage}
        tagOf={(map: Row) => map.shortname}
        empty="No maps yet. Import the W3C map pool or create one with New map."
      />
      <div className="mt-6">
        <h3 className="mb-1 font-medium">Pick and ban order</h3>
        <p className="mb-3 text-xs text-muted-foreground">
          {selected.length ? "The order must fit the ticked pool." : "The order is saved together with the pool; with no map ticked, neither is saved yet."}
        </p>
        <PickBanBuilder order={orderOf(pickBan)} onChange={(order) => onPickBan(order.join("|"))} mapRules={mapRules} poolSize={selected.length} />
      </div>
      <NewMapDialog open={newOpen} onOpenChange={setNewOpen} onCreated={(created) => onMapsChanged(() => [created.id])} />
      <LadderImportDialog modelValue={importOpen} rows={importRows} loading={importLoading} onUpdateModelValue={setImportOpen} onConfirm={confirmImport} />
    </div>
  );
}

export default MapsStep;
