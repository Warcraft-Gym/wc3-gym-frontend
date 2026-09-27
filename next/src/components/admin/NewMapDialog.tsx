/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Field } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import { Input } from "@/components/ui/input";
import { StatusAlert } from "@/components/StatusAlert";
import { useMapStore } from "@/stores";

/** A new map for the catalogue, with its picture. The caller decides what the new map joins:
 *  onCreated gets the stored map once the picture is up. */
export function NewMapDialog({
  open,
  onOpenChange,
  onCreated,
  confirmLabel = "Create map",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (map: Record<string, any>) => Promise<unknown> | void;
  confirmLabel?: string;
}) {
  const mapStore = useMapStore();
  const [map, setMap] = useState({ name: "", shortname: "" });
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const preview = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);

  const close = () => {
    setMap({ name: "", shortname: "" });
    setFile(null);
    setError(null);
    onOpenChange(false);
  };

  const create = async () => {
    setSaving(true);
    setError(null);
    try {
      const created = await mapStore.createMap(map);
      if (file) await mapStore.uploadMapImage(created.id, file);
      await onCreated(created);
      close();
    } catch (err) {
      console.error("Failed to create the map", err);
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? onOpenChange(true) : close())}>
      <DialogContent showCloseButton={false} className="max-w-[560px] gap-0 p-0 md:max-w-[560px]">
        <DialogTitle className="flex items-center gap-2 bg-primary-darken-1 px-4 py-3 text-on-primary-darken-1">
          <Icon name="mdi-map-plus" />
          New map
        </DialogTitle>
        <div className="p-4">
          <StatusAlert modelValue={error} className="mb-4" onClose={() => setError(null)} />
          <div className="grid gap-4 md:grid-cols-3">
            <Field className="md:col-span-2" label="Map Name" htmlFor="new-map-name">
              <Input id="new-map-name" value={map.name} onChange={(e) => setMap({ ...map, name: e.target.value })} />
            </Field>
            <Field label="Short Name" htmlFor="new-map-shortname">
              <Input id="new-map-shortname" value={map.shortname} onChange={(e) => setMap({ ...map, shortname: e.target.value })} />
            </Field>
          </div>
          <div className="mt-4 flex items-center gap-4">
            <span className="block h-16 w-[100px] shrink-0 overflow-hidden rounded-[3px] bg-band">
              {preview ? <img src={preview} alt="Preview" className="block h-full w-full object-cover" /> : null}
            </span>
            <Field className="flex-1" label="Map Image" htmlFor="new-map-image">
              <Input id="new-map-image" type="file" accept=".png,.jpg" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            </Field>
          </div>
        </div>
        <div className="flex justify-end gap-2 p-4 pt-0">
          <Button variant="ghost" onClick={close}>
            Cancel
          </Button>
          <Button disabled={!map.name || saving} onClick={create}>
            <Icon name={saving ? "mdi-loading mdi-spin" : "mdi-plus"} />
            {confirmLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default NewMapDialog;
