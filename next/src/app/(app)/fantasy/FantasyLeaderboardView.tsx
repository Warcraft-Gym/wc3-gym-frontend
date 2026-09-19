"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Combobox } from "@/components/ui/Combobox";
import { DataTable } from "@/components/ui/DataTable";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Field } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import { Input } from "@/components/ui/input";
import { Pick } from "@/components/ui/Pick";
import { Separator } from "@/components/ui/separator";
import { FantasyScoreBreakdown } from "@/components/fantasy/FantasyScoreBreakdown";
import { PageHeader } from "@/components/PageHeader";
import { PlayerName } from "@/components/PlayerName";
import { RowActions } from "@/components/RowActions";
import { SeasonSelect } from "@/components/SeasonSelect";
import { StatusAlert } from "@/components/StatusAlert";
import { MD_AND_UP, useBreakpoint } from "@/hooks/breakpoint";
import { useAuth, useFantasyStore, useSeason, useSeasonStore, useTeamStore } from "@/stores";
import { resolveCurrentW3CSeason } from "@/helpers/current-season.js";
import { ALL_COLORS, tierSelectionError } from "@/helpers/tiers.mjs";

const races = [
  { title: "Human", value: "HU" },
  { title: "Orc", value: "OC" },
  { title: "Night Elf", value: "NE" },
  { title: "Undead", value: "UD" },
  { title: "Random", value: "RANDOM" },
];

// Tailwind builds no class from a name held in data, so each tier chip is written out.
const TIER_CHIP: Record<string, string> = {
  "tier-1": "bg-tier-1 text-on-tier-1",
  "tier-2": "bg-tier-2 text-on-tier-2",
  "tier-3": "bg-tier-3 text-on-tier-3",
  "tier-4": "bg-tier-4 text-on-tier-4",
  "tier-5": "bg-tier-5 text-on-tier-5",
  "tier-6": "bg-tier-6 text-on-tier-6",
};
const tierColors = [...(ALL_COLORS as string[])].reverse();

// A drafted player is UserPublic, which carries its id under one of these names
const draftedId = (player: any) => player.user_id || player.id || player.player_id;

const emptyTeam = (seasonId: number | null = null) => ({
  id: null as number | null,
  name: "",
  season_id: seasonId,
  captain_id: null as number | null,
  drafted_team_id: null as number | null,
  grind_team_id: null as number | null,
  drafted_race: null as string | null,
  player_ids: [] as number[],
});

