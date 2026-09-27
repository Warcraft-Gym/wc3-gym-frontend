/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/Icon";
import { NewMapDialog } from "@/components/admin/NewMapDialog";
import { PickGrid } from "@/components/admin/PickGrid";
import { LadderImportDialog, type ImportRow } from "@/components/LadderImportDialog";
import { StatusAlert } from "@/components/StatusAlert";
import { W3CIcon } from "@/components/W3CIcon";
import { hideMissingImage } from "@/helpers/team-image";
import { useMapStore } from "@/stores";

type Row = Record<string, any>;

/** The season's map pool, ticked from every map. A map missing from the list is created here,
 *  or the W3C 1v1 pool is imported into the map list; either way the new maps join the pool ticked.
 *  The pool keeps the order the maps were ticked in. */
export function MapsStep({
  maps,
  selected,
  onChange,
  onMapsChanged,
}: {
  maps: Row[];
  selected: number[];
  onChange: (ids: number[]) => void;
  // reload the map list, then tick the maps the callback picks from it
  onMapsChanged: (pick: (maps: Row[]) => number[]) => Promise<void>;
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
      <NewMapDialog open={newOpen} onOpenChange={setNewOpen} onCreated={(created) => onMapsChanged(() => [created.id])} />
      <LadderImportDialog modelValue={importOpen} rows={importRows} loading={importLoading} onUpdateModelValue={setImportOpen} onConfirm={confirmImport} />
    </div>
  );
}

export default MapsStep;
