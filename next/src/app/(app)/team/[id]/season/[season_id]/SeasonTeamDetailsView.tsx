/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Combobox } from "@/components/ui/Combobox";
import { DataTable } from "@/components/ui/DataTable";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Icon } from "@/components/ui/Icon";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TapTooltip } from "@/components/ui/TapTooltip";
import { toneClass } from "@/components/ui/tone";
import { AchievementChip } from "@/components/AchievementChip";
import { ColumnNote } from "@/components/ColumnNote";
import { FilterPanel } from "@/components/FilterPanel";
import { PlayerName } from "@/components/PlayerName";
import { RaceIcon } from "@/components/RaceIcon";
import { RowActions } from "@/components/RowActions";
import { StatusAlert } from "@/components/StatusAlert";
import { PlayedAs } from "@/components/PlayedAs";
import { TeamRoster } from "@/components/TeamRoster";
import { W3CIcon } from "@/components/W3CIcon";
import { W3CMmr } from "@/components/W3CMmr";
import { W3CSyncResultDialog, type SyncEntry } from "@/components/W3CSyncResultDialog";
import { MD_AND_UP, useBreakpoint } from "@/hooks/breakpoint";
import { ACHIEVEMENTS_NOTE, LADDER_NOTE, POINTS_NOTES, SCORED_NOTE } from "@/helpers/achievements";
import { resolveCurrentW3CSeason } from "@/helpers/current-season";
import { eventLabel } from "@/helpers/event-labels.mjs";
import { filterByMmrRange, matchesPlayerSearch, playerPath } from "@/helpers/players.mjs";
import { rosterOf } from "@/helpers/team-roster.mjs";
import { agoFromIso, getW3CMMR, localFromIso, syncedAgo, syncedAt } from "@/helpers/w3c-stats";
import { useAuth, useLadderStore, usePlayerStore, useSeason, useTeamStore } from "@/stores";

type Row = Record<string, any>;
const pointsNotes = POINTS_NOTES as Record<string, string>;

// A player still in his placement games has no MMR, so there is no span to subtract
const ladderMmrDiff = (row: Row) => (row.mmr?.current != null && row.mmr?.start != null ? row.mmr.current - row.mmr.start : null);

const diffClass = (diff: number | null) => (diff == null ? "" : diff > 0 ? "text-win" : diff < 0 ? "text-loss" : "");

