/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/ui/DataTable";
import { Icon } from "@/components/ui/Icon";
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
import { W3CMmr } from "@/components/W3CMmr";
import { W3CSyncResultDialog, type SyncEntry } from "@/components/W3CSyncResultDialog";
import { useDeleteDialog } from "@/hooks/delete-dialog";
import { PanelLinksContext } from "@/hooks/player-panel";
import { pendingPerTeam, pickOrder, pickSets } from "@/helpers/draft.mjs";
import { filterByMmrRange, matchesPlayerSearch } from "@/helpers/players.mjs";
import { raceWrapper } from "@/helpers/races";
import { getW3CMMR, syncedAgo, syncedAt } from "@/helpers/w3c-stats";
import { useAuth, useLadderStore, useSeason, useTeamStore } from "@/stores";
import { DraftMmrCell } from "./DraftMmrCell";
import { TeamPickChips } from "./TeamPickChips";
import { TeamRosterCard, type Dragging } from "./TeamRosterCard";

type Row = Record<string, any>;
// The MMR column reads the live MMR of the signup race
const mmrOf = (p: Row) => getW3CMMR(p, p.signup_race) || 0;
// { state: 'idle'|'loading'|'success'|'error', message?: string }
type SyncStatus = { state: string; message?: string };

const SYNC_ICON: Record<string, { icon: string; className: string; note?: string }> = {
  loading: { icon: "mdi-sync", className: "text-muted-foreground" },
  success: { icon: "mdi-check-circle", className: "text-success" },
  skipped: { icon: "mdi-clock-outline", className: "text-muted-foreground", note: "Synced in the last 10 minutes" },
  error: { icon: "mdi-alert-circle", className: "text-error" },
};

