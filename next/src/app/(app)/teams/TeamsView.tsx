/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Field } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";
import { PageHeader } from "@/components/PageHeader";
import { RowActions } from "@/components/RowActions";
import { StatusAlert } from "@/components/StatusAlert";
import { useDeleteDialog } from "@/hooks/delete-dialog";
import { loadSeasons, resolveCurrentSeasonId } from "@/helpers/current-season.js";
import { showDefaultTeamImage, teamImageUrl } from "@/helpers/team-image.js";
import { useAuth, useSeason, useTeamStore } from "@/stores";

type Row = Record<string, any>;
const WIDE = "hidden min-[960px]:table-cell";
const emptyTeam = () => ({ name: "", long_name: "" });
const errorText = (error: unknown) => error instanceof Error ? error.message : typeof error === "string" ? error : "Unknown error";

export function TeamsView() {
  const router = useRouter();
  const teamStore = useTeamStore();
  const seasonStore = useSeason();
  const { isAdmin } = useAuth();
  const fileInput = useRef<HTMLInputElement>(null);
  const deletion = useDeleteDialog();
  const [teams, setTeams] = useState<Row[]>([]);
  const [currentSeasonId, setCurrentSeasonId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialog, setDialog] = useState(false);
  const [editing, setEditing] = useState(false);
  const [selected, setSelected] = useState<Row>(emptyTeam);
  const [file, setFile] = useState<File | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchTeams = async () => {
    setLoading(true); setError(null);
    try { setTeams((await teamStore.fetchTeams()) || []); }
    catch (e) { console.error("Failed to load teams:", e); setError("Failed to load Teams. Please try again later."); }
    finally { setLoading(false); }
  };
  useEffect(() => {
    const start = async () => { await loadSeasons(); setCurrentSeasonId(await resolveCurrentSeasonId()); await fetchTeams(); };
    start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const playedSeasons = (team: Row) => (team.seasons_info || []).map((info: Row) => seasonStore.seasons.find((season) => season.id === info.season_id)).filter(Boolean).sort((a: Row, b: Row) => b.id - a.id);
  const currentName = seasonStore.seasons.find((season) => season.id === currentSeasonId)?.name;
  const playsCurrent = (team: Row) => (team.seasons_info || []).some((info: Row) => info.season_id === currentSeasonId);
  const groups = !currentSeasonId ? [{ title: "All teams", items: teams }] : [{ title: currentName || "Current season", items: teams.filter(playsCurrent) }, { title: "Past teams", items: teams.filter((team) => !playsCurrent(team)) }];
  const set = (key: string, value: unknown) => setSelected((old) => ({ ...old, [key]: value }));
  const close = () => { setDialog(false); setFile(null); setSelected(emptyTeam()); if (fileInput.current) fileInput.current.value = ""; };
  const openCreate = () => { setSelected(emptyTeam()); setFile(null); setFormError(null); setEditing(false); setDialog(true); };
  const openEdit = (team: Row) => { setSelected({ id: team.id, league_id: team.league_id, name: team.name, long_name: team.long_name }); setFile(null); setFormError(null); setEditing(true); setDialog(true); };
  const save = async () => {
    setFormError(null);
    if (editing) {
      try { await teamStore.updateTeam(selected); if (file) await teamStore.uploadTeamImage(selected.id, file, selected.league_id); await fetchTeams(); close(); }
      catch (e) { console.error("Error updating Team:", e); setFormError("Error updating Team: " + errorText(e)); }
      return;
    }
    let created: Row;
    try {
      if (teams.some((team) => team.name.toLowerCase() === selected.name.toLowerCase())) throw new Error(`Team with name ${selected.name} already exists`);
      created = await teamStore.createTeam(selected);
    } catch (e) { console.error("Error creating Team:", e); setFormError("Error creating Team: " + errorText(e)); return; }
    if (file) {
      try { await teamStore.uploadTeamImage(created.id, file, created.league_id); }
      catch (e) { console.error("Error uploading team icon:", e); await fetchTeams(); setFile(null); setSelected({ id: created.id, league_id: created.league_id, name: created.name, long_name: created.long_name }); setFormError("Team created, but icon upload failed: " + errorText(e)); setEditing(true); return; }
    }
    await fetchTeams(); close();
  };
  const remove = async (id?: number | string) => { setError(null); try { await teamStore.deleteTeam(Number(id)); await fetchTeams(); } catch (e) { console.error("Error deleting Team:", e); setError("Error deleting Team: " + errorText(e)); } };

  return <div className="p-4">
    {loading ? <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/60"><Icon name="mdi-loading" size={64} className="animate-spin text-primary" /></div> : null}
    <PageHeader title={<span className="inline-flex items-center gap-2"><Icon name="mdi-shield-account" />Teams</span>} />
    <StatusAlert modelValue={error} onClose={() => setError(null)} />
    {isAdmin ? <div className="mb-4 flex justify-end"><Button onClick={openCreate}><Icon name="mdi-plus" />Add team</Button></div> : null}
    {!error ? groups.map((group) => <Card key={group.title} className="card mb-4 gap-0 py-0">
      <CardTitle className="flex items-center gap-2 bg-primary p-4 text-on-primary"><Icon name="mdi-format-list-bulleted" />{group.title}</CardTitle>
      <CardContent className="p-0"><div className="table-scroll overflow-x-auto"><Table><TableHeader><TableRow><TableHead className="w-16" /><TableHead>Long name</TableHead><TableHead>Handle</TableHead><TableHead className={WIDE}>Seasons</TableHead>{isAdmin ? <TableHead /> : null}</TableRow></TableHeader><TableBody>
        {group.items.map((team) => <TableRow key={team.id} className="cursor-pointer" onClick={() => router.push(`/team/${team.id}`)}><TableCell><span className="block size-10 overflow-hidden rounded-full"><img className="size-full object-cover" src={teamImageUrl(team)} alt="" onError={showDefaultTeamImage} /></span></TableCell><TableCell><Link href={`/team/${team.id}`}><strong>{team.long_name || team.name}</strong></Link></TableCell><TableCell>{team.name}</TableCell><TableCell className={WIDE}>{playedSeasons(team).length ? <span className="flex flex-wrap gap-1">{playedSeasons(team).map((season: Row) => <Badge key={season.id} variant={season.id === currentSeasonId ? "default" : "secondary"}>{season.name}</Badge>)}</span> : "—"}</TableCell>{isAdmin ? <TableCell><RowActions actions={[{ icon: "mdi-pencil", label: "Edit team", onClick: () => openEdit(team) }, { icon: "mdi-delete", label: "Delete team", color: "error", onClick: () => deletion.openDeleteDialog(team.id, remove) }]} /></TableCell> : null}</TableRow>)}
        {!group.items.length ? <TableRow><TableCell colSpan={isAdmin ? 5 : 4} className="py-8 text-center"><Icon name="mdi-shield-off" size={64} className="text-muted-foreground" /><div className="mt-4 text-lg text-muted-foreground">No teams found</div>{isAdmin ? <Button variant="outline" className="mt-4" onClick={openCreate}><Icon name="mdi-plus" />Create first team</Button> : null}</TableCell></TableRow> : null}
      </TableBody></Table></div></CardContent>
    </Card>) : null}
    <Dialog open={dialog} onOpenChange={(open) => open ? setDialog(true) : close()}><DialogContent showCloseButton={false} className="max-w-[600px] gap-0 p-0 sm:max-w-[600px]"><DialogTitle className="flex items-center gap-2 bg-primary px-4 py-3 text-on-primary"><Icon name={editing ? "mdi-pencil" : "mdi-plus-circle"} />{editing ? `Edit team: ${selected.name ?? ""}` : "Add team"}</DialogTitle><div className="p-4 pb-0"><StatusAlert modelValue={formError} onClose={() => setFormError(null)} /></div><div className="grid gap-4 p-4 md:grid-cols-2"><Field label="Team name" htmlFor="team-name"><Input id="team-name" value={selected.name ?? ""} onChange={(e) => set("name", e.target.value)} /></Field><Field label="Team long name" htmlFor="team-long-name"><Input id="team-long-name" value={selected.long_name ?? ""} onChange={(e) => set("long_name", e.target.value)} /></Field><Field label="Team icon" htmlFor="team-icon" hint="Max 64 KB · PNG or JPG (MySQL BLOB limit)"><Input id="team-icon" ref={fileInput} type="file" accept=".png,.jpg" onChange={(e) => setFile(e.target.files?.[0] ?? null)} /></Field></div><div className="flex justify-end gap-2 p-4 pt-0"><Button variant="ghost" onClick={close}>Cancel</Button>{isAdmin ? <Button onClick={save}><Icon name="mdi-check" />{editing ? "Save changes" : "Create team"}</Button> : null}</div></DialogContent></Dialog>
    <ConfirmDeleteDialog modelValue={deletion.showDeleteDialog} message="Are you sure you want to delete this team? This action cannot be undone." onConfirm={deletion.confirmDelete} onCancel={deletion.cancelDeleteDialog} onUpdateModelValue={(open) => !open && deletion.cancelDeleteDialog()} />
  </div>;
}

export default TeamsView;