export function SeasonTeamDetailsView({ id, seasonKey }: { id: string; seasonKey: string }) {
  const auth = useAuth();
  const teamStore = useTeamStore();
  const playerStore = usePlayerStore();
  const ladderStore = useLadderStore();
  const { seasons, seasonIdOf, fetchSeasonSignups } = useSeason();

  const teamId = Number(id);
  const seasonId = seasonIdOf(seasonKey);
  const mdAndUp = useBreakpoint(MD_AND_UP);

  const [team, setTeam] = useState<Row | null>(null);
  const [players, setPlayers] = useState<Row[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [currentW3CSeason, setCurrentW3CSeason] = useState<number | undefined>(undefined);

  // The Add Player dialog pool: season signups, carrying signup_race and MMR stats
  const [seasonSignups, setSeasonSignups] = useState<Row[]>([]);
  const [showNewPlayerModal, setShowNewPlayerModal] = useState(false);
  const [selectedPlayers, setSelectedPlayers] = useState<number[]>([]);

  const [captainIds, setCaptainIds] = useState<number[]>([]);
  const [discordRoleMissing, setDiscordRoleMissing] = useState<string[]>([]);
  const [isSavingCaptains, setIsSavingCaptains] = useState(false);
  const [allAvailableUsers, setAllAvailableUsers] = useState<Row[]>([]);

  const [seasonLadder, setSeasonLadder] = useState<Row | null>(null);
  const [syncDialog, setSyncDialog] = useState(false);
  const [syncEntries, setSyncEntries] = useState<SyncEntry[]>([]);

  const [searchName, setSearchName] = useState("");
  const [searchRace, setSearchRace] = useState<string | null>(null);
  const [rangeValues, setRangeValues] = useState([0, 3000]);

  // The rounds grid takes a captain of this team, or any admin
  const canSetRounds = auth.isCaptainOf(teamId, seasonId as number);

  // The season under the team name, named the way every other page names an event
  const seasonRow = seasons.find((row: Row) => row.id === seasonId);
  const seasonLabel = seasonRow ? eventLabel(seasonRow) : "";

  // Season info for the currently viewed season
  const currentSeasonInfo = team?.seasons_info ? team.seasons_info.find((s: Row) => s.season_id === seasonId) ?? team.seasons_info[0] : null;

  const seasonCaptains: Row[] = rosterOf(team, seasonId).captains;
  const chosenCaptains = captainIds.map((captainId) => allAvailableUsers.find((user) => user.id === captainId) ?? { id: captainId, name: String(captainId) });

  const ladderTeam: Row | null = (seasonLadder?.teams ?? []).find((t: Row) => String(t.id) === String(teamId)) ?? null;

  // The card is as synced as its least synced player, and says so when one is behind
  const ladderSyncedAt = (() => {
    const stamps = (ladderTeam?.players ?? []).map((player: Row) => player.synced_at).filter(Boolean);
    return seasonLadder?.season?.synced_at ?? stamps.sort()[0] ?? null;
  })();

  const ladderSyncCaption = (() => {
    const ladderPlayers: Row[] = ladderTeam?.players ?? [];
    const synced = ladderPlayers.filter((player) => player.synced_at).length;
    if (!synced) return "never synced";
    if (synced < ladderPlayers.length) return `partly synced · ${synced} of ${ladderPlayers.length} players`;
    const ago = agoFromIso(ladderSyncedAt);
    return ago === "never synced" ? ago : `synced ${ago}`;
  })();

  // The teams of the answer are ordered by ladder points
  const ladderRank = (seasonLadder?.teams ?? []).findIndex((t: Row) => String(t.id) === String(teamId)) + 1;

  const fetchTeam = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const loaded = await teamStore.fetchTeamBySeason(teamId, seasonId as number);
      setTeam(loaded);
      if (!loaded) setErrorMessage("No team information found.");
      setPlayers(rosterOf(loaded, seasonId).members);
      // Load ALL users for captain selection (captains can be anyone, not just season players)
      const users = (await playerStore.fetchPlayers()) || [];
      setAllAvailableUsers(users);
      // Initialize captain selections based on current captains (order is preserved)
      setCaptainIds(rosterOf(loaded, seasonId).captains.map((captain: Row) => captain.id));
      return loaded;
    } catch (error) {
      console.error(error);
      setErrorMessage("Failed to load team. Please try again later.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!seasonId) return;
    // the loaders set state, so they run just outside the effect body (react-hooks/set-state-in-effect)
    queueMicrotask(async () => {
      setCurrentW3CSeason((await resolveCurrentW3CSeason()) ?? undefined);
      await fetchTeam();
      try {
        setSeasonLadder(await ladderStore.seasonLadder(seasonId));
      } catch (error) {
        console.error("Failed to load the ladder of the season:", error);
        setSeasonLadder(null);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seasonId, teamId]);

  const fetchAllPlayers = async () => {
    try {
      setSeasonSignups((await fetchSeasonSignups(seasonId as number)) || []);
    } catch (error) {
      console.error("Failed to fetch players:", error);
    } finally {
      setIsLoading(false);
      setSearchName("");
      setSearchRace(null);
      setRangeValues([0, 3000]);
    }
  };

  const openNewPlayerModal = () => {
    setShowNewPlayerModal(true);
    fetchAllPlayers();
  };

  const saveCaptains = async () => {
    setIsSavingCaptains(true);
    try {
      const saved = await teamStore.setCaptains(teamId, seasonId as number, captainIds);
      // Refresh team data to show updated captain status
      await fetchTeam();
      setDiscordRoleMissing(saved?.discord_role_missing || []);
    } catch (error) {
      console.error("Failed to save captains:", error);
      setErrorMessage("Failed to save captains. Please try again.");
    } finally {
      setIsSavingCaptains(false);
    }
  };

  const saveSelectedPlayers = async () => {
    try {
      await teamStore.addPlayersToTeamForSeason(teamId, seasonId as number, selectedPlayers);
      setSelectedPlayers([]);
      await fetchTeam();
      setShowNewPlayerModal(false);
    } catch (error) {
      console.error("Failed to save selected players:", error);
    }
  };

  const removePlayerFromTeam = async (playerId: number) => {
    if (!confirm("Remove this player from the team?")) return;
    try {
      await teamStore.removePlayersFromTeamForSeason(teamId, seasonId as number, [playerId]);
      await fetchTeam();
    } catch (error) {
      console.error("Error removing player:", error);
    }
  };

  const syncW3CTeam = async () => {
    setIsLoading(true);
    setSyncEntries([]);
    setSyncDialog(true);
    try {
      setSyncEntries([{ title: team?.name ?? "Team", result: await teamStore.syncPlayersW3C(teamId, seasonId as number) }]);
      await fetchTeam();
    } catch (error) {
      console.error("Error syncing W3C data:", error);
      setSyncEntries([{ title: team?.name ?? "Team", error: error as Error }]);
    } finally {
      setIsLoading(false);
    }
  };

  // The dialog table holds its page while this array holds its identity, so a tick keeps the page
  const filteredAllPlayers: Row[] = useMemo(() => {
    let list = seasonSignups;
    if (searchName.trim().length > 0) list = list.filter((p) => matchesPlayerSearch(p, searchName));
    if (searchRace) list = list.filter((p) => p.signup_race === searchRace);
    // filter by mmr range — only apply if user changed from defaults
    return filterByMmrRange(list, rangeValues, (p: Row) => Number(getW3CMMR(p, currentW3CSeason, p.signup_race) ?? 0));
  }, [seasonSignups, searchName, searchRace, rangeValues, currentW3CSeason]);

  const syncCell = (row: Row) => (
    <TapTooltip className="text-xs text-muted-foreground" content={syncedAt(row)}>
      {syncedAgo(row)}
    </TapTooltip>
  );

  return (
    <div className="p-4">
      {isLoading ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/60">
          <Icon name="mdi-loading" size={64} className="animate-spin text-primary" />
        </div>
      ) : null}

      {/* Page Header: the team, and the season it is read in */}
      <div className="mb-4">
        <h1 className="flex items-center gap-2">
          <Icon name="mdi-shield-account" />
          {team?.name || "Team"}
        </h1>
        {seasonLabel ? <div className="mt-1 text-muted-foreground">{seasonLabel}</div> : null}
      </div>

      {/* the season list is loaded by the guard, so a null id here is a slug that names no season */}
      <StatusAlert modelValue={errorMessage ?? (seasonId ? null : "Failed to load team. Please try again later.")} onClose={() => setErrorMessage(null)} />

      {/* Team Overview */}
      {team ? (
        <Card className="card mb-4 gap-0 py-0">
          <CardTitle className="flex items-center gap-2 bg-primary px-4 py-3 text-on-primary">
            <Icon name="mdi-shield-account" />
            <span>Season points</span>
          </CardTitle>
          {currentSeasonInfo ? (
            <CardContent className="py-4">
              <p>
                <strong>
                  <ColumnNote title="Points:" note={pointsNotes["Points"]} />
                </strong>{" "}
                <span className="tnum">{currentSeasonInfo.final_score}</span>
              </p>
              <p>
                <strong>
                  <ColumnNote title="Points against:" note={pointsNotes["Points against"]} />
                </strong>{" "}
                <span className="tnum">{currentSeasonInfo.points_against}</span>
              </p>
              <p>
                <strong>
                  <ColumnNote title="Points available:" note={pointsNotes["Points available"]} />
                </strong>{" "}
                <span className="tnum">{currentSeasonInfo.points_available}</span>
              </p>
            </CardContent>
          ) : null}
        </Card>
      ) : null}

      {/* Ladder */}
      {ladderTeam ? (
        <Card className="card mb-4 gap-0 py-0">
          <CardTitle className="flex items-center gap-2 bg-primary px-4 py-3 text-on-primary">
            <W3CIcon size={22} />
            <span>W3C ladder</span>
          </CardTitle>
          <div className="flex flex-wrap items-center gap-2 p-2">
            <Badge variant="outline">{ladderTeam.points} points</Badge>
            <Badge variant="outline">Rank {ladderRank}</Badge>
            <Badge variant="outline">{ladderTeam.games} games</Badge>
            <TapTooltip className="ms-auto text-xs text-muted-foreground" content={localFromIso(ladderSyncedAt)}>
              {ladderSyncCaption}
            </TapTooltip>
          </div>
          <div className="table-scroll overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead style={{ width: "64px" }}>Race</TableHead>
                  <TableHead className="hidden text-right min-[960px]:table-cell">
                    <ColumnNote title="Ladder points" note={LADDER_NOTE} />
                  </TableHead>
                  <TableHead className="hidden min-[960px]:table-cell">
                    <ColumnNote title="Achievements" note={ACHIEVEMENTS_NOTE} />
                  </TableHead>
                  <TableHead className="text-right">
                    <ColumnNote title="Total points" note={SCORED_NOTE} />
                  </TableHead>
                  <TableHead className="text-right">W</TableHead>
                  <TableHead className="text-right">L</TableHead>
                  <TableHead className="text-right">
                    <W3CMmr />
                  </TableHead>
                  <TableHead className="hidden text-right min-[960px]:table-cell">
                    <W3CMmr suffix=" +/-" />
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(ladderTeam.players ?? []).map((row: Row) => (
                  <TableRow key={row.id}>
                    <TableCell>
                      <PlayerName player={row} mmr={false} />
                    </TableCell>
                    <TableCell>{row.race ? <RaceIcon raceIdentifier={row.race} /> : null}</TableCell>
                    <TableCell className="tnum hidden text-right min-[960px]:table-cell">{row.ladder_points}</TableCell>
                    <TableCell className="hidden min-[960px]:table-cell">
                      <AchievementChip badges={row.achievements} />
                    </TableCell>
                    <TableCell className="tnum text-right font-bold">{row.points}</TableCell>
                    <TableCell className="tnum text-right text-win">{row.wins}</TableCell>
                    <TableCell className="tnum text-right text-loss">{row.losses}</TableCell>
                    <TableCell className="tnum text-right">{row.mmr?.current ?? "—"}</TableCell>
                    <TableCell className={`tnum hidden text-right min-[960px]:table-cell ${diffClass(ladderMmrDiff(row))}`}>
                      {ladderMmrDiff(row) == null ? "—" : ladderMmrDiff(row)! > 0 ? `+${ladderMmrDiff(row)}` : ladderMmrDiff(row)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      ) : null}

      {/* The roster of this season: the captains an admin sets, then the players */}
      <TeamRoster
        captains={seasonCaptains}
        members={players}
        noCaptains="No captains recorded for this season."
        noMembers="No members recorded for this season."
        captainsActions={
          auth.isAdmin ? (
            <div className="flex justify-end p-2">
              <Button className="bg-success text-on-success" onClick={saveCaptains} disabled={isSavingCaptains}>
                <Icon name={isSavingCaptains ? "mdi-loading mdi-spin" : "mdi-content-save"} />
                Save captains
              </Button>
            </div>
          ) : null
        }
        renderCaptains={({ captains }) => (
          <>
            {!auth.isAdmin ? (
              <div className="flex flex-wrap gap-3">
                {captains.map((captain) => (
                  <PlayerName key={captain.id} player={captain} />
                ))}
                {!captains.length ? <span className="text-muted-foreground">No captains recorded for this season.</span> : null}
              </div>
            ) : (
              <>
                <p className="mb-3 text-sm font-medium">Assign the captains of this season:</p>
                {/* Any number of captains: the picker adds one, and each chip takes one back out */}
                <Combobox
                  label="Captains"
                  placeholder="Start typing to search..."
                  items={allAvailableUsers.filter((user) => !captainIds.includes(user.id)).map((user) => ({ value: String(user.id), title: user.name ?? "" }))}
                  value={null}
                  onChange={(value) => (value == null ? undefined : setCaptainIds((was) => [...was, Number(value)]))}
                />
                <p className="mt-1 text-xs text-muted-foreground">Any number of captains</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {chosenCaptains.map((captain) => (
                    <Badge key={captain.id} variant="secondary">
                      {captain.name}
                      <button
                        type="button"
                        aria-label={`Remove ${captain.name}`}
                        onClick={() => setCaptainIds((was) => was.filter((captainId) => captainId !== captain.id))}
                      >
                        <Icon name="mdi-close" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </>
            )}

            {/* Save captains answers the accounts the guild has not granted the role yet */}
            <div className="mt-4 flex flex-wrap gap-2">
              {discordRoleMissing.length ? (
                <Badge className={toneClass("warning")}>
                  <Icon name="mdi-alert" />
                  Role missing in Discord for {discordRoleMissing.length} {discordRoleMissing.length === 1 ? "captain" : "captains"}
                </Badge>
              ) : null}
            </div>
          </>
        )}
        renderMembers={({ members }) => (
          <>
            {auth.isAdmin || canSetRounds ? (
              <div className="flex flex-wrap justify-end gap-2 p-2">
                {auth.isAdmin ? (
                  <TapTooltip content="MMR and ladder matches">
                    <Button onClick={syncW3CTeam} disabled={isLoading}>
                      <W3CIcon size={18} />
                      Sync W3C
                    </Button>
                  </TapTooltip>
                ) : null}
                {canSetRounds ? (
                  <Button nativeButton={false} render={<Link href={`/team/${teamId}/season/${seasonKey}/rounds`} />}>
                    <Icon name="mdi-calendar-account" />
                    Team rounds
                  </Button>
                ) : null}
                {auth.isAdmin ? (
                  <Button className="bg-success text-on-success" onClick={openNewPlayerModal}>
                    <Icon name="mdi-plus" />
                    Add player
                  </Button>
                ) : null}
              </div>
            ) : null}
            {/* The roster arrives after the mount, so the table starts over when the paging mode changes */}
            <DataTable
              key={members.length > 10 ? "paged" : "all"}
              data={members as Row[]}
              pageSize={members.length > 10 ? 10 : undefined}
              columnVisibility={{ battleTag: mdAndUp }}
              empty={
                errorMessage ? null : (
                  <div className="p-8 text-center">
                    <Icon name="mdi-account-off" size={64} className="text-muted-foreground" />
                    <div className="mt-4 mb-2 text-xl text-muted-foreground">No players found</div>
                    <p className="mb-4 text-muted-foreground">Add players to this team to get started</p>
                    {auth.isAdmin ? (
                      <Button onClick={openNewPlayerModal}>
                        <Icon name="mdi-plus" />
                        Add first player
                      </Button>
                    ) : null}
                  </div>
                )
              }
              columns={[
                {
                  id: "name",
                  accessorKey: "name",
                  header: "Name",
                  cell: ({ row }) => (
                    <>
                      <PlayerName player={row.original} race={row.original.signup_race} />
                      <PlayedAs playedAs={row.original.played_as} battleTag={row.original.battleTag} />
                      <div>{syncCell(row.original)}</div>
                    </>
                  ),
                },
                { id: "battleTag", accessorKey: "battleTag", header: "Battletag" },
                {
                  id: "actions",
                  header: "",
                  enableSorting: false,
                  cell: ({ row }) => (
                    <RowActions
                      actions={[
                        { icon: "mdi-chart-box", label: "View player stats", public: true, href: playerPath(row.original) },
                        { icon: "mdi-account-minus", label: "Remove from team", color: "error", onClick: () => removePlayerFromTeam(Number(row.original.id)) },
                      ]}
                    />
                  ),
                },
              ]}
            />
          </>
        )}
      />

      {/* Add New Player Modal */}
      <Dialog open={showNewPlayerModal} onOpenChange={setShowNewPlayerModal} disablePointerDismissal>
        <DialogContent showCloseButton={false} className="max-h-[90vh] max-w-[900px] overflow-y-auto gap-0 p-0 sm:max-w-[900px]">
          <DialogTitle className="flex items-center gap-2 bg-primary px-4 py-3 text-on-primary">
            <Icon name="mdi-account-multiple-plus" />
            Select players to add
          </DialogTitle>

          <div className="p-4">
            {/* Filters (reusable) */}
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
              onReset={fetchAllPlayers}
            />
            <DataTable
              data={filteredAllPlayers}
              pageSize={10}
              empty="No signed-up players match the filters."
              columns={[
                {
                  id: "select",
                  header: "",
                  enableSorting: false,
                  cell: ({ row }) => (
                    <Checkbox
                      checked={selectedPlayers.includes(row.original.id)}
                      disabled={players.some((player) => player.id === row.original.id)}
                      onCheckedChange={(checked) =>
                        setSelectedPlayers((was) => (checked ? [...was, row.original.id] : was.filter((playerId) => playerId !== row.original.id)))
                      }
                      aria-label={row.original.name}
                    />
                  ),
                },
                { id: "name", accessorKey: "name", header: "Name", cell: ({ row }) => <PlayerName player={row.original} race={row.original.signup_race} plain /> },
                { id: "battleTag", accessorKey: "battleTag", header: "Battletag" },
              ]}
            />
          </div>
          <div className="flex justify-end gap-2 p-4 pt-0">
            <Button variant="ghost" onClick={() => setShowNewPlayerModal(false)}>
              Cancel
            </Button>
            {auth.isAdmin ? (
              <Button onClick={saveSelectedPlayers}>
                <Icon name="mdi-content-save" />
                Add selected players
              </Button>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>

      <W3CSyncResultDialog modelValue={syncDialog} entries={syncEntries} onUpdateModelValue={setSyncDialog} />
    </div>
  );
}

export default SeasonTeamDetailsView;
