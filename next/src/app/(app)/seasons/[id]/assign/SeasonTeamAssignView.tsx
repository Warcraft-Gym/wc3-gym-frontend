/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { SortingState } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/ui/DataTable";
import { Icon } from "@/components/ui/Icon";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TapTooltip } from "@/components/ui/TapTooltip";
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";
import { EditPlayerDialog, type EditPlayerDialogHandle } from "@/components/EditPlayerDialog";
import { FilterPanel } from "@/components/FilterPanel";
import { PlayerName } from "@/components/PlayerName";
import { RaceIcon } from "@/components/RaceIcon";
import { SeasonSignupDialog, type SeasonSignupDialogHandle } from "@/components/SeasonSignupDialog";
import { StatusAlert } from "@/components/StatusAlert";
import { SyncProgress } from "@/components/SyncProgress";
import { W3CIcon } from "@/components/W3CIcon";
import { W3CSyncResultDialog, type SyncEntry } from "@/components/W3CSyncResultDialog";
import { useDeleteDialog } from "@/hooks/delete-dialog";
import { PanelLinksContext } from "@/hooks/player-panel";
import { resolveCurrentW3CSeason } from "@/helpers/current-season";
import { draftOrder } from "@/helpers/draft.mjs";
import { filterByMmrRange, matchesPlayerSearch } from "@/helpers/players.mjs";
import { raceWrapper } from "@/helpers/races";
import { getW3CGamesCount, getW3CMMR, hasLowGamesTwoSeasons, hasW3CStatsTwoSeasons, syncedAgo, syncedAt } from "@/helpers/w3c-stats";
import { useAuth, useLadderStore, useSeason, useTeamStore } from "@/stores";

type Row = Record<string, any>;
// { state: 'idle'|'loading'|'success'|'error', message?: string }
type SyncStatus = { state: string; message?: string };

// The helpers are plain JS, so their defaults type the parameters; the seam names the real shapes.
const hasStats = hasW3CStatsTwoSeasons as (player: Row, currentSeason?: number, race?: string | null) => boolean;
const hasLowGames = hasLowGamesTwoSeasons as (player: Row, currentSeason?: number, race?: string | null) => boolean;
const gamesCount = getW3CGamesCount as (player: Row, currentSeason?: number, race?: string | null) => number;

const SYNC_ICON: Record<string, { icon: string; className: string; note?: string }> = {
  loading: { icon: "mdi-sync", className: "text-muted-foreground" },
  success: { icon: "mdi-check-circle", className: "text-success" },
  skipped: { icon: "mdi-clock-outline", className: "text-muted-foreground", note: "Synced in the last 10 minutes" },
  error: { icon: "mdi-alert-circle", className: "text-error" },
};

/** The W3C warnings and the sync state of one signup, as the icons that ride beside his name. */
function PlayerCues({ player, w3cSeason, status }: { player: Row; w3cSeason?: number; status?: SyncStatus }) {
  const cue = status ? SYNC_ICON[status.state] : null;
  // Only the skipped and the error cue carry text, so the other two draw a bare icon
  const cueText = cue ? (cue.note ?? (status?.state === "error" ? status.message || "Sync failed" : null)) : null;
  return (
    <>
      {!hasStats(player, w3cSeason, player.signup_race) ? (
        <TapTooltip content={`No W3C stats found for ${player.signup_race}`}>
          <Icon name="mdi-alert" size={16} className="text-error" />
        </TapTooltip>
      ) : hasLowGames(player, w3cSeason, player.signup_race) ? (
        <TapTooltip content={`Less than 20 games (${gamesCount(player, w3cSeason, player.signup_race)} games) for ${player.signup_race}`}>
          <Icon name="mdi-alert" size={16} className="text-warning" />
        </TapTooltip>
      ) : null}
      {cue ? (
        cueText ? (
          <TapTooltip content={cueText}>
            <Icon name={cue.icon} size={16} className={cue.className} />
          </TapTooltip>
        ) : (
          <Icon name={cue.icon} size={16} className={cue.className} />
        )
      ) : null}
    </>
  );
}

