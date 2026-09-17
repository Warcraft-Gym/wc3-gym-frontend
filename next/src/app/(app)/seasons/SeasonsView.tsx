/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Field } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";
import { PageHeader } from "@/components/PageHeader";
import { RowActions } from "@/components/RowActions";
import { StatusAlert } from "@/components/StatusAlert";
import { useDeleteDialog } from "@/hooks/delete-dialog";
import { PHASE_LABEL } from "@/helpers/season-phase.mjs";
import { SERIES_PER_FIXTURE } from "@/helpers/event-labels.mjs";
import { seasonSlug } from "@/helpers/season-slug.mjs";
import { useAuth, useMapStore, useSeason } from "@/stores";

// The scale the series points use, as the backend stores it
const SCORE_SYSTEMS = [
  { value: "standard", label: "Standard" },
  { value: "helpstone", label: "Helpstone" },
];

type Season = Record<string, any>;
type MapRow = { id: number; name: string };
// A column marked mobile:false hides below the md breakpoint. CSS does it, not a JS breakpoint,
// so the server and the first client paint draw the same row.
const MOBILE_HIDDEN = "hidden md:table-cell";
type Column = { title: string; value: string; sortable: boolean; mobile?: boolean; actions?: boolean };

export function SeasonsView() {
  const router = useRouter();
  const { seasons, fetchSeasons, createSeason, updateSeason, deleteSeason, addMapsToSeason, removeMapsFromSeason, uploadSeasonFile, exportSeason } = useSeason();
  const mapStore = useMapStore();
  const { isAdmin } = useAuth();

  const [maps, setMaps] = useState<MapRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const [seasonName, setSeasonName] = useState("");
  const [seasonId, setSeasonId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const canUpload = !!file && (!!seasonId || !!seasonName);

  const [seasonDialogOpen, setSeasonDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedSeason, setSelectedSeason] = useState<Season | null>(null);
  const [selectedSeasonMapIds, setSelectedSeasonMapIds] = useState<number[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [sort, setSort] = useState<{ value: string; desc: boolean }>({ value: "", desc: false });

  const { showDeleteDialog, openDeleteDialog, confirmDelete, cancelDeleteDialog } = useDeleteDialog();

  const tableHeader: Column[] = [
    { title: "Name", value: "name", sortable: true },
    { mobile: false, title: "Rounds", value: "round_count", sortable: true },
    { mobile: false, title: "Pick Ban", value: "pick_ban", sortable: false },
    { mobile: false, title: SERIES_PER_FIXTURE, value: "series_per_round", sortable: true },
    { title: "Phase", value: "phase", sortable: true },
    ...(isAdmin ? [{ title: "", value: "actions", sortable: false, actions: true }] : []),
  ];

  const rows = sort.value
    ? [...seasons].sort((a, b) => String(a[sort.value] ?? "").localeCompare(String(b[sort.value] ?? ""), undefined, { numeric: true }) * (sort.desc ? -1 : 1))
    : seasons;

  const loadSeasons = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const list = await fetchSeasons();
      if (!list || list.length === 0) setErrorMessage("No seasons found.");
    } catch (err) {
      console.error("Failed to fetch seasons", err);
      setErrorMessage("Failed to load seasons. Please try again later.");
    } finally {
      setIsLoading(false);
    }
  };

  const loadMaps = async () => {
    try {
      setMaps((await mapStore.fetchMaps()) || []);
    } catch (err) {
      console.error("Failed to fetch maps", err);
    }
  };

  useEffect(() => {
    // The reads run after the effect body, so the first paint is one render, not a cascade
    queueMicrotask(() => {
      loadSeasons();
      loadMaps();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addNewSeason = () => {
    setSelectedSeason({ name: "", round_count: 0, pick_ban: "", series_per_round: 0, score_system: "standard", discordRole: "", start_date: null, end_date: null, fantasy_grind: false, signups_open: true, scheduling_enabled: true, checkin_days: 3 });
    setSelectedSeasonMapIds([]);
    setFormError("");
    setIsEditing(false);
    setSeasonDialogOpen(true);
  };

  // a cleared number field holds an empty string; null is the season that stays open all season
  const normalizeCheckin = (season: Season): Season => ({ ...season, checkin_days: season.checkin_days === "" ? null : season.checkin_days });

  const createNewSeason = async () => {
    setFormError("");
    try {
      const createdSeason = await createSeason(normalizeCheckin(selectedSeason!));

      // Add maps to the season if any were selected
      if (selectedSeasonMapIds.length > 0) await addMapsToSeason(createdSeason.id, selectedSeasonMapIds);

      await loadSeasons();
      closeSeasonDialog();
    } catch (err) {
      console.error("Error creating season:", err);
      setFormError("Error creating season: " + (err as Error).message);
    }
  };

  const editSeason = (season: Season) => {
    setSelectedSeason({ ...season });
    setSelectedSeasonMapIds(season.maps ? season.maps.map((m: MapRow) => m.id) : []);
    setFormError("");
    setIsEditing(true);
    setSeasonDialogOpen(true);
  };

  const saveSeason = async () => {
    setFormError("");
    try {
      const season = normalizeCheckin(selectedSeason!);
      await updateSeason(season);

      // Update map pool - first get current maps, then determine what to add/remove
      const currentMapIds: number[] = season.maps ? season.maps.map((m: MapRow) => m.id) : [];
      const mapsToAdd = selectedSeasonMapIds.filter((id) => !currentMapIds.includes(id));
      const mapsToRemove = currentMapIds.filter((id) => !selectedSeasonMapIds.includes(id));

      if (mapsToAdd.length > 0) await addMapsToSeason(season.id, mapsToAdd);
      if (mapsToRemove.length > 0) await removeMapsFromSeason(season.id, mapsToRemove);

      await loadSeasons();
      closeSeasonDialog();
    } catch (err) {
      console.error("Error updating season:", err);
      setFormError("Error updating season: " + (err as Error).message);
    }
  };

  const closeSeasonDialog = () => {
    setSeasonDialogOpen(false);
    setSelectedSeason(null);
    setSelectedSeasonMapIds([]);
  };

  const removeSeason = async (id?: number | string) => {
    setErrorMessage("");
    try {
      await deleteSeason(Number(id));
      await loadSeasons();
    } catch (err) {
      console.error("Error deleting season:", err);
      setErrorMessage("Error deleting season: " + (err as Error).message);
    }
  };

  const uploadFile = async () => {
    if (!file || (!seasonId && !seasonName)) {
      setUploadMessage("Please select a file and provide a Season Name or ID before uploading!");
      return;
    }
    try {
      setIsLoading(true);
      setUploadMessage(null);
      const success = await uploadSeasonFile(seasonId ? Number(seasonId) : null, seasonName || null, file);
      setUploadMessage(success ? "File uploaded successfully!" : "Upload failed!");
      await loadSeasons();
    } catch (err) {
      console.error("Error uploading file:", err);
      setUploadMessage("An error occurred during file upload.");
    } finally {
      setIsLoading(false);
      setSeasonId("");
      setSeasonName("");
      setFile(null);
    }
  };

  const downloadSeason = async (id: number, name: string) => {
    try {
      setIsLoading(true);
      setErrorMessage(null);

      const { blob, filename } = await exportSeason(id);

      // Create a download link and trigger it
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      setUploadMessage(`Successfully exported ${name}!`);
    } catch (err) {
      console.error("Error exporting season:", err);
      setErrorMessage("Error exporting season: " + (err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const set = (part: Season) => setSelectedSeason((season) => ({ ...season, ...part }));

  return (
    <div className="p-4">
      {isLoading ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/60">
          <Icon name="mdi-loading" size={64} className="animate-spin text-primary" />
        </div>
      ) : null}

      <PageHeader title={<><Icon name="mdi-trophy" className="mr-2" />Seasons</>} />

      {/* Import Excel Panel */}
      {isAdmin ? (
        <Card className="card mb-4 gap-0 py-0">
          <Accordion>
            <AccordionItem value="import">
              <AccordionTrigger className="bg-surface-light px-4">
                <span className="flex items-center gap-2">
                  <Icon name="mdi-file-upload" />
                  Import Excel File
                </span>
              </AccordionTrigger>
              <AccordionContent className="p-4">
                <div className="grid gap-4 md:grid-cols-12">
                  <Field className="md:col-span-3" label="Season Name" htmlFor="season-name">
                    <Input id="season-name" value={seasonName} placeholder="Enter season name" onChange={(e) => setSeasonName(e.target.value)} />
                  </Field>
                  <div className="flex items-center justify-center text-muted-foreground md:col-span-1 md:pt-6">OR</div>
                  <Field className="md:col-span-2" label="Season ID" htmlFor="season-id">
                    <Input id="season-id" type="number" value={seasonId} placeholder="Enter season ID" onChange={(e) => setSeasonId(e.target.value)} />
                  </Field>
                  <Field className="md:col-span-6" label="Upload Excel File" htmlFor="season-file">
                    <Input id="season-file" type="file" accept=".xlsx" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
                  </Field>
                </div>
                <div className="mt-4">
                  <Button disabled={!canUpload || isLoading} onClick={uploadFile}>
                    <Icon name="mdi-upload" />
                    Upload File
                  </Button>
                </div>
                <StatusAlert modelValue={uploadMessage} type="success" className="mt-4" onClose={() => setUploadMessage(null)} />
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </Card>
      ) : null}

      {/* Error Message */}
      <StatusAlert modelValue={errorMessage} onClose={() => setErrorMessage(null)} />

      {/* Seasons Table */}
      {!errorMessage ? (
        <Card className="card gap-0 py-0">
          <CardHeader className="bg-primary p-4">
            <CardTitle className="flex items-center gap-2 text-on-primary">
              <Icon name="mdi-format-list-bulleted" />
              All Seasons
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isAdmin ? (
              <div className="flex justify-end p-2">
                <Button className="w-full sm:w-auto" onClick={addNewSeason}>
                  <Icon name="mdi-plus" />
                  Add New Season
                </Button>
              </div>
            ) : null}
            {rows.length ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    {tableHeader.map((column) => (
                      <TableHead
                        key={column.value}
                        className={`${column.sortable ? "cursor-pointer select-none" : ""} ${column.actions ? "text-end" : ""} ${column.mobile === false ? MOBILE_HIDDEN : ""} ${sort.value === column.value ? "text-primary" : ""}`}
                        onClick={() => column.sortable && setSort({ value: column.value, desc: sort.value === column.value && !sort.desc })}
                      >
                        {column.title}
                        {column.sortable ? (
                          <Icon name={sort.value === column.value && sort.desc ? "mdi-arrow-down" : "mdi-arrow-up"} className={`ml-0.5 text-sm ${sort.value === column.value ? "" : "opacity-25"}`} />
                        ) : null}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((item: Season) => (
                    <TableRow key={item.id} className="cursor-pointer" onClick={() => router.push(`/seasons/${seasonSlug(item)}`)}>
                      <TableCell>
                        <strong>{item.name}</strong>
                      </TableCell>
                      <TableCell className={`${MOBILE_HIDDEN} tnum`}>{item.round_count}</TableCell>
                      <TableCell className={MOBILE_HIDDEN}>{item.pick_ban}</TableCell>
                      <TableCell className={`${MOBILE_HIDDEN} tnum`}>{item.series_per_round}</TableCell>
                      <TableCell>
                        {PHASE_LABEL[item.phase as keyof typeof PHASE_LABEL] ?? ""}
                        {item.phase === "overdue" ? (
                          <Tooltip>
                            <TooltipTrigger render={<span />}>
                              <Icon name="mdi-alert" className="text-warning" />
                            </TooltipTrigger>
                            <TooltipContent>Past its end date</TooltipContent>
                          </Tooltip>
                        ) : null}
                        {item.unscored_series ? (
                          <Link href={`/seasons/${seasonSlug(item)}?unscored=1`} className="chip ml-1 bg-muted" onClick={(event) => event.stopPropagation()}>
                            {item.unscored_series} unscored
                          </Link>
                        ) : null}
                      </TableCell>
                      {isAdmin ? (
                        <TableCell className="text-end">
                          <RowActions
                            actions={[
                              { icon: "mdi-pencil", label: "Edit Season", onClick: () => editSeason(item) },
                              { icon: "mdi-download", label: "Export Season", onClick: () => downloadSeason(item.id, item.name) },
                              { icon: "mdi-delete", label: "Delete Season", color: "error", onClick: () => openDeleteDialog(item.id, removeSeason) },
                            ]}
                          />
                        </TableCell>
                      ) : null}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="p-8 text-center">
                <Icon name="mdi-trophy-broken" size={64} className="text-muted-foreground" />
                <div className="mt-4 text-muted-foreground">No seasons found</div>
                {isAdmin ? (
                  <Button variant="secondary" className="mt-4" onClick={addNewSeason}>
                    <Icon name="mdi-plus" />
                    Create First Season
                  </Button>
                ) : null}
              </div>
            )}
          </CardContent>
        </Card>
      ) : null}

      {/* Add / Edit Season Dialog */}
      <Dialog open={seasonDialogOpen} onOpenChange={(open) => !open || closeSeasonDialog()}>
        {selectedSeason ? (
          <DialogContent showCloseButton={false} className="max-h-[90vh] max-w-[800px] gap-0 overflow-y-auto p-0 sm:max-w-[800px]">
            <DialogTitle className="flex items-center gap-2 bg-primary px-4 py-3 text-on-primary">
              <Icon name={isEditing ? "mdi-pencil" : "mdi-plus-circle"} />
              {isEditing ? `Edit season: ${selectedSeason.name}` : "Add new season"}
            </DialogTitle>

            <StatusAlert modelValue={formError} className="mx-4 mt-4 mb-2" onClose={() => setFormError(null)} />

            <div className="grid gap-4 p-4 md:grid-cols-2">
              <Field label="Season Name" htmlFor="edit-name">
                <Input id="edit-name" value={selectedSeason.name ?? ""} onChange={(e) => set({ name: e.target.value })} />
              </Field>
              <Field label="Number of Rounds" htmlFor="edit-rounds">
                <Input id="edit-rounds" type="number" value={selectedSeason.round_count ?? ""} onChange={(e) => set({ round_count: e.target.value })} />
              </Field>
              <Field label="Pick Ban Order" htmlFor="edit-pick-ban">
                <Input id="edit-pick-ban" value={selectedSeason.pick_ban ?? ""} onChange={(e) => set({ pick_ban: e.target.value })} />
              </Field>
              <Field label={SERIES_PER_FIXTURE} htmlFor="edit-series">
                <Input id="edit-series" type="number" value={selectedSeason.series_per_round ?? ""} onChange={(e) => set({ series_per_round: e.target.value })} />
              </Field>
              <Field label="Score system" htmlFor="edit-score-system">
                <Select value={selectedSeason.score_system ?? "standard"} onValueChange={(value) => set({ score_system: value })}>
                  <SelectTrigger id="edit-score-system" className="w-full">
                    <SelectValue>{(value: string) => SCORE_SYSTEMS.find((system) => system.value === value)?.label ?? value}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {SCORE_SYSTEMS.map((system) => (
                      <SelectItem key={system.value} value={system.value}>
                        {system.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Discord Role ID" htmlFor="edit-discord-role">
                <Input id="edit-discord-role" value={selectedSeason.discordRole ?? ""} onChange={(e) => set({ discordRole: e.target.value })} />
              </Field>
              <Field label="Start Date" htmlFor="edit-start-date">
                <Input id="edit-start-date" type="date" value={selectedSeason.start_date ?? ""} onChange={(e) => set({ start_date: e.target.value || null })} />
              </Field>
              <Field label="End Date" htmlFor="edit-end-date">
                <Input id="edit-end-date" type="date" value={selectedSeason.end_date ?? ""} onChange={(e) => set({ end_date: e.target.value || null })} />
              </Field>
              <Field label="Map Pool" htmlFor="edit-map-pool">
                {/* one open list, so a map leaves the pool the same way it joined it */}
                <Select multiple value={selectedSeasonMapIds} onValueChange={setSelectedSeasonMapIds}>
                  <SelectTrigger id="edit-map-pool" className="h-auto min-h-8 w-full py-1.5">
                    <Icon name="mdi-map" className="text-muted-foreground" />
                    <SelectValue>
                      {(ids: number[]) => (
                        <span className="flex flex-wrap gap-1">
                          {ids.map((id) => (
                            <Badge key={id} variant="outline">
                              {maps.find((m) => m.id === id)?.name ?? id}
                            </Badge>
                          ))}
                        </span>
                      )}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {maps.map((map) => (
                      <SelectItem key={map.id} value={map.id}>
                        {map.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Label className="flex items-center gap-2">
                <Switch checked={!!selectedSeason.signups_open} onCheckedChange={(checked) => set({ signups_open: checked })} />
                Signups open
              </Label>
              <Label className="flex items-center gap-2">
                <Switch checked={!!selectedSeason.scheduling_enabled} onCheckedChange={(checked) => set({ scheduling_enabled: checked })} />
                Availability tools
              </Label>
              <Field label="Check-in opens (days before a round)" hint="Blank keeps check-in open all season." htmlFor="edit-checkin">
                <Input
                  id="edit-checkin"
                  type="number"
                  min={0}
                  value={selectedSeason.checkin_days ?? ""}
                  onChange={(e) => set({ checkin_days: e.target.value === "" ? "" : Number(e.target.value) })}
                />
              </Field>
              <div className="flex flex-col gap-1.5">
                <Label className="flex items-center gap-2">
                  <Checkbox checked={!!selectedSeason.fantasy_grind} onCheckedChange={(checked) => set({ fantasy_grind: checked })} />
                  Fantasy grind pick
                </Label>
                <p className="text-xs text-muted-foreground">Fantasy Captains pick a team and its achievement points pay by rank.</p>
              </div>
            </div>

            <div className="flex justify-end gap-2 px-4 py-3">
              <Button variant="ghost" onClick={closeSeasonDialog}>
                Cancel
              </Button>
              {isAdmin ? (
                <Button onClick={() => (isEditing ? saveSeason() : createNewSeason())}>
                  <Icon name="mdi-check" />
                  {isEditing ? "Save Changes" : "Create Season"}
                </Button>
              ) : null}
            </div>
          </DialogContent>
        ) : null}
      </Dialog>

      <ConfirmDeleteDialog
        modelValue={showDeleteDialog}
        message="Are you sure you want to delete this season? This action cannot be undone."
        onUpdateModelValue={(open) => !open && cancelDeleteDialog()}
        onConfirm={confirmDelete}
        onCancel={cancelDeleteDialog}
      />
    </div>
  );
}

export default SeasonsView;
