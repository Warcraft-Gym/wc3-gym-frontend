/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Field } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import { Input } from "@/components/ui/input";
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";
import { LadderImportDialog } from "@/components/LadderImportDialog";
import type { ImportRow } from "@/components/LadderImportDialog";
import { PageHeader } from "@/components/PageHeader";
import { RowActions } from "@/components/RowActions";
import { StatusAlert } from "@/components/StatusAlert";
import { W3CIcon } from "@/components/W3CIcon";
import { useDeleteDialog } from "@/hooks/delete-dialog";
import { hideMissingImage } from "@/helpers/team-image";
import { useMapStore } from "@/stores";

type MapRow = Record<string, any>;

export function MapsView() {
  const mapStore = useMapStore();

  // State
  const [maps, setMaps] = useState<MapRow[]>([]);
  const [selectedMap, setSelectedMap] = useState<MapRow | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [mapDialogOpen, setMapDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [pictureFile, setPictureFile] = useState<File | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [importRows, setImportRows] = useState<ImportRow[]>([]);
  // the picked file while one is picked, else the picture the map already has
  const picturePreview = useMemo(() => (pictureFile ? URL.createObjectURL(pictureFile) : selectedMap?.image), [pictureFile, selectedMap?.image]);

  // Delete dialog state
  const { showDeleteDialog, openDeleteDialog, confirmDelete, cancelDeleteDialog } = useDeleteDialog();

  const fetchMaps = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      setMaps((await mapStore.fetchMaps()) || []);
    } catch (error) {
      console.error("Failed to fetch maps", error);
      setErrorMessage("Failed to load maps. Please try again later.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // the loaders set state, so they run just outside the effect body (react-hooks/set-state-in-effect)
    queueMicrotask(fetchMaps);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openCreateMap = () => {
    setSelectedMap({ name: "", shortname: "" });
    setPictureFile(null);
    setFormError(null);
    setIsEditing(false);
    setMapDialogOpen(true);
  };

  const editMap = (map: MapRow) => {
    setSelectedMap({ ...map });
    setPictureFile(null);
    setFormError(null);
    setIsEditing(true);
    setMapDialogOpen(true);
  };

  const uploadPicture = async (mapId: number) => {
    if (pictureFile) await mapStore.uploadMapImage(mapId, pictureFile);
  };

  const updateMap = async () => {
    setFormError(null);
    try {
      await mapStore.updateMap(selectedMap);
      await uploadPicture(selectedMap!.id);
      await fetchMaps();
      closeMapDialog();
    } catch (error) {
      console.error("Error updating map:", error);
      setFormError("Failed to update map. Please try again.");
    }
  };

  const createNewMap = async () => {
    setFormError(null);
    try {
      const created = await mapStore.createMap(selectedMap);
      await uploadPicture(created.id);
      await fetchMaps();
      closeMapDialog();
    } catch (error) {
      console.error("Error creating map:", error);
      setFormError("Failed to create map. Please try again.");
    }
  };

  const removeMap = async (mapId?: number | string) => {
    try {
      await mapStore.deleteMap(Number(mapId));
      await fetchMaps();
    } catch (error) {
      console.error("Error deleting map:", error);
    }
  };

  const openImport = async () => {
    setImportOpen(true);
    setImportLoading(true);
    setImportRows([]);
    try {
      setImportRows(await mapStore.fetchLadderMapImport());
    } catch (error) {
      console.error("Failed to read the ladder pool", error);
      setErrorMessage((error as Error).message);
      setImportOpen(false);
    } finally {
      setImportLoading(false);
    }
  };

  // a known map is renamed to the ladder name and gets its picture; no season pool changes
  const confirmImport = async (names: string[]) => {
    try {
      await mapStore.importLadderMaps(names);
      setImportOpen(false);
      await fetchMaps();
    } catch (error) {
      console.error("Failed to import the ladder pool", error);
      setErrorMessage((error as Error).message);
    }
  };

  const closeMapDialog = () => {
    setMapDialogOpen(false);
    setFormError(null);
    setSelectedMap(null);
    setPictureFile(null);
  };

  return (
    <div className="p-4">
      {isLoading ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/60">
          <Icon name="mdi-loading" size={64} className="animate-spin text-primary" />
        </div>
      ) : null}

      <PageHeader title={<><Icon name="mdi-map" className="mr-2" />1v1 Maps</>} />

      <StatusAlert modelValue={errorMessage} onClose={() => setErrorMessage(null)} />

      {/* Main Card */}
      <Card className="card gap-0 py-0">
        <CardHeader className="bg-primary p-4">
          <CardTitle className="flex items-center gap-2 text-on-primary">
            <Icon name="mdi-map" />
            <span>All maps</span>
          </CardTitle>
        </CardHeader>

        <CardContent className="p-4">
          <div className="mb-4 flex flex-wrap justify-end gap-2">
            <Button variant="outline" onClick={openImport}>
              <W3CIcon size={20} />
              Import W3C map pool
            </Button>
            <Button onClick={openCreateMap}>
              <Icon name="mdi-plus" />
              Add map
            </Button>
          </div>

          {maps.length ? (
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {maps.map((item) => (
                <Card key={item.id} className="card gap-0 py-0">
                  <div className="relative aspect-3/2 bg-band">
                    {item.image ? (
                      <img src={item.image} alt={item.name} className="h-full w-full object-cover" onError={hideMissingImage} />
                    ) : (
                      // an empty band says the map has no picture rather than reading as one still loading
                      <div className="flex h-full flex-col items-center justify-center text-on-band">
                        <Icon name="mdi-map-outline" size={40} />
                        <span className="mt-1 text-xs">No picture</span>
                      </div>
                    )}
                    {item.shortname ? (
                      <Badge variant="secondary" className="absolute bottom-2 left-2 rounded-[4px]">
                        {item.shortname}
                      </Badge>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-2 p-4">
                    <div className="flex-1 font-medium">{item.name}</div>
                    <RowActions
                      actions={[
                        { icon: "mdi-pencil", label: "Edit", onClick: () => editMap(item) },
                        { icon: "mdi-delete", label: "Delete", color: "error", onClick: () => openDeleteDialog(item.id, removeMap) },
                      ]}
                    />
                  </div>
                </Card>
              ))}
            </div>
          ) : !errorMessage ? (
            // Empty State: only a read that worked proves the pool is empty
            <div className="p-8 text-center">
              <Icon name="mdi-map-outline" size={64} className="text-muted-foreground" />
              <div className="mt-4 mb-2 text-muted-foreground">No maps found</div>
              <p className="mb-4 text-muted-foreground">Get started by adding your first map</p>
              <Button onClick={openCreateMap}>
                <Icon name="mdi-plus" />
                Add the first map
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Add / Edit Map Dialog */}
      <Dialog open={mapDialogOpen} onOpenChange={(open) => open || closeMapDialog()}>
        {selectedMap ? (
          <DialogContent showCloseButton={false} className="max-w-[600px] gap-0 p-0 sm:max-w-[600px]">
            <DialogTitle className="flex items-center gap-2 bg-primary px-4 py-3 text-on-primary">
              <Icon name={isEditing ? "mdi-pencil" : "mdi-map-plus"} />
              {isEditing ? `Edit map: ${selectedMap.name}` : "Add map"}
            </DialogTitle>

            <StatusAlert modelValue={formError} className="mx-4 my-2" onClose={() => setFormError(null)} />

            <div className="p-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Map name" htmlFor="map-name">
                  <Input id="map-name" value={selectedMap.name ?? ""} onChange={(e) => setSelectedMap({ ...selectedMap, name: e.target.value })} />
                </Field>
                <Field label="Short name" htmlFor="map-shortname">
                  <Input id="map-shortname" value={selectedMap.shortname ?? ""} onChange={(e) => setSelectedMap({ ...selectedMap, shortname: e.target.value })} />
                </Field>
              </div>
              <div className="mt-4 flex items-center gap-4">
                <span className="block h-16 w-[100px] shrink-0 overflow-hidden rounded-[3px] bg-band">
                  {picturePreview ? <img src={picturePreview} alt={selectedMap.name} onError={hideMissingImage} className="block h-full w-full object-cover" /> : null}
                </span>
                <Field className="flex-1" label="Picture" htmlFor="map-picture">
                  <Input id="map-picture" type="file" accept="image/png,image/jpeg" onChange={(e) => setPictureFile(e.target.files?.[0] ?? null)} />
                </Field>
              </div>
            </div>

            <div className="flex justify-end gap-2 p-4 pt-0">
              <Button variant="ghost" onClick={closeMapDialog}>
                Cancel
              </Button>
              <Button onClick={() => (isEditing ? updateMap() : createNewMap())}>
                <Icon name={isEditing ? "mdi-content-save" : "mdi-plus"} />
                {isEditing ? "Save changes" : "Add map"}
              </Button>
            </div>
          </DialogContent>
        ) : null}
      </Dialog>

      <LadderImportDialog modelValue={importOpen} rows={importRows} loading={importLoading} onUpdateModelValue={setImportOpen} onConfirm={confirmImport} />

      <ConfirmDeleteDialog
        modelValue={showDeleteDialog}
        message="Are you sure you want to delete this map? This action cannot be undone."
        deleteIcon="mdi-delete"
        onUpdateModelValue={(open) => !open && cancelDeleteDialog()}
        onConfirm={confirmDelete}
        onCancel={cancelDeleteDialog}
      />
    </div>
  );
}

export default MapsView;
