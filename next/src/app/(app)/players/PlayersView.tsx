/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Field } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { CareerStatsDialog, type CareerStatsDialogHandle } from "@/components/CareerStatsDialog";
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";
import { CountrySelect } from "@/components/CountrySelect";
import { EditPlayerDialog, type EditPlayerDialogHandle } from "@/components/EditPlayerDialog";
import { FilterPanel } from "@/components/FilterPanel";
import { PageHeader } from "@/components/PageHeader";
import { PlayerName } from "@/components/PlayerName";
import { RaceMmrChips } from "@/components/RaceMmrChips";
import { RaceSelect } from "@/components/RaceSelect";
import { RowActions } from "@/components/RowActions";
import { SeasonSignupDialog, type SeasonSignupDialogHandle } from "@/components/SeasonSignupDialog";
import { StatusAlert } from "@/components/StatusAlert";
import { W3CMmr } from "@/components/W3CMmr";
import { useDeleteDialog } from "@/hooks/delete-dialog";
import { resolveCurrentW3CSeason } from "@/helpers/current-season.js";
import { findSeason } from "@/helpers/season-slug.mjs";
import { filterByMmrRange, matchesPlayerSearch, playerPath, playersWithCareers } from "@/helpers/players.mjs";
import { getAllRaceStats, getW3CGamesCount, hasLowGamesTwoSeasons, hasW3CStatsTwoSeasons } from "@/helpers/w3c-stats.js";
import { useAuth, usePlayerCareerStatsStore, usePlayerStore, useSeason } from "@/stores";

type Row = Record<string, any>;
type Flag = "no_stats" | "low_games" | "unlinked";
const WIDE = "hidden min-[960px]:table-cell";
const PAGE_SIZE = 25;

const emptyPlayer = () => ({ name: "", battleTag: "", country: "", discordTag: "", discordId: "", mmr: 0, race: "" });

function Warning({ row, season }: { row: Row; season: number | null }) {
  const missing = !hasW3CStatsTwoSeasons(row, season ?? 0, row.race);
  const low = !missing && hasLowGamesTwoSeasons(row, season ?? 0, row.race);
  if (!missing && !low) return null;
  const text = missing ? `No W3C stats found for ${row.race}` : `Less than 20 games (${getW3CGamesCount(row, season ?? 0, row.race)} games) for ${row.race}`;
  return <Tooltip><TooltipTrigger render={<span tabIndex={0}><Icon name="mdi-alert" className={missing ? "text-error" : "text-warning"} /></span>} /><TooltipContent>{text}</TooltipContent></Tooltip>;
}