export function SeasonTeamAssignView({ id }: { id: string }) {
  const auth = useAuth();
  const ladderStore = useLadderStore();
  const teamStore = useTeamStore();
  const { current_season, seasonIdOf, fetchSeason, updateSeasonSignup, removeUserSignup, fetchSeasonSignups } = useSeason();

  const seasonId = seasonIdOf(id);
  const seasonName = current_season?.name || "";

  const [teams, setTeams] = useState<Row[]>([]);
  // Local state for signed up players
  const [signedUpPlayersData, setSignedUpPlayersData] = useState<Row[]>([]);
  // Every write on this page reports its failure here
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [searchName, setSearchName] = useState("");
  const [searchRace, setSearchRace] = useState<string | null>(null);
  const [rangeValues, setRangeValues] = useState([0, 3000]);

  // Track team selection per player
  const [playerTeamSelection, setPlayerTeamSelection] = useState<Record<number, number | null>>({});
  const [perPlayerSyncStatus, setPerPlayerSyncStatus] = useState<Record<number, SyncStatus>>({});

  const [syncDialog, setSyncDialog] = useState(false);
  const [syncEntries, setSyncEntries] = useState<SyncEntry[]>([]);

  const editPlayerDialog = useRef<EditPlayerDialogHandle>(null);
  const signupDialog = useRef<SeasonSignupDialogHandle>(null);
  const { showDeleteDialog, openDeleteDialog, confirmDelete, cancelDeleteDialog } = useDeleteDialog();

  // Current W3C season for stats fallback
  const [currentW3CSeason, setCurrentW3CSeason] = useState<number | undefined>(undefined);

  // per-team loading state to avoid double-clicks
  const [removeLoading, setRemoveLoading] = useState<Record<string, boolean>>({});
  const [syncAllLoading, setSyncAllLoading] = useState(false);
  const [assignAllLoading, setAssignAllLoading] = useState(false);

  // The draft order, so a reversed sort keeps the moved players in place
  const [sorting, setSorting] = useState<SortingState>([{ id: "w3c_mmr", desc: false }]);

  const mmrOf = useCallback((p: Row) => getW3CMMR(p, currentW3CSeason, p.signup_race) || 0, [currentW3CSeason]);

  // The players an admin took out of the pick list
  const excludedPlayers = signedUpPlayersData.filter((p) => p.draft_excluded);

  // The draft order: MMR ascending, each moved player at his slot, no excluded player
  const orderedPlayers: Row[] = useMemo(() => draftOrder(signedUpPlayersData, mmrOf), [signedUpPlayersData, mmrOf]);
  const positionOf = new Map<number, number>(orderedPlayers.map((p, i) => [p.id, i]));
  // One round = one pick per team
  const roundSize = teams.length || 10;
  const rounds = Array.from({ length: Math.ceil(orderedPlayers.length / roundSize) }, (_, i) => i + 1);
  const roundOf = (p: Row) => Math.floor((positionOf.get(p.id) ?? 0) / roundSize) + 1;

  // fetch data — prefer fetching teams for the specific season when seasonId is available
  const fetchData = async () => {
    const [rows] = await Promise.all([teamStore.fetchTeamsBySeason(seasonId as number), fetchSeason(seasonId as number)]);
    setTeams(rows || []);
    try {
      setSignedUpPlayersData((await fetchSeasonSignups(seasonId as number)) || []);
    } catch (err) {
      console.error("Failed to fetch season signups:", err);
      setSignedUpPlayersData([]);
    }
  };

  useEffect(() => {
    if (!seasonId) return;
    // the loaders set state, so they run just outside the effect body (react-hooks/set-state-in-effect)
    queueMicrotask(async () => {
      setCurrentW3CSeason((await resolveCurrentW3CSeason()) ?? undefined);
      await fetchData();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seasonId]);

  // The row moves at once and rolls back when the write is refused, so it never shows a value the server rejected
  const writeSignup = async (player: Row, field: string, value: unknown, fields: Row, message: string) => {
    const before = player[field];
    const patch = (to: unknown) => setSignedUpPlayersData((was) => was.map((row) => (row.id === player.id ? { ...row, [field]: to } : row)));
    patch(value);
    setErrorMessage(null);
    try {
      await updateSeasonSignup(seasonId as number, player.id, fields);
    } catch (error) {
      console.error(message, error);
      patch(before);
      setErrorMessage((error as Error).message);
    }
  };

  const setExcluded = (player: Row, draft_excluded: boolean) =>
    writeSignup(player, "draft_excluded", draft_excluded, { draft_excluded }, "Failed to change the pick list:");

  const setDraftPosition = (player: Row, draft_position: number | null) =>
    writeSignup(player, "draft_position", draft_position, { draft_position }, "Failed to move the player:");
  const moveToRound = (player: Row, round: number) => setDraftPosition(player, (round - 1) * roundSize);

  // The race the MMR, the icon and the race filters read
  const setSignupRace = (player: Row, race: string | null) => {
    if (!race) return Promise.resolve();
    return writeSignup(player, "signup_race", race, { race }, "Failed to set the race:");
  };

  // compute assigned player ids across all teams for this season
  const assignedPlayerIds = useMemo(() => {
    const sid = String(seasonId);
    const set = new Set<number>();
    teams.forEach((team) => {
      const v = team.player_by_season?.[sid] || team.player_by_season?.[Number(sid)];
      if (!v) return;
      if (Array.isArray(v)) v.forEach((p: Row) => p && p.id && set.add(p.id));
      else if (typeof v === "object") Object.values(v).forEach((p: any) => p && p.id && set.add(p.id));
    });
    return set;
  }, [teams, seasonId]);

  // available players = signed up players in draft order, minus assigned players
  // The table holds its page while this array holds its identity, so a team pick keeps an admin on page 2
  const availablePlayers: Row[] = useMemo(() => {
    let list = orderedPlayers;
    if (searchName.trim().length > 0) list = list.filter((p) => matchesPlayerSearch(p, searchName));
    if (searchRace) list = list.filter((p) => p.signup_race === searchRace);
    // filter by mmr range — only apply if user changed from defaults
    return filterByMmrRange(list, rangeValues, mmrOf).filter((p: Row) => !assignedPlayerIds.has(p.id));
  }, [orderedPlayers, searchName, searchRace, rangeValues, mmrOf, assignedPlayerIds]);

  // Count players with team selected
  const playersWithTeamSelected = Object.values(playerTeamSelection).filter((teamId) => teamId != null).length;

  const onResetFilters = async () => {
    setSearchName("");
    setSearchRace(null);
    setRangeValues([0, 3000]);
    // refresh available players after clearing filters
    await fetchData();
  };

  const getTeamPlayersForSeason = (team: Row): Row[] => {
    const sid = String(seasonId);
    if (!team || !team.player_by_season) return [];
    const v = team.player_by_season[sid] || team.player_by_season[Number(sid)];
    if (!v) return [];
    const teamPlayers: Row[] = Array.isArray(v) ? v : typeof v === "object" ? Object.values(v) : [];
    // Sort by W3C MMR descending
    return [...teamPlayers].sort((a, b) => mmrOf(b) - mmrOf(a));
  };

  const isRemoveLoading = (teamId: number, playerId: number) => !!removeLoading[`${teamId}_${playerId}`];

  const assignAllPlayers = async () => {
    setAssignAllLoading(true);
    setErrorMessage(null);
    try {
      // Group players by team
      const playersByTeam: Record<number, number[]> = {};
      for (const [playerId, teamId] of Object.entries(playerTeamSelection)) {
        if (teamId != null) (playersByTeam[teamId] ||= []).push(parseInt(playerId));
      }
      // Add players to each team
      for (const [teamId, playerIds] of Object.entries(playersByTeam)) {
        if (playerIds.length > 0) await teamStore.addPlayersToTeamForSeason(parseInt(teamId), seasonId as number, playerIds);
      }
      // Clear selections and refresh
      setPlayerTeamSelection({});
      await fetchData();
    } catch (err) {
      console.error("Failed to assign players to teams:", err);
      setErrorMessage((err as Error).message);
    } finally {
      setAssignAllLoading(false);
    }
  };

  const removePlayerFromTeam = async (teamId: number, playerId: number) => {
    setErrorMessage(null);
    setRemoveLoading((was) => ({ ...was, [`${teamId}_${playerId}`]: true }));
    try {
      await teamStore.removePlayersFromTeamForSeason(teamId, seasonId as number, [playerId]);
      await fetchData();
    } catch (err) {
      console.error("Failed to remove player from team:", err);
      setErrorMessage((err as Error).message);
    } finally {
      setRemoveLoading((was) => ({ ...was, [`${teamId}_${playerId}`]: false }));
    }
  };

  // sync every player signed up to the season, one chunk of players per request
  const syncAllDraftPlayers = async () => {
    setSyncAllLoading(true);
    setErrorMessage(null);
    const list = orderedPlayers;
    setPerPlayerSyncStatus(Object.fromEntries(list.map((p) => [p.id, { state: "loading" }])));
    try {
      const result = await ladderStore.syncSeason(seasonId as number);
      const status: Record<number, SyncStatus> = {};
      for (const syncedId of result.synced ?? []) status[syncedId as number] = { state: "success" };
      for (const skippedId of result.skipped ?? []) status[skippedId as number] = { state: "skipped" };
      for (const f of result.failed ?? []) status[f.id as number] = { state: "error", message: f.reason };
      setPerPlayerSyncStatus(status);
      setSyncEntries([{ title: seasonName, result }]);
      setSyncDialog(true);
    } catch (err) {
      console.error("Failed to sync season players:", err);
      setErrorMessage((err as Error).message);
      setPerPlayerSyncStatus(Object.fromEntries(list.map((p) => [p.id, { state: "error", message: (err as Error).message }])));
    } finally {
      await fetchData();
      setSyncAllLoading(false);
    }
  };

  const removeSignup = async (player: Row) => {
    setErrorMessage(null);
    try {
      await removeUserSignup(seasonId as number, [player.id]);
      await fetchData();
    } catch (error) {
      console.error("Failed to remove the signup:", error);
      setErrorMessage((error as Error).message);
    }
  };

  const teamItems = teams.map((team) => ({ value: team.id as number, label: team.name as string }));

  // a drafting page: a name opens the panel, so the roster ticks survive
  return (
    <PanelLinksContext.Provider value>
      <div className="p-4">
        {/* Page Header */}
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <h1 className="flex flex-1 items-center gap-2">
            <Icon name="mdi-account-multiple-check" />
            Draft Players for Season
          </h1>
          <Button variant="ghost" nativeButton={false} render={<Link href={`/seasons/${id}`} />}>
            <Icon name="mdi-arrow-left" />
            Back to season
          </Button>
        </div>

        {/* Top: Filters + Draft players for season */}
        <Card className="card mb-4 gap-0 py-0">
          <CardTitle className="flex items-center gap-2 bg-primary px-4 py-3 text-on-primary">
            <Icon name="mdi-account-multiple" />
            <span>{seasonName}</span>
          </CardTitle>
          {auth.isAdmin ? (
            <div className="flex flex-wrap items-center justify-end gap-2 p-2">
              <div className="min-w-[240px]">
                <SyncProgress />
              </div>
              <TapTooltip content="MMR and ladder matches">
                <Button onClick={syncAllDraftPlayers} disabled={syncAllLoading}>
                  {syncAllLoading ? <Icon name="mdi-loading mdi-spin" /> : <W3CIcon size={18} />}
                  Sync W3C
                </Button>
              </TapTooltip>
              <Button onClick={() => signupDialog.current?.open({ season: { id: seasonId as number, name: seasonName } })}>
                <Icon name="mdi-account-plus" />
                Add signup
              </Button>
            </div>
          ) : null}

          <CardContent className="pt-4">
            <StatusAlert modelValue={errorMessage} onClose={() => setErrorMessage(null)} />
            <FilterPanel
              searchName={searchName}
              onSearchNameChange={setSearchName}
              searchRace={searchRace}
              onSearchRaceChange={setSearchRace}
              rangeValues={rangeValues}
              onRangeValuesChange={setRangeValues}
              showName
              showRace
              showSeason={false}
              showMMR
              showReset
              onReset={onResetFilters}
            />
          </CardContent>

          {/* One page is one round, so the table starts over when the team count arrives */}
          <DataTable
            key={roundSize}
            data={availablePlayers}
            pageSize={roundSize}
            mobileStack
            sorting={sorting}
            onSortingChange={setSorting}
            empty="No available signed-up players for this season."
            columns={[
              {
                id: "name",
                accessorKey: "name",
                header: "Name",
                cell: ({ row }) => (
                  <PlayerName player={row.original}>
                    <PlayerCues player={row.original} w3cSeason={currentW3CSeason} status={perPlayerSyncStatus[row.original.id]} />
                  </PlayerName>
                ),
              },
              {
                id: "w3c_mmr",
                accessorFn: (row: Row) => positionOf.get(row.id) ?? 0,
                // A stacked phone row reads this title off the cell, so the title is a string
                header: "MMR",
                cell: ({ row }) => (
                  <>
                    <div className="tnum">{getW3CMMR(row.original, currentW3CSeason, row.original.signup_race) ?? "N/A"}</div>
                    <TapTooltip className="text-xs text-muted-foreground" content={syncedAt(row.original)}>
                      {syncedAgo(row.original)}
                    </TapTooltip>
                  </>
                ),
              },
              {
                id: "race",
                header: "Race",
                enableSorting: false,
                cell: ({ row }) =>
                  auth.isAdmin ? (
                    <Select
                      items={raceWrapper.races.map((race: Row) => ({ value: race.id, label: race.name }))}
                      value={row.original.signup_race ?? null}
                      onValueChange={(value) => setSignupRace(row.original, value as string | null)}
                    >
                      <SelectTrigger size="sm" aria-label="Race" className="w-[140px]">
                        <SelectValue placeholder="Race" />
                      </SelectTrigger>
                      <SelectContent>
                        {raceWrapper.races.map((race: Row) => (
                          <SelectItem key={race.id} value={race.id}>
                            <RaceIcon raceIdentifier={race.id} /> {race.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : row.original.signup_race ? (
                    <RaceIcon raceIdentifier={row.original.signup_race} />
                  ) : null,
              },
              {
                id: "round",
                header: "Round",
                enableSorting: false,
                cell: ({ row }) => (
                  <div className="flex items-center gap-1">
                    {auth.isAdmin ? (
                      <Select
                        items={rounds.map((round) => ({ value: round, label: String(round) }))}
                        value={roundOf(row.original)}
                        onValueChange={(value) => moveToRound(row.original, Number(value))}
                      >
                        <SelectTrigger size="sm" aria-label="Round" className="w-16">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {rounds.map((round) => (
                            <SelectItem key={round} value={round}>
                              {round}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <span className="tnum">{roundOf(row.original)}</span>
                    )}
                    {auth.isAdmin && row.original.draft_position != null ? (
                      <TapTooltip content="Moved by hand. Click to sort by MMR again">
                        <Button variant="ghost" size="icon-sm" aria-label="Sort by MMR again" onClick={() => setDraftPosition(row.original, null)}>
                          <Icon name="mdi-pin-off" />
                        </Button>
                      </TapTooltip>
                    ) : row.original.draft_position != null ? (
                      <TapTooltip content="Moved by hand">
                        <Icon name="mdi-pin" size={16} />
                      </TapTooltip>
                    ) : null}
                  </div>
                ),
              },
              // the table lists players no team holds yet, so the picker is the whole column
              ...(auth.isAdmin
                ? [
                    {
                      id: "team",
                      header: "Team",
                      enableSorting: false,
                      cell: ({ row }: { row: { original: Row } }) => (
                        <div className="flex items-center gap-1">
                          <Select
                            items={teamItems}
                            value={playerTeamSelection[row.original.id] ?? null}
                            onValueChange={(value) => setPlayerTeamSelection((was) => ({ ...was, [row.original.id]: value as number | null }))}
                          >
                            <SelectTrigger size="sm" aria-label="Team" className="w-full min-w-[150px]">
                              {/* the trigger shows the team or nothing; the column title names it */}
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {teamItems.map((team) => (
                                <SelectItem key={team.value} value={team.value}>
                                  {team.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {playerTeamSelection[row.original.id] != null ? (
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              aria-label="Clear the team"
                              onClick={() => setPlayerTeamSelection((was) => ({ ...was, [row.original.id]: null }))}
                            >
                              <Icon name="mdi-close" />
                            </Button>
                          ) : null}
                        </div>
                      ),
                    },
                  ]
                : []),
              {
                id: "actions",
                header: "",
                enableSorting: false,
                cell: ({ row }) =>
                  auth.isAdmin ? (
                    <div className="flex justify-end">
                      <Button variant="ghost" size="icon-sm" aria-label="Edit player" onClick={() => editPlayerDialog.current?.open(row.original)}>
                        <Icon name="mdi-pencil" />
                      </Button>
                      <TapTooltip content="Take out of the pick list">
                        <Button variant="ghost" size="icon-sm" aria-label="Take out of the pick list" onClick={() => setExcluded(row.original, true)}>
                          <Icon name="mdi-account-off" />
                        </Button>
                      </TapTooltip>
                      <TapTooltip content="Remove signup">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label="Remove signup"
                          onClick={() => openDeleteDialog(row.original.id, () => removeSignup(row.original))}
                        >
                          <Icon name="mdi-account-remove" />
                        </Button>
                      </TapTooltip>
                    </div>
                  ) : null,
              },
            ]}
          />

          {excludedPlayers.length ? (
            <CardContent className="pt-2 pb-0">
              <div className="mb-1 text-xs text-muted-foreground">Out of the pick list ({excludedPlayers.length})</div>
              <div className="flex flex-wrap gap-2">
                {excludedPlayers.map((p) => (
                  <Badge key={p.id} variant="secondary">
                    {p.signup_race ? <RaceIcon raceIdentifier={p.signup_race} /> : null}
                    {p.name}
                    {auth.isAdmin ? (
                      <TapTooltip content="Put back in the pick list">
                        <button type="button" aria-label={`Put ${p.name} back in the pick list`} onClick={() => setExcluded(p, false)}>
                          <Icon name="mdi-undo" />
                        </button>
                      </TapTooltip>
                    ) : null}
                  </Badge>
                ))}
              </div>
            </CardContent>
          ) : null}

          {auth.isAdmin ? (
            <CardContent className="px-4 py-4">
              <Button onClick={assignAllPlayers} disabled={assignAllLoading || playersWithTeamSelected === 0}>
                <Icon name={assignAllLoading ? "mdi-loading mdi-spin" : "mdi-account-multiple-plus"} />
                {`Assign ${playersWithTeamSelected} player${playersWithTeamSelected === 1 ? "" : "s"} to teams`}
              </Button>
            </CardContent>
          ) : null}
        </Card>

        <EditPlayerDialog ref={editPlayerDialog} refresh={fetchData} />

        <SeasonSignupDialog ref={signupDialog} onAdded={fetchData} />

        <ConfirmDeleteDialog
          modelValue={showDeleteDialog}
          message="Remove this player's signup for the season?"
          deleteIcon="mdi-account-remove"
          onUpdateModelValue={(open) => (open ? undefined : cancelDeleteDialog())}
          onConfirm={confirmDelete}
          onCancel={cancelDeleteDialog}
        />

        {/* Teams grid below */}
        <h2 className="mb-4 flex items-center gap-2">
          <Icon name="mdi-shield-account" />
          Team assignments
        </h2>
        {/* as many team cards as fit the window, so the page never scrolls sideways */}
        <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-3">
          {teams.map((team) => (
            <Card key={team.id} className="card gap-0 py-0">
              <CardTitle className="flex items-center gap-2 bg-primary px-4 py-3 text-on-primary">
                <Icon name="mdi-shield-account" />
                {team.name}
              </CardTitle>
              <CardContent className="py-3">
                {getTeamPlayersForSeason(team).length ? (
                  getTeamPlayersForSeason(team).map((p) => (
                    <div key={p.id} className="flex items-center justify-between py-1.5">
                      <div>
                        <div className="flex items-center gap-2">
                          <PlayerName player={p} />
                          <PlayerCues player={p} w3cSeason={currentW3CSeason} status={perPlayerSyncStatus[p.id]} />
                        </div>
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <span className="tnum">{getW3CMMR(p, currentW3CSeason, p.signup_race) ?? "N/A"}</span>
                          {p.signup_race ? (
                            <>
                              <span>—</span>
                              <RaceIcon raceIdentifier={p.signup_race} />
                            </>
                          ) : null}
                        </div>
                        <TapTooltip className="text-xs text-muted-foreground" content={syncedAt(p)}>
                          {syncedAgo(p)}
                        </TapTooltip>
                      </div>
                      {auth.isAdmin ? (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label="Remove from the team"
                          className="text-error"
                          disabled={isRemoveLoading(team.id, p.id)}
                          onClick={() => removePlayerFromTeam(team.id, p.id)}
                        >
                          <Icon name={isRemoveLoading(team.id, p.id) ? "mdi-loading mdi-spin" : "mdi-delete"} />
                        </Button>
                      ) : null}
                    </div>
                  ))
                ) : (
                  <em className="text-muted-foreground">No players assigned for this season</em>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        <W3CSyncResultDialog modelValue={syncDialog} entries={syncEntries} onUpdateModelValue={setSyncDialog} />
      </div>
    </PanelLinksContext.Provider>
  );
}

export default SeasonTeamAssignView;