/** Every fantasy team of one season by total points, each row opening its score breakdown. */
export function FantasyLeaderboardView() {
  const fantasyStore = useFantasyStore();
  const seasonStore = useSeasonStore();
  const teamStore = useTeamStore();
  const auth = useAuth();
  const { seasons, selectedSeasonId } = useSeason();

  const [teams, setTeams] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [currentW3CSeason, setCurrentW3CSeason] = useState<any>(null);
  const [editDialog, setEditDialog] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [teamToDelete, setTeamToDelete] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [breakdowns, setBreakdowns] = useState<Record<number, any>>({}); // by team id, filled when a row expands
  const [reloads, setReloads] = useState(0); // the DataTable's key, so a refetch closes every open row with its dropped breakdown
  // The breakdown's opponent/bet resolve() pool: season signups, carrying signup_race
  const [seasonSignups, setSeasonSignups] = useState<any[]>([]);
  const [gnlTeams, setGnlTeams] = useState<any[]>([]);
  const [editedTeam, setEditedTeam] = useState(emptyTeam());
  const [selectedTierPlayers, setSelectedTierPlayers] = useState<Record<number, number | null>>({});
  const [dialogErrorMessage, setDialogErrorMessage] = useState<string | null>(null);

  const mdAndUp = useBreakpoint(MD_AND_UP);

  const pickedSeason = seasons.find((season: any) => season.id === selectedSeasonId);
  // The season the picker is on says how many tiers it cuts; tier 1 is always Diamond
  const tierCount: number | undefined = pickedSeason?.fantasy_tiers;
  // The season also says whether a fantasy captain picks a second team to grind
  const fantasyGrind = !!pickedSeason?.fantasy_grind;
  const tiers = useMemo(() => Array.from({ length: tierCount || 0 }, (_, i) => i + 1), [tierCount]);
  const players = seasonSignups;

  const myUserId = auth.me?.user?.id ?? null;
  // A fantasy captain edits their own team only while the season is open; the draft freezes when it commences
  const canEditOwn = (team: any) => !!myUserId && team.captain_id === myUserId && pickedSeason?.phase === "open";

  // The buckets follow the season's signups, because the tier is a season fact
  const tierPlayers = useMemo(() => {
    const byTier: Record<number, any[]> = Object.fromEntries(tiers.map((tier) => [tier, []]));
    for (const player of players) {
      if (player.fantasy_tier >= 1 && player.fantasy_tier <= (tierCount || 0)) byTier[player.fantasy_tier].push(player);
    }
    return byTier;
  }, [tiers, players, tierCount]);

  const emptyTierSelection = () => Object.fromEntries(tiers.map((tier) => [tier, null]));

  const sortedTeams = useMemo(() => [...teams].sort((a, b) => (b.total_points || 0) - (a.total_points || 0)), [teams]);

  const rankVariant = (rank: number) => (rank === 1 ? "default" : rank <= 3 ? "secondary" : "outline");

  const fetchData = async () => {
    if (!selectedSeasonId) return; // the picker resolves one
    setIsLoading(true);
    setErrorMessage(null);
    try {
      setBreakdowns({});
      setReloads((count) => count + 1);
      setTeams(await fantasyStore.searchTeams(`season_id == ${selectedSeasonId}`));
      setSeasonSignups((await seasonStore.fetchSeasonSignups(selectedSeasonId)) || []);
    } catch (error: any) {
      console.error("Failed to fetch fantasy teams:", error);
      setErrorMessage("Failed to load fantasy teams. Please try again later.");
    } finally {
      setIsLoading(false);
    }
  };

  const loadTeams = async () => {
    try {
      if (selectedSeasonId) setGnlTeams((await teamStore.fetchTeamsBySeasonBasic(selectedSeasonId)) || []);
    } catch (error: any) {
      console.error("Failed to load teams:", error);
    }
  };

  // The season the picker resolves drives the page; both reads run again when it changes.
  const fetched = useRef<number | null>(null);
  useEffect(() => {
    if (!selectedSeasonId || fetched.current === selectedSeasonId) return;
    fetched.current = selectedSeasonId;
    fetchData();
    loadTeams();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSeasonId]);

  useEffect(() => {
    resolveCurrentW3CSeason().then(setCurrentW3CSeason);
  }, []);

  // An expanded row shows the breakdown, fetched once per team and season
  const loadBreakdown = async (team: any) => {
    if (breakdowns[team.id] || !selectedSeasonId) return;
    try {
      const breakdown = await fantasyStore.getTeamScoreBreakdown(team.id, selectedSeasonId);
      setBreakdowns((was) => ({ ...was, [team.id]: breakdown }));
    } catch (error: any) {
      console.error("Failed to fetch score breakdown:", error);
      setErrorMessage(`Failed to fetch score breakdown: ${error.message || "Unknown error"}`);
    }
  };

  const openCreateDialog = async () => {
    setIsEditing(false);
    setDialogErrorMessage(null);
    setEditedTeam(emptyTeam(selectedSeasonId));
    setSelectedTierPlayers(emptyTierSelection());
    await loadTeams();
    setEditDialog(true);
  };

  const openEditDialog = async (team: any) => {
    setIsEditing(true);
    setDialogErrorMessage(null);
    setEditedTeam({
      id: team.id,
      name: team.name,
      season_id: team.season_id,
      captain_id: team.captain_id,
      drafted_team_id: team.drafted_team_id,
      grind_team_id: team.grind_team_id ?? null,
      drafted_race: team.drafted_race,
      player_ids: team.drafted_players?.map(draftedId).filter(Boolean) || [],
    });

    // Load the teams first so the drafted-team picker is populated
    await loadTeams();

    const selection: Record<number, number | null> = emptyTierSelection();
    // A tier above the season's count has no picker, so it lands in no slot
    for (const dp of team.drafted_players || []) {
      const player = players.find((p) => p.id === draftedId(dp));
      if (player && player.fantasy_tier >= 1 && player.fantasy_tier <= (tierCount || 0)) selection[player.fantasy_tier] = player.id;
    }
    setSelectedTierPlayers(selection);
    setEditDialog(true);
  };

  const closeEditDialog = () => {
    setEditDialog(false);
    setDialogErrorMessage(null);
    setEditedTeam(emptyTeam());
    setSelectedTierPlayers(emptyTierSelection());
  };

  // The required fields, in the order the form asks for them
  const missingField = () =>
    !editedTeam.name
      ? "Team name is required"
      : !editedTeam.season_id
        ? "Season is required"
        : !editedTeam.captain_id
          ? "Fantasy Captain is required"
          : !editedTeam.drafted_team_id
            ? "Drafted team is required"
            : !editedTeam.drafted_race
              ? "Drafted race is required"
              : null;

  const saveTeam = async () => {
    // One player per tier the season cuts, and a season with no cut tiers takes no team
    const error = missingField() || tierSelectionError(tierCount, selectedTierPlayers);
    if (error) {
      setDialogErrorMessage(error);
      return;
    }

    const playerIds = Object.values(selectedTierPlayers).filter((id): id is number => id !== null);

    setIsSaving(true);
    setDialogErrorMessage(null);
    try {
      const teamData = {
        name: editedTeam.name,
        season_id: editedTeam.season_id,
        captain_id: editedTeam.captain_id,
        drafted_team_id: editedTeam.drafted_team_id,
        grind_team_id: editedTeam.grind_team_id ?? null,
        drafted_race: editedTeam.drafted_race,
      };

      if (isEditing) {
        await fantasyStore.updateTeam(editedTeam.id!, teamData);

        // Update players if changed
        const team = teams.find((t) => t.id === editedTeam.id);
        const currentPlayerIds: number[] = team.drafted_players?.map(draftedId).filter(Boolean) || [];
        const playersToAdd = playerIds.filter((id) => !currentPlayerIds.includes(id));
        const playersToRemove = currentPlayerIds.filter((id) => !playerIds.includes(id));

        if (playersToRemove.length > 0) await fantasyStore.removePlayers(editedTeam.id!, playersToRemove);
        if (playersToAdd.length > 0) await fantasyStore.addPlayers(editedTeam.id!, playersToAdd);
      } else {
        const newTeam = await fantasyStore.createTeam(teamData);
        if (playerIds.length > 0) await fantasyStore.addPlayers(newTeam.id, playerIds);
      }

      closeEditDialog();
      await fetchData();
    } catch (error: any) {
      console.error("Failed to save team:", error);
      setDialogErrorMessage(`Failed to ${isEditing ? "update" : "create"} team: ${error.message || "Unknown error"}`);
    } finally {
      setIsSaving(false);
    }
  };

  const closeDeleteDialog = () => {
    setDeleteDialog(false);
    setTeamToDelete(null);
  };

  const confirmDelete = async () => {
    if (!teamToDelete) return;
    setIsDeleting(true);
    setErrorMessage(null);
    try {
      await fantasyStore.deleteTeam(teamToDelete.id);
      // The module keeps no list, so the page drops the row itself
      setTeams((was) => was.filter((team) => team.id !== teamToDelete.id));
      closeDeleteDialog();
      await fetchData();
    } catch (error: any) {
      console.error("Failed to delete team:", error);
      setErrorMessage(`Failed to delete team: ${error.message || "Unknown error"}`);
      closeDeleteDialog();
    } finally {
      setIsDeleting(false);
    }
  };

  const pointsColumn = (key: string, header: string) => ({
    id: key,
    accessorKey: key,
    header,
    cell: ({ row }: any) => row.original[key] || 0,
  });

  const columns: any[] = [
    { id: "rank", header: "Rank", enableSorting: false, cell: ({ row }: any) => <Badge variant={rankVariant(row.index + 1)}>{row.index + 1}</Badge> },
    { id: "name", accessorKey: "name", header: "Fantasy team", enableSorting: false, cell: ({ row }: any) => row.original.name || "N/A" },
    {
      id: "captain",
      header: "Fantasy Captain",
      enableSorting: false,
      // no race: the captain bets, they don't play
      cell: ({ row }: any) => (row.original.captain ? <PlayerName player={row.original.captain} /> : "N/A"),
    },
    // the order the breakdown panels open in, so a column and its panel line up
    pointsColumn("team_points", "Team points"),
    ...(fantasyGrind ? [pointsColumn("grind_points", "Grind points")] : []),
    pointsColumn("race_points", "Race points"),
    pointsColumn("player_points", "Player points"),
    pointsColumn("bench_points", "Bench points"),
    pointsColumn("bet_points", "Bet points"),
    { id: "total_points", accessorKey: "total_points", header: "Total", cell: ({ row }: any) => <strong>{row.original.total_points || 0}</strong> },
    // the column exists only for viewers with at least one visible row action: admin, or captain of a listed team
    ...(auth.isAdmin || teams.some(canEditOwn)
      ? [
          {
            id: "actions",
            header: "",
            enableSorting: false,
            cell: ({ row }: any) => (
              <RowActions
                actions={[
                  { icon: "mdi-pencil", label: "Edit", public: canEditOwn(row.original), onClick: () => openEditDialog(row.original) },
                  { icon: "mdi-delete", label: "Delete", color: "error", onClick: () => { setTeamToDelete(row.original); setDeleteDialog(true); } },
                ]}
              />
            ),
          },
        ]
      : []),
  ];

  const hiddenOnPhone = ["captain", "team_points", "grind_points", "race_points", "player_points", "bench_points", "bet_points"];
  const columnVisibility = Object.fromEntries(hiddenOnPhone.map((key) => [key, mdAndUp]));

  const playerItems = (list: any[]) => list.map((player) => ({ value: String(player.id), title: player.name }));
  const teamItems = gnlTeams.map((team) => ({ value: String(team.id), title: team.name }));

  return (
    <div className="p-4">
      {/* The page dims while the teams load. */}
      {isLoading ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/60">
          <span className="size-16 animate-spin rounded-full border-8 border-primary border-t-transparent" />
        </div>
      ) : null}

      <PageHeader title={<><Icon name="mdi-trophy" className="mr-2" />Fantasy Teams Leaderboard</>} />

      <StatusAlert modelValue={errorMessage} onClose={() => setErrorMessage(null)} />

      <Card className="card gap-0 py-0">
        <CardContent className="p-0">
          <div className="flex flex-wrap items-center gap-2 p-2">
            <div className="w-full sm:w-auto">
              <SeasonSelect />
            </div>
            {auth.isAdmin ? (
              <Button className="w-full sm:ml-auto sm:w-auto" onClick={openCreateDialog}>
                <Icon name="mdi-plus" />
                Create team
              </Button>
            ) : null}
          </div>

          <DataTable
            key={reloads}
            data={sortedTeams}
            columns={columns}
            pageSize={25}
            rowId={(team: any) => String(team.id)}
            columnVisibility={columnVisibility}
            empty={auth.isAdmin ? "No fantasy teams in this season yet. Create the first one." : "No fantasy teams in this season yet."}
            expandLabel="Score breakdown"
            onExpand={loadBreakdown}
            expand={(team: any) => (
              // sticky: stays in view when the summary row scrolls sideways on a narrow window
              <div className="sticky left-0 max-w-[calc(100vw-48px)] p-4">
                <div className="mb-2 text-xl">Score breakdown</div>
                {!breakdowns[team.id] ? (
                  <div className="p-4 text-center">
                    <span className="inline-block size-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                  </div>
                ) : (
                  <FantasyScoreBreakdown
                    breakdown={breakdowns[team.id]}
                    players={seasonSignups}
                    draftedPlayers={team.drafted_players || []}
                    seasonId={selectedSeasonId}
                    w3cSeason={currentW3CSeason}
                  />
                )}
              </div>
            )}
          />
        </CardContent>
      </Card>

      {/* Create/Edit Team Dialog */}
      <Dialog open={editDialog} onOpenChange={(open) => (open ? setEditDialog(true) : closeEditDialog())} disablePointerDismissal>
        <DialogContent showCloseButton={false} className="gap-0 p-0 sm:max-w-[900px]">
          <DialogTitle className="flex items-center gap-2 bg-primary px-4 py-3 text-on-primary">
            <Icon name={isEditing ? "mdi-pencil" : "mdi-plus"} />
            {isEditing ? "Edit fantasy team" : "Create fantasy team"}
          </DialogTitle>

          <div className="max-h-[70vh] overflow-y-auto p-4">
            <StatusAlert modelValue={dialogErrorMessage} onClose={() => setDialogErrorMessage(null)} />

            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Team name *" htmlFor="team-name">
                <Input id="team-name" value={editedTeam.name} onChange={(event) => setEditedTeam({ ...editedTeam, name: event.target.value })} />
              </Field>
              <Pick
                label="Season *"
                items={seasons.map((season: any) => ({ value: season.id, title: season.name }))}
                value={editedTeam.season_id}
                onChange={(value) => setEditedTeam({ ...editedTeam, season_id: value })}
                disabled={!auth.isAdmin}
              />
              <Field label="Fantasy Captain *" htmlFor="team-captain">
                <Combobox
                  id="team-captain"
                  items={playerItems(players)}
                  value={editedTeam.captain_id == null ? null : String(editedTeam.captain_id)}
                  onChange={(value) => setEditedTeam({ ...editedTeam, captain_id: value == null ? null : Number(value) })}
                  label="Fantasy Captain"
                  disabled={!auth.isAdmin}
                />
              </Field>
              <Field label="Drafted team *" htmlFor="team-drafted">
                <Combobox
                  id="team-drafted"
                  items={teamItems}
                  value={editedTeam.drafted_team_id == null ? null : String(editedTeam.drafted_team_id)}
                  onChange={(value) => setEditedTeam({ ...editedTeam, drafted_team_id: value == null ? null : Number(value) })}
                  label="Drafted team"
                />
              </Field>
              {fantasyGrind ? (
                <Field label="Grind team" htmlFor="team-grind">
                  <div className="flex items-center gap-1">
                    <Combobox
                      id="team-grind"
                      items={teamItems}
                      value={editedTeam.grind_team_id == null ? null : String(editedTeam.grind_team_id)}
                      onChange={(value) => setEditedTeam({ ...editedTeam, grind_team_id: value == null ? null : Number(value) })}
                      label="Grind team"
                    />
                    {editedTeam.grind_team_id != null ? (
                      <Button variant="ghost" size="icon-sm" aria-label="Clear Grind team" onClick={() => setEditedTeam({ ...editedTeam, grind_team_id: null })}>
                        <Icon name="mdi-close" />
                      </Button>
                    ) : null}
                  </div>
                </Field>
              ) : null}
              <Pick
                label="Drafted race *"
                items={races}
                value={editedTeam.drafted_race}
                onChange={(value) => setEditedTeam({ ...editedTeam, drafted_race: value })}
              />
            </div>

            <Separator className="my-4" />
            <h3 className="mb-3 text-xl">Drafted players (select 1 per tier) *</h3>
            <StatusAlert modelValue={`You must select exactly one player from each tier (1-${tierCount ?? ""})`} type="info" />

            <div className="grid gap-4 md:grid-cols-2">
              {tiers.map((tier) => (
                <Field key={tier} label={`Tier ${tier} player *`} htmlFor={`tier-${tier}`}>
                  <div className="flex items-center gap-1">
                    <Badge className={TIER_CHIP[tierColors[tier - 1]]}>T{tier}</Badge>
                    <Combobox
                      id={`tier-${tier}`}
                      items={playerItems(tierPlayers[tier] || [])}
                      value={selectedTierPlayers[tier] == null ? null : String(selectedTierPlayers[tier])}
                      onChange={(value) => setSelectedTierPlayers({ ...selectedTierPlayers, [tier]: value == null ? null : Number(value) })}
                      label={`Tier ${tier} player`}
                    />
                    {selectedTierPlayers[tier] != null ? (
                      <Button variant="ghost" size="icon-sm" aria-label={`Clear tier ${tier} player`} onClick={() => setSelectedTierPlayers({ ...selectedTierPlayers, [tier]: null })}>
                        <Icon name="mdi-close" />
                      </Button>
                    ) : null}
                  </div>
                </Field>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 px-4 py-3">
            <Button variant="ghost" onClick={closeEditDialog} disabled={isSaving}>
              Cancel
            </Button>
            {auth.isAdmin || (isEditing && canEditOwn(editedTeam)) ? (
              <Button onClick={saveTeam} disabled={isSaving}>
                <Icon name={isSaving ? "mdi-loading mdi-spin" : "mdi-check"} />
                {isEditing ? "Update" : "Create"}
              </Button>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialog} onOpenChange={(open) => (open ? setDeleteDialog(true) : closeDeleteDialog())}>
        <DialogContent showCloseButton={false} className="gap-0 p-0 sm:max-w-[500px]">
          {/* DESIGN.md: a dialog that deletes something wears bg-error */}
          <DialogTitle className="flex items-center gap-2 bg-error px-4 py-3 text-on-error">
            <Icon name="mdi-alert" />
            Confirm delete
          </DialogTitle>
          <div className="p-4">
            <p>Are you sure you want to delete the fantasy team &quot;{teamToDelete?.name}&quot;?</p>
            <p className="mt-2 font-bold text-error">This action cannot be undone.</p>
          </div>
          <div className="flex justify-end gap-2 px-4 py-3">
            <Button variant="ghost" onClick={closeDeleteDialog} disabled={isDeleting}>
              Cancel
            </Button>
            {auth.isAdmin ? (
              <Button variant="destructive" onClick={confirmDelete} disabled={isDeleting}>
                <Icon name={isDeleting ? "mdi-loading mdi-spin" : "mdi-delete"} />
                Delete
              </Button>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default FantasyLeaderboardView;