/** The sync state of one signup, as the icon beside his name; the player line draws the games mark */
function PlayerCues({ status }: { status?: SyncStatus }) {
  const cue = status ? SYNC_ICON[status.state] : null;
  // Only the skipped and the error cue carry text, so the other two draw a bare icon
  const cueText = cue ? (cue.note ?? (status?.state === "error" ? status.message || "Sync failed" : null)) : null;
  return (
    <>
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

// A team's roster for the season, whichever shape the read answers it in
const rosterOf = (team: Row, seasonId: number | null): Row[] => {
  const v = team?.player_by_season?.[String(seasonId)] ?? team?.player_by_season?.[Number(seasonId)];
  if (!v) return [];
  return Array.isArray(v) ? v : typeof v === "object" ? Object.values(v) : [];
};

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
  // The MMR an admin gives a player for the draft alone; the page keeps it, a reload drops it
  const [draftMmr, setDraftMmr] = useState<Record<number, number>>({});
  const [perPlayerSyncStatus, setPerPlayerSyncStatus] = useState<Record<number, SyncStatus>>({});

  const [syncDialog, setSyncDialog] = useState(false);
  const [syncEntries, setSyncEntries] = useState<SyncEntry[]>([]);

  const editPlayerDialog = useRef<EditPlayerDialogHandle>(null);
  const signupDialog = useRef<SeasonSignupDialogHandle>(null);
  const { showDeleteDialog, openDeleteDialog, confirmDelete, cancelDeleteDialog } = useDeleteDialog();

  // per-team loading state to avoid double-clicks
  const [removeLoading, setRemoveLoading] = useState<Record<string, boolean>>({});
  const [syncAllLoading, setSyncAllLoading] = useState(false);
  const [assignAllLoading, setAssignAllLoading] = useState(false);

  // The players an admin took out of the pick list
  const excludedPlayers = signedUpPlayersData.filter((p) => p.draft_excluded);

  // The pick order: the draft MMR, else the live one, ascending, and no excluded player
  const orderedPlayers: Row[] = useMemo(() => pickOrder(signedUpPlayersData, mmrOf, draftMmr), [signedUpPlayersData, draftMmr]);
  // One pick set = one player for each team
  const setSize = teams.length;

  // fetch data — prefer fetching teams for the specific season when seasonId is available.
  // After a write of this page the rosters are read fresh, past the edge copy of the teams read.
  const fetchData = async (fresh = false) => {
    const [rows] = await Promise.all([teamStore.fetchTeamsBySeason(seasonId as number, fresh), fetchSeason(seasonId as number)]);
    setTeams(rows || []);
    try {
      setSignedUpPlayersData((await fetchSeasonSignups(seasonId as number)) || []);
    } catch (err) {
      console.error("Failed to fetch season signups:", err);
      setSignedUpPlayersData([]);
    }
  };
  const refresh = () => fetchData(true);

  useEffect(() => {
    if (!seasonId) return;
    // the loaders set state, so they run just outside the effect body (react-hooks/set-state-in-effect)
    queueMicrotask(async () => {
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

  // A player who leaves the list or moves to another set loses the team ticked for them, so
  // "Assign n players" never writes a pick the admin can no longer see
  const clearPick = (player: Row) =>
    setPlayerTeamSelection((was) => {
      if (was[player.id] == null) return was;
      const next = { ...was };
      delete next[player.id];
      return next;
    });

  // A player comes back into the list with no team ticked, whichever way they go
  const setExcluded = (player: Row, draft_excluded: boolean) => {
    clearPick(player);
    return writeSignup(player, "draft_excluded", draft_excluded, { draft_excluded }, "Failed to change the pick list:");
  };

  const setPlayerDraftMmr = (player: Row, mmr: number | null) => {
    clearPick(player);
    setDraftMmr((was) => {
      const next = { ...was };
      if (mmr == null) delete next[player.id];
      else next[player.id] = mmr;
      return next;
    });
  };

  // compute assigned player ids across all teams for this season
  const assignedPlayerIds = useMemo(() => {
    const set = new Set<number>();
    teams.forEach((team) => rosterOf(team, seasonId).forEach((p: Row) => p && p.id && set.add(p.id)));
    return set;
  }, [teams, seasonId]);

  // the signups no team holds yet, in pick order
  const available: Row[] = useMemo(() => orderedPlayers.filter((p) => !assignedPlayerIds.has(p.id)), [orderedPlayers, assignedPlayerIds]);
  // The current set is the next one to draft, whatever the filters say
  const currentSet = pickSets(available, setSize).next;
  // The table holds its page while this array holds its identity, so a team pick keeps an admin on page 2
  const shownPlayers: Row[] = useMemo(() => {
    let list = available;
    if (searchName.trim().length > 0) list = list.filter((p) => matchesPlayerSearch(p, searchName));
    if (searchRace) list = list.filter((p) => p.signup_race === searchRace);
    // filter by mmr range — only apply if user changed from defaults
    return filterByMmrRange(list, rangeValues, (p: Row) => draftMmr[p.id] ?? mmrOf(p));
  }, [available, searchName, searchRace, rangeValues, draftMmr]);

  // One page is one set; the table opens on the current set and goes back to it when the order under it changes
  const [page, setPage] = useState(0);
  const pageSize = setSize || 10;
  const pageCount = Math.max(1, Math.ceil(shownPlayers.length / pageSize));
  const shownPage = Math.min(page, pageCount - 1);
  const refilter = <T,>(set: (value: T) => void) => (value: T) => {
    set(value);
    setPage(0);
  };

  // The picks that count: a ticked team on a player who stands in the list now. A pick left on a
  // player taken out of the pick list, or already on a team, is never counted nor written.
  const availableIds = new Set(available.map((p) => p.id as number));
  const picks = Object.entries(playerTeamSelection)
    .filter(([playerId, teamId]) => teamId != null && availableIds.has(Number(playerId)))
    .map(([playerId, teamId]) => [Number(playerId), teamId as number] as const);
  // Count players with team selected
  const playersWithTeamSelected = picks.length;
  const pending = pendingPerTeam(Object.fromEntries(picks), currentSet.map((p) => p.id));

  const onResetFilters = () => {
    setSearchName("");
    setSearchRace(null);
    setRangeValues([0, 3000]);
    setPage(0);
  };

  // Sort by W3C MMR descending
  const getTeamPlayersForSeason = (team: Row): Row[] => [...rosterOf(team, seasonId)].sort((a, b) => mmrOf(b) - mmrOf(a));

  // The rosters change on the page as soon as the write is through; the fresh read then confirms them
  const patchRoster = (teamId: number, change: (roster: Row[]) => Row[]) =>
    setTeams((was) => was.map((team) => (team.id !== teamId ? team : { ...team, player_by_season: { ...team.player_by_season, [String(seasonId)]: change(rosterOf(team, seasonId)) } })));

  const isRemoveLoading = (teamId: number, playerId: number) => !!removeLoading[`${teamId}_${playerId}`];

  const assignAllPlayers = async () => {
    setAssignAllLoading(true);
    setErrorMessage(null);
    try {
      // Group players by team
      const playersByTeam: Record<number, number[]> = {};
      for (const [playerId, teamId] of picks) (playersByTeam[teamId] ||= []).push(playerId);
      // Add players to each team
      for (const [teamId, playerIds] of Object.entries(playersByTeam)) {
        if (!playerIds.length) continue;
        await teamStore.addPlayersToTeamForSeason(parseInt(teamId), seasonId as number, playerIds);
        const added = signedUpPlayersData.filter((p) => playerIds.includes(p.id));
        patchRoster(parseInt(teamId), (roster) => [...roster, ...added]);
        setPlayerTeamSelection((was) => Object.fromEntries(Object.entries(was).filter(([playerId]) => !playerIds.includes(Number(playerId)))));
      }
    } catch (err) {
      console.error("Failed to assign players to teams:", err);
      setErrorMessage((err as Error).message);
    } finally {
      setPage(0);
      await refresh();
      setAssignAllLoading(false);
    }
  };

  const removePlayerFromTeam = async (teamId: number, playerId: number) => {
    setErrorMessage(null);
    setRemoveLoading((was) => ({ ...was, [`${teamId}_${playerId}`]: true }));
    try {
      await teamStore.removePlayersFromTeamForSeason(teamId, seasonId as number, [playerId]);
      patchRoster(teamId, (roster) => roster.filter((p) => p.id !== playerId));
      await refresh();
    } catch (err) {
      console.error("Failed to remove player from team:", err);
      setErrorMessage((err as Error).message);
    } finally {
      setRemoveLoading((was) => ({ ...was, [`${teamId}_${playerId}`]: false }));
    }
  };

  // A move is a remove and then an add. The backend lets a player stand on two teams of one season,
  // so the remove goes first: a failed add leaves the player in the available list, never on both.
  const movePlayer = async (player: Row, fromTeamId: number, toTeamId: number) => {
    if (fromTeamId === toTeamId) return;
    const teamName = (teamId: number) => teams.find((team) => team.id === teamId)?.name ?? "the team";
    const key = `${toTeamId}_${player.id}`;
    setErrorMessage(null);
    setRemoveLoading((was) => ({ ...was, [key]: true }));
    // the player sits in the new card at once; the fresh read afterwards confirms it
    patchRoster(fromTeamId, (roster) => roster.filter((p) => p.id !== player.id));
    patchRoster(toTeamId, (roster) => [...roster.filter((p) => p.id !== player.id), player]);
    try {
      await teamStore.removePlayersFromTeamForSeason(fromTeamId, seasonId as number, [player.id]);
      try {
        await teamStore.addPlayersToTeamForSeason(toTeamId, seasonId as number, [player.id]);
      } catch (err) {
        console.error("Failed to add the moved player:", err);
        // put the player back where they were; if that fails too, they wait in the available list
        await teamStore.addPlayersToTeamForSeason(fromTeamId, seasonId as number, [player.id]).catch(() => undefined);
        throw err;
      }
    } catch (err) {
      console.error("Failed to move the player:", err);
      setErrorMessage(`Could not move ${player.name} from ${teamName(fromTeamId)} to ${teamName(toTeamId)}: ${(err as Error).message}`);
    } finally {
      setRemoveLoading((was) => ({ ...was, [key]: false }));
      await refresh();
    }
  };
  const [dragging, setDragging] = useState<Dragging>(null);

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
      await refresh();
      setSyncAllLoading(false);
    }
  };

  const removeSignup = async (player: Row) => {
    setErrorMessage(null);
    try {
      await removeUserSignup(seasonId as number, [player.id]);
      clearPick(player);
      await refresh();
    } catch (error) {
      console.error("Failed to remove the signup:", error);
      setErrorMessage((error as Error).message);
    }
  };

  const raceName = (race: string) => raceWrapper.races.find((row: Row) => row.id === race)?.name ?? race;

  // one column list for the next set and the later sets; the order is the pick order, so no column sorts
  const columns = [
    {
      id: "name",
      accessorKey: "name",
      header: "Name",
      enableSorting: false,
      cell: ({ row }: { row: { original: Row } }) => (
        <PlayerName player={row.original} mmr={false} games>
          <PlayerCues status={perPlayerSyncStatus[row.original.id]} />
        </PlayerName>
      ),
    },
    {
      id: "w3c_mmr",
      // The head row shows the W3C mark; meta.label names the column where the mark cannot go: the stacked phone row.
      header: () => <W3CMmr />,
      meta: { label: "MMR" },
      enableSorting: false,
      cell: ({ row }: { row: { original: Row } }) => (
        <>
          <DraftMmrCell
            live={getW3CMMR(row.original, row.original.signup_race) ?? null}
            draft={draftMmr[row.original.id]}
            canEdit={auth.isAdmin}
            onChange={(mmr) => setPlayerDraftMmr(row.original, mmr)}
            player={row.original.name}
          />
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
      // the race is changed in the edit dialog; the row shows it
      cell: ({ row }: { row: { original: Row } }) =>
        row.original.signup_race ? (
          <TapTooltip content={raceName(row.original.signup_race)}>
            <RaceIcon raceIdentifier={row.original.signup_race} />
          </TapTooltip>
        ) : null,
    },
    // the table lists players no team holds yet, so the team chips are the whole column
    ...(auth.isAdmin
      ? [
          {
            id: "team",
            header: "Team",
            enableSorting: false,
            cell: ({ row }: { row: { original: Row } }) => (
              <TeamPickChips
                teams={teams as never}
                value={playerTeamSelection[row.original.id] ?? null}
                onChange={(teamId) => setPlayerTeamSelection((was) => ({ ...was, [row.original.id]: teamId }))}
                pending={pending}
                player={row.original.name}
              />
            ),
          },
        ]
      : []),
    {
      id: "actions",
      header: "",
      enableSorting: false,
      cell: ({ row }: { row: { original: Row } }) =>
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
              <Button variant="ghost" size="icon-sm" aria-label="Remove signup" onClick={() => openDeleteDialog(row.original.id, () => removeSignup(row.original))}>
                <Icon name="mdi-account-remove" />
              </Button>
            </TapTooltip>
          </div>
        ) : null,
    },
  ];

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
          <CardTitle className="flex items-center gap-2 banner bg-banner px-4 py-3 text-primary">
            <Icon name="mdi-account-multiple" />
            <span>{seasonName}</span>
          </CardTitle>
          <CardContent className="pt-3">
            {/* the season list is loaded by the guard, so a null id here is a slug that names no season */}
            <StatusAlert modelValue={errorMessage ?? (seasonId ? null : "Failed to load the season. Please try again later.")} onClose={() => setErrorMessage(null)} />
            {/* the admin's buttons share the search row, so the table starts higher on the page */}
            <FilterPanel
              actions={
                auth.isAdmin ? (
                  <>
                    {/* the bar shows only while a sync runs; an empty box takes no room */}
                    <div className="min-w-[200px] empty:hidden">
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
                  </>
                ) : null
              }
              searchName={searchName}
              onSearchNameChange={refilter(setSearchName)}
              searchRace={searchRace}
              onSearchRaceChange={refilter(setSearchRace)}
              rangeValues={rangeValues}
              onRangeValuesChange={refilter(setRangeValues)}
              showName
              showRace
              showSeason={false}
              showMMR
              showReset
              onReset={onResetFilters}
            />
          </CardContent>

          {/* One page is one pick set: the table opens on the current set and pages through the later ones */}
          <DataTable
            data={shownPlayers}
            pageSize={pageSize}
            page={shownPage}
            onPageChange={setPage}
            mobileStack
            columns={columns}
            empty="No available signed-up players for this season."
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

        <EditPlayerDialog ref={editPlayerDialog} refresh={refresh} />

        <SeasonSignupDialog ref={signupDialog} onAdded={refresh} />

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
            <TeamRosterCard
              key={team.id}
              team={team}
              players={getTeamPlayersForSeason(team)}
              canEdit={auth.isAdmin}
              dragging={dragging}
              busy={(playerId) => isRemoveLoading(team.id, playerId)}
              mmrOf={mmrOf}
              cues={(p) => <PlayerCues status={perPlayerSyncStatus[p.id]} />}
              onDragStart={(p) => setDragging({ player: p, fromTeamId: team.id })}
              onDragEnd={() => setDragging(null)}
              onMove={(p, fromTeamId, toTeamId) => {
                setDragging(null);
                movePlayer(p, fromTeamId, toTeamId);
              }}
              onRemove={(p) => removePlayerFromTeam(team.id, p.id)}
            />
          ))}
        </div>

        <W3CSyncResultDialog modelValue={syncDialog} entries={syncEntries} onUpdateModelValue={setSyncDialog} />
      </div>
    </PanelLinksContext.Provider>
  );
}

export default SeasonTeamAssignView;
