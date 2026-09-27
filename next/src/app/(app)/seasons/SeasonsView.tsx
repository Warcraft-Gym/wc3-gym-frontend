/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import { Input } from "@/components/ui/input";
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
import { useAuth, useSeason } from "@/stores";
import { SeasonWizardDialog } from "./_wizard/SeasonWizardDialog";

type Season = Record<string, any>;
// A column marked mobile:false hides below the md breakpoint. CSS does it, not a JS breakpoint,
// so the server and the first client paint draw the same row.
const MOBILE_HIDDEN = "hidden md:table-cell";
type Column = { title: string; value: string; sortable: boolean; mobile?: boolean; actions?: boolean };

export function SeasonsView() {
  const router = useRouter();
  const { seasons, fetchSeasons, deleteSeason, uploadSeasonFile, exportSeason } = useSeason();
  const { isAdmin } = useAuth();

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const [seasonName, setSeasonName] = useState("");
  const [seasonId, setSeasonId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canUpload = !!file && (!!seasonId || !!seasonName);

  // The season the wizard edits, null for a new one; undefined while the wizard is closed
  const [wizardSeason, setWizardSeason] = useState<Season | null | undefined>(undefined);
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

  useEffect(() => {
    // the loaders set state, so they run just outside the effect body (react-hooks/set-state-in-effect)
    queueMicrotask(() => {
      loadSeasons();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addNewSeason = () => setWizardSeason(null);
  const editSeason = (season: Season) => setWizardSeason(season);

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
      if (fileInputRef.current) fileInputRef.current.value = "";
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

  return (
    <div className="p-4">
      {isLoading ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/60">
          <Icon name="mdi-loading" size={64} className="animate-spin text-primary-text" />
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
                    <Input ref={fileInputRef} id="season-file" type="file" accept=".xlsx" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
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
          <CardHeader className="banner bg-banner p-4">
            <CardTitle className="flex items-center gap-2 text-primary">
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
                        className={`${column.actions ? "text-end" : ""} ${column.mobile === false ? MOBILE_HIDDEN : ""} ${sort.value === column.value ? "text-primary-text" : ""}`}
                      >
                        {/* a sortable header is a button, so Tab and Enter reach the sort */}
                        {column.sortable ? (
                          <button
                            type="button"
                            className="inline-flex cursor-pointer items-center select-none"
                            onClick={() => setSort({ value: column.value, desc: sort.value === column.value && !sort.desc })}
                          >
                            {column.title}
                            <Icon name={sort.value === column.value && sort.desc ? "mdi-arrow-down" : "mdi-arrow-up"} className={`ml-0.5 text-sm ${sort.value === column.value ? "" : "opacity-25"}`} />
                          </button>
                        ) : (
                          column.title
                        )}
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
                          {/* Edit is the task an admin comes for, so it sits on the row; the rest folds into the menu */}
                          <div className="flex items-center justify-end">
                            <Tooltip>
                              <TooltipTrigger
                                render={
                                  <Button
                                    variant="ghost"
                                    size="icon-sm"
                                    aria-label="Edit season"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      editSeason(item);
                                    }}
                                  />
                                }
                              >
                                <Icon name="mdi-pencil" />
                              </TooltipTrigger>
                              <TooltipContent>Edit season</TooltipContent>
                            </Tooltip>
                            <RowActions
                              menu
                              actions={[
                                { icon: "mdi-download", label: "Export Season", onClick: () => downloadSeason(item.id, item.name) },
                                { icon: "mdi-delete", label: "Delete Season", color: "error", onClick: () => openDeleteDialog(item.id, removeSeason) },
                              ]}
                            />
                          </div>
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

      <SeasonWizardDialog open={wizardSeason !== undefined} season={wizardSeason ?? null} onClose={() => setWizardSeason(undefined)} onSaved={loadSeasons} />

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