export function PlayersView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const playerStore = usePlayerStore();
  const careerStore = usePlayerCareerStatsStore();
  const seasonStore = useSeason();
  const { isAdmin } = useAuth();
  const editDialog = useRef<EditPlayerDialogHandle>(null);
  const signupDialog = useRef<SeasonSignupDialogHandle>(null);
  const careerDialog = useRef<CareerStatsDialogHandle>(null);

  const [players, setPlayers] = useState<Row[]>([]);
  const [careers, setCareers] = useState<Row[]>([]);
  const [w3cSeason, setW3cSeason] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [race, setRace] = useState<string | null>(null);
  const [range, setRange] = useState<number[]>([0, 3000]);
  const [flags, setFlags] = useState<Flag[]>([]);
  const [sort, setSort] = useState<{ key: string; desc: boolean }>({ key: "rating", desc: true });
  const [page, setPage] = useState(0);
  const [newOpen, setNewOpen] = useState(false);
  const [newPlayer, setNewPlayer] = useState<Row>(emptyPlayer);
  const [creating, setCreating] = useState(false);
  const [creationError, setCreationError] = useState<string | null>(null);
  const [sync, setSync] = useState<Record<number, "loading" | "success" | "error">>({});
  const deletion = useDeleteDialog();

  const load = async () => {
    setLoading(true); setError(null);
    try {
      const [playerRows, careerRows, current] = await Promise.all([playerStore.fetchPlayers(), careerStore.fetchAll(), resolveCurrentW3CSeason()]);
      setPlayers(playerRows || []); setCareers(careerRows || []); setW3cSeason(current);
    } catch (e) { console.error("Failed to load players:", e); setError("Failed to load players. Please try again later."); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    const start = async () => {
      try {
        await seasonStore.fetchSeasons();
      } catch (e) { console.error("Failed to fetch seasons:", e); }
      await load();
    };
    start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const seasonId = findSeason(seasonStore.seasons, searchParams.get("season"))?.id ?? null;

  const chooseSeason = (id: number | null) => {
    setPage(0);
    const query = new URLSearchParams(searchParams.toString());
    if (id) query.set("season", seasonStore.slugOf(id)); else query.delete("season");
    router.replace(query.size ? `/players?${query}` : "/players", { scroll: false });
  };
  const bestMmr = (player: Row) => Math.max(0, ...getAllRaceStats(player, w3cSeason ?? undefined).filter((stat: Row) => (stat.games || 0) > 0).map((stat: Row) => stat.mmr || 0));
  const joined: Row[] = playersWithCareers(players, careers).map((row: Row) => ({ ...row, best_mmr: row.id != null ? bestMmr(row) || null : null }));
  const base = flags.includes("unlinked") ? joined : joined.filter((row) => row.id != null);
  let filtered = base.filter((row) => !name.trim() || matchesPlayerSearch(row, name));
  if (race) filtered = filtered.filter((row) => row.race === race);
  if (seasonId) filtered = filtered.filter((row) => (row.signup_seasons || []).some((season: Row) => season.id === seasonId));
  filtered = filterByMmrRange(filtered, range, (row: Row) => row.best_mmr ?? 0);
  if (flags.length) filtered = filtered.filter((row) => flags.some((flag) => flag === "unlinked" ? row.id == null && row.career?.id != null : flag === "no_stats" ? row.id != null && !hasW3CStatsTwoSeasons(row, w3cSeason ?? 0, row.race) : row.id != null && hasLowGamesTwoSeasons(row, w3cSeason ?? 0, row.race)));
  const sorted = [...filtered].sort((a, b) => {
    const av = a[sort.key] ?? a.career?.[sort.key] ?? null;
    const bv = b[sort.key] ?? b.career?.[sort.key] ?? null;
    if (av == null) return 1; if (bv == null) return -1;
    const order = typeof av === "number" && typeof bv === "number" ? av - bv : String(av).localeCompare(String(bv), undefined, { numeric: true });
    return order * (sort.desc ? -1 : 1);
  });
  const pages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const shown = sorted.slice(Math.min(page, pages - 1) * PAGE_SIZE, (Math.min(page, pages - 1) + 1) * PAGE_SIZE);
  const count = filtered.length === base.length ? `${base.length} players` : `${filtered.length} of ${base.length} players`;

  const toggleSort = (key: string) => { setSort((old) => ({ key, desc: old.key === key ? !old.desc : false })); setPage(0); };
  const head = (label: React.ReactNode, key?: string, className = "") => <TableHead className={className}>{key ? <button type="button" className="whitespace-nowrap" onClick={() => toggleSort(key)}>{label}<Icon name={sort.key === key && sort.desc ? "mdi-arrow-down" : "mdi-arrow-up"} className={`ml-1 text-xs ${sort.key === key ? "text-primary" : "opacity-25"}`} /></button> : label}</TableHead>;
  const clear = () => { setName(""); setRace(null); chooseSeason(null); setRange([0, 3000]); setFlags([]); setPage(0); };
  const toggleFlag = (flag: Flag) => { setFlags((old) => old.includes(flag) ? old.filter((item) => item !== flag) : [...old, flag]); setPage(0); };
  const setNew = (key: string, value: unknown) => setNewPlayer((old) => ({ ...old, [key]: value }));
  const create = async () => {
    setCreating(true); setCreationError(null);
    try { await playerStore.createPlayer(newPlayer); await load(); setNewOpen(false); }
    catch (e) { setCreationError("Error creating user: " + (e as Error).message); }
    finally { setCreating(false); }
  };
  const remove = async (id?: number | string) => { try { await playerStore.deletePlayer(Number(id)); await load(); } catch (e) { console.error("Error deleting player:", e); } };
  const syncPlayer = async (id: number) => {
    setSync((old) => ({ ...old, [id]: "loading" }));
    try { const updated = await playerStore.syncW3CPlayer(id); if (updated) setPlayers((old) => playerStore.patchPlayers(old, updated)); setSync((old) => ({ ...old, [id]: "success" })); }
    catch (e) { console.error("Error syncing player:", id, e); setSync((old) => ({ ...old, [id]: "error" })); }
  };

  return <div className="p-4">
    {loading && !players.length ? <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/60" role="status" aria-label="Loading"><Icon name="mdi-loading" size={64} className="animate-spin text-primary" /></div> : null}
    <div className="flex flex-wrap items-start justify-between gap-3"><PageHeader title={<span className="inline-flex items-center gap-2"><Icon name="mdi-account-group" />Players</span>} />{isAdmin ? <Button onClick={() => { setNewPlayer(emptyPlayer()); setCreationError(null); setNewOpen(true); }}><Icon name="mdi-plus" />Add Player</Button> : null}</div>
    <FilterPanel
      seasons={seasonStore.seasons as { id: number; name: string }[]} searchName={name} onSearchNameChange={(value) => { setName(value); setPage(0); }} searchRace={race} onSearchRaceChange={(value) => { setRace(value); setPage(0); }}
      selectedSeasonFilter={seasonId} onSelectedSeasonFilterChange={chooseSeason} rangeValues={range} onRangeValuesChange={(value) => { setRange(value); setPage(0); }} extraActive={flags.length} onReset={clear} summary={<span className="text-sm text-muted-foreground">{count}</span>}
      after={<DropdownMenu><DropdownMenuTrigger render={<Button variant="outline" className="min-w-40 justify-between" />}><span className="inline-flex items-center gap-2"><Icon name="mdi-alert-outline" />{flags.length ? `${flags.length} selected` : "Show only"}</span><Icon name="mdi-chevron-down" /></DropdownMenuTrigger><DropdownMenuContent align="start">
        {([["no_stats", "No W3C stats"], ["low_games", "Less than 20 games"], ...(isAdmin ? [["unlinked", "Unlinked players"]] : [])] as [Flag, string][]).map(([value, label]) => <DropdownMenuItem key={value} onClick={(event) => { event.preventDefault(); toggleFlag(value); }}><Icon name={flags.includes(value) ? "mdi-checkbox-marked" : "mdi-checkbox-blank-outline"} />{label}</DropdownMenuItem>)}
      </DropdownMenuContent></DropdownMenu>}
    />
    <Card className="card gap-0 py-0">
      <StatusAlert modelValue={error} className="m-4" onClose={() => setError(null)} />
      {!error ? <div className="table-scroll overflow-x-auto"><Table className="tnum"><TableHeader><TableRow>
        {head("Name", "name")}{head(<W3CMmr suffix={w3cSeason ? ` (S${w3cSeason})` : ""} />, "best_mmr", WIDE)}{head("Rating", "rating", "text-right")}{head("Series", "series_winrate", "text-right")}{head("Games", "games_winrate", `${WIDE} text-right`)}{head("Seasons", "seasons_played", `${WIDE} text-right`)}{head("Events", undefined, WIDE)}{isAdmin ? <TableHead /> : null}
      </TableRow></TableHeader><TableBody>
        {shown.map((row) => <TableRow key={row.key} className={row.id != null ? "cursor-pointer" : undefined} onClick={(event) => {
          if ((event.target as Element).closest('[data-slot="tooltip-trigger"]')) return;
          if (row.id != null) router.push(playerPath(row));
        }}>
          <TableCell>{row.id != null ? <PlayerName player={row}><Warning row={row} season={w3cSeason} /></PlayerName> : <span className="text-muted-foreground">{row.name}</span>}</TableCell>
          <TableCell className={WIDE}>{row.id != null ? <RaceMmrChips player={row} w3cSeason={w3cSeason ?? undefined} max={2} /> : null}</TableCell>
          <TableCell className="text-right">{row.rating ?? "—"}</TableCell>
          <TableCell className="text-right">{row.career ? <>{row.career.series_won}-{row.career.series_lost} <span className="text-muted-foreground">{row.career.series_winrate}%</span></> : "—"}</TableCell>
          <TableCell className={`${WIDE} text-right`}>{row.career ? <>{row.career.games_won}-{row.career.games_lost} <span className="text-muted-foreground">{row.career.games_winrate}%</span></> : "—"}</TableCell>
          <TableCell className={`${WIDE} text-right`}>{row.seasons_played ?? "—"}</TableCell>
          <TableCell className={WIDE}>{row.signup_seasons?.length ? <span className="inline-flex items-center gap-1"><Badge variant="secondary" title={[...row.signup_seasons].sort((a: Row, b: Row) => b.id - a.id)[0].name} className="max-w-[120px] truncate">{[...row.signup_seasons].sort((a: Row, b: Row) => b.id - a.id)[0].name}</Badge>{row.signup_seasons.length > 1 ? <DropdownMenu><DropdownMenuTrigger render={<Button variant="outline" size="sm" onClick={(e) => e.stopPropagation()} />}>+{row.signup_seasons.length - 1}</DropdownMenuTrigger><DropdownMenuContent>{[...row.signup_seasons].sort((a: Row, b: Row) => b.id - a.id).map((season: Row) => <DropdownMenuItem key={season.id}>{season.name}</DropdownMenuItem>)}</DropdownMenuContent></DropdownMenu> : null}</span> : "—"}</TableCell>
          {isAdmin ? <TableCell onClick={(event) => event.stopPropagation()}><RowActions actions={row.id == null ? [{ icon: "mdi-history", label: "Career stats", onClick: () => careerDialog.current?.open(row.career) }] : [
            { icon: "mdi-pencil", label: "Edit", onClick: () => editDialog.current?.open(row) }, { icon: "mdi-account-check", label: "Add to season", onClick: () => signupDialog.current?.open({ player: row }) },
            { icon: sync[row.id] === "success" ? "mdi-check-circle" : sync[row.id] === "error" ? "mdi-alert-circle" : "mdi-sync", label: sync[row.id] === "success" ? "Synced" : sync[row.id] === "error" ? "Retry Sync" : "Sync W3C", color: sync[row.id] === "success" ? "success" : sync[row.id] === "error" ? "error" : undefined, loading: sync[row.id] === "loading", onClick: () => syncPlayer(row.id) },
            ...(row.career?.id != null ? [{ icon: "mdi-history", label: "Career stats", onClick: () => careerDialog.current?.open(row.career) }] : []), { icon: "mdi-delete", label: "Delete", color: "error", onClick: () => deletion.openDeleteDialog(row.id, remove) },
          ]} /></TableCell> : null}
        </TableRow>)}
        {!shown.length && !loading ? <TableRow><TableCell colSpan={isAdmin ? 8 : 7} className="py-8 text-center text-muted-foreground">No players match these filters</TableCell></TableRow> : null}
      </TableBody></Table></div> : null}
      {!error && sorted.length ? <div className="flex items-center justify-end gap-4 px-4 py-2 text-sm text-muted-foreground"><span>Items per page: {PAGE_SIZE}</span><span>{Math.min(page, pages - 1) * PAGE_SIZE + 1}-{Math.min(sorted.length, (Math.min(page, pages - 1) + 1) * PAGE_SIZE)} of {sorted.length}</span><Button variant="ghost" size="icon-sm" aria-label="Previous page" disabled={page <= 0} onClick={() => setPage((p) => Math.max(0, p - 1))}><Icon name="mdi-chevron-left" /></Button><Button variant="ghost" size="icon-sm" aria-label="Next page" disabled={page >= pages - 1} onClick={() => setPage((p) => Math.min(pages - 1, p + 1))}><Icon name="mdi-chevron-right" /></Button></div> : null}
    </Card>

    <Dialog open={newOpen} onOpenChange={setNewOpen}><DialogContent showCloseButton={false} className="max-w-[800px] gap-0 p-0 sm:max-w-[800px]"><DialogTitle className="flex items-center gap-2 bg-primary px-4 py-3 text-on-primary"><Icon name="mdi-account-plus" />Add new player</DialogTitle><div className="p-4 pb-0"><StatusAlert modelValue={creationError} onClose={() => setCreationError(null)} /></div><div className="grid gap-4 p-4 md:grid-cols-2"><Field label="Player Name" htmlFor="new-player-name"><Input id="new-player-name" value={newPlayer.name} onChange={(e) => setNew("name", e.target.value)} /></Field><Field label="BattleTag" htmlFor="new-player-battle-tag"><Input id="new-player-battle-tag" value={newPlayer.battleTag} onChange={(e) => setNew("battleTag", e.target.value)} /></Field><CountrySelect value={newPlayer.country || null} onChange={(value) => setNew("country", value || "")} /><Field label="Discord Tag" htmlFor="new-player-discord-tag"><Input id="new-player-discord-tag" value={newPlayer.discordTag} onChange={(e) => setNew("discordTag", e.target.value)} /></Field><Field label="Discord ID" htmlFor="new-player-discord-id" hint="Numeric Discord user ID (required)"><Input id="new-player-discord-id" value={newPlayer.discordId} onChange={(e) => setNew("discordId", e.target.value)} /></Field><RaceSelect value={newPlayer.race || null} onChange={(value) => setNew("race", value || "")} /></div><div className="flex justify-end gap-2 p-4 pt-0"><Button variant="ghost" onClick={() => setNewOpen(false)}>Cancel</Button>{isAdmin ? <Button disabled={creating} onClick={create}><Icon name={creating ? "mdi-loading mdi-spin" : "mdi-plus"} />Add Player</Button> : null}</div></DialogContent></Dialog>
    <EditPlayerDialog ref={editDialog} canSave={isAdmin} refresh={load} />
    <SeasonSignupDialog ref={signupDialog} onAdded={load} />
    {isAdmin ? <CareerStatsDialog ref={careerDialog} players={players} onChanged={load} /> : null}
    <ConfirmDeleteDialog modelValue={deletion.showDeleteDialog} message="Are you sure you want to delete this player? This action cannot be undone." deleteIcon="mdi-delete" canDelete={isAdmin} onConfirm={deletion.confirmDelete} onCancel={deletion.cancelDeleteDialog} onUpdateModelValue={(open) => !open && deletion.cancelDeleteDialog()} />
  </div>;
}

export default PlayersView;
