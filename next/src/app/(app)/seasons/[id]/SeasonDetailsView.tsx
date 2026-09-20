/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { DataTable } from "@/components/ui/DataTable";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Icon } from "@/components/ui/Icon";
import { Pick } from "@/components/ui/Pick";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toneClass } from "@/components/ui/tone";
import { CastChips, type CastSeries } from "@/components/CastChips";
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";
import { EventHeader } from "@/components/EventHeader";
import { GroupedTable } from "@/components/GroupedTable";
import { PlayerName } from "@/components/PlayerName";
import { RowActions } from "@/components/RowActions";
import { StatusAlert } from "@/components/StatusAlert";
import { useDeleteDialog } from "@/hooks/delete-dialog";
import { formatDateTime } from "@/helpers/datetime";
import { fixedMapOf, rulesOf } from "@/helpers/map-order.mjs";
import { matchProblem } from "@/helpers/match.mjs";
import { currentRound, roundLabel } from "@/helpers/rounds.mjs";
import { isUnscored } from "@/helpers/season-phase.mjs";
import { showDefaultTeamImage, teamImageUrl } from "@/helpers/team-image";
import { useAuth, useMapStore, useMatchStore, useSeason, useSeriesStore, useTeamStore } from "@/stores";
import { timeMissing } from "@/helpers/schedule.mjs";

type Row = Record<string, any>;

const UNSCORED_COLUMNS = [
  { key: "match", title: "Match" },
  { key: "player1", title: "Player 1" },
  { key: "player2", title: "Player 2" },
  { key: "date_time", title: "Scheduled" },
  { key: "cast", title: "Cast" },
];

// The round of a week gives the match card its dates
const roundOf = (season: Row, playday: number) => season?.rounds?.find((r: Row) => r.playday === playday) || { playday };

const scoreClass = (score: number, opponentScore: number) =>
  score > opponentScore ? "bg-win text-on-win" : score < opponentScore ? "bg-loss text-on-loss" : "bg-draw text-on-draw";

// A match with a score is done, so a missing round map is no longer worth warning about
const matchPlayed = (match: Row) => !!(match?.team1_score || match?.team2_score);

// The hash names the open round, so a reload and the back button land on the same one
const roundFromHash = () => {
  const hash = typeof window === "undefined" ? "" : window.location.hash;
  return hash.includes("#round-") ? parseInt(hash.replace("#round-", ""), 10) : null;
};

export function SeasonDetailsView({ id }: { id: string }) {
  const auth = useAuth();
  const { current_season: season, seasonIdOf, fetchSeason, addTeamsToSeason } = useSeason();
  const matchStore = useMatchStore();
  const teamStore = useTeamStore();
  const mapStore = useMapStore();
  const seriesStore = useSeriesStore();

  const seasonId = seasonIdOf(id);

  const [isLoading, setIsLoading] = useState(true);
  const [matches, setMatches] = useState<Row[]>([]);
  const [teams, setTeams] = useState<Row[]>([]);
  const [maps, setMaps] = useState<Row[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null);

  // Series with no result: on from ?unscored=1; the chip turns it off for this visit
  const [unscoredOnly, setUnscoredOnly] = useState(useSearchParams().get("unscored") === "1");
  const [unscoredSeries, setUnscoredSeries] = useState<Row[]>([]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isTeamDialogOpen, setIsTeamDialogOpen] = useState(false);
  const [editMatchDialogOpen, setEditMatchDialogOpen] = useState(false);

  const [selectedMatch, setSelectedMatch] = useState<Row | null>(null);
  const [newMatch, setNewMatch] = useState<Row | null>(null);
  const [matchError, setMatchError] = useState<string | null>(null);

  const [allTeams, setAllTeams] = useState<Row[] | null>(null);
  const [selectedTeams, setSelectedTeams] = useState<number[]>([]);

  const { showDeleteDialog, openDeleteDialog, confirmDelete, cancelDeleteDialog } = useDeleteDialog();

  // Compute teams that are not part of the season
  const availableTeams = (allTeams ?? []).filter((team) => !teams.some((seasonTeam) => seasonTeam.id === team.id));

  // The fixed map of a round: season_rounds.map_id, the column the veto and the game offers read
  const usesFixedMap = rulesOf(season?.map_rules).includes("fixed");
  const roundMapId = (playday: number) => fixedMapOf(season?.map_rules, roundOf(season, playday));
  const getMapName = (mapId: number | null) => maps.find((m) => m.id === mapId)?.name || "Random";

  const unscoredGroups = (() => {
    const weeks = new Map<number, { key: number; label: string; rows: Row[] }>();
    for (const series of unscoredSeries) {
      const week = series.match?.playday ?? 0;
      if (!weeks.has(week)) weeks.set(week, { key: week, label: `Round ${week}`, rows: [] });
      weeks.get(week)!.rows.push(series);
    }
    return [...weeks.values()].sort((a, b) => a.key - b.key);
  })();

  const fetchMatches = async (week: number) => {
    setSelectedWeek(week);
    setIsLoading(true);
    window.location.hash = `#round-${week}`;
    try {
      setMatches((await matchStore.searchMatchesBySeasonAndPlayday(seasonId as number, week)) || []);
    } catch (error) {
      console.error(`Failed to fetch matches for week ${week}:`, error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTeams = async () => {
    try {
      setTeams((await teamStore.fetchTeamsBySeasonBasic(seasonId as number)) || []);
    } catch (error) {
      console.error("Failed to fetch teams for the season:", error);
    }
  };

  useEffect(() => {
    // the loaders set state, so they run just outside the effect body (react-hooks/set-state-in-effect)
    queueMicrotask(async () => {
      // the season list is loaded by the guard, so a null id here is a slug that names no season
      if (!seasonId) return setIsLoading(false);
      setIsLoading(true);
      try {
        const hashRound = roundFromHash();
        // The rounds decide which tab opens, so the season is read before the matches
        const current = await fetchSeason(seasonId).catch((error) => {
          console.error("Failed to fetch season details:", error);
          return null;
        });
        const round = hashRound ?? currentRound(current?.rounds)?.playday ?? 1;
        await Promise.all([
          fetchTeams(),
          fetchMatches(round),
          mapStore
            .fetchMaps()
            .then((rows: Row[]) => setMaps(rows || []))
            .catch((error: Error) => console.error("Failed to fetch maps:", error)),
        ]);
      } finally {
        setIsLoading(false);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seasonId]);

  useEffect(() => {
    if (!seasonId || !unscoredOnly) return;
    queueMicrotask(async () => {
      try {
        const all = await seriesStore.searchSeriesBySeason(seasonId);
        setUnscoredSeries((all || []).filter(isUnscored));
      } catch (error) {
        console.error("Failed to fetch the series of the season:", error);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seasonId, unscoredOnly]);

  // The back button moves the open round, as the tab click does
  useEffect(() => {
    const onHashChange = () => {
      // An empty hash names no round, so the open one stays
      const round = roundFromHash();
      if (round && selectedWeek && round !== selectedWeek) fetchMatches(round);
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedWeek]);

  const openTeamSelectionModal = async () => {
    // Load basic team info only when the modal is opened
    if (!allTeams) setAllTeams((await teamStore.getTeamsBasic()) || []);
    setSelectedTeams([]);
    setIsTeamDialogOpen(true);
  };

  const closeTeamSelectionModal = () => {
    setIsTeamDialogOpen(false);
    setSelectedTeams([]);
  };

  const addTeams = async () => {
    setIsLoading(true);
    try {
      await addTeamsToSeason(seasonId as number, selectedTeams);
      await fetchTeams();
    } catch (error) {
      console.error("Failed to add teams to season:", error);
    } finally {
      setIsLoading(false);
      closeTeamSelectionModal();
    }
  };

  const openMatchCreationModal = () => {
    setNewMatch({ team1_id: null, team2_id: null, season_id: seasonId, playday: selectedWeek });
    setMatchError(null);
    setIsModalOpen(true);
  };

  const closeMatchCreationModal = () => {
    setIsModalOpen(false);
    setMatchError(null);
  };

  const confirmSelection = async () => {
    const problem = matchProblem(newMatch);
    setMatchError(problem);
    if (problem) return;
    setIsLoading(true);
    try {
      await matchStore.createMatch(newMatch);
      await fetchMatches(selectedWeek as number);
      closeMatchCreationModal();
    } catch (error) {
      console.error("Failed to add match:", error);
      setMatchError((error as Error).message || "Failed to add the match.");
    } finally {
      setIsLoading(false);
    }
  };

  const editMatch = (match: Row) => {
    setSelectedMatch({ ...match });
    setMatchError(null);
    setEditMatchDialogOpen(true);
  };

  const cancelEdit = () => {
    setEditMatchDialogOpen(false);
    setMatchError(null);
    setSelectedMatch(null);
  };

  const updateMatch = async () => {
    const problem = matchProblem(selectedMatch);
    setMatchError(problem);
    if (problem) return;
    try {
      await matchStore.updateMatch(selectedMatch);
      await fetchMatches(selectedWeek as number);
      cancelEdit();
    } catch (error) {
      console.error("Error updating match:", error);
      setMatchError((error as Error).message || "Failed to save the match.");
    }
  };

  const removeMatch = async (matchId?: number | string) => {
    try {
      await matchStore.deleteMatch(Number(matchId));
      await fetchMatches(selectedWeek as number);
    } catch (error) {
      console.error("Error deleting match:", error);
    }
  };

  const teamItems = teams.map((team) => ({ value: team.id as number, title: team.name as string }));
  const mapLine = (playday: number | null) =>
    playday == null ? null : (
      <div className="flex flex-wrap items-center gap-2">
        <Icon name="mdi-map" size={18} className={roundMapId(playday) ? undefined : "text-warning"} />
        <span className="text-sm">Fixed map: {roundMapId(playday) ? getMapName(roundMapId(playday)) : "not set for this round"}</span>
        <Button variant="ghost" size="sm" nativeButton={false} render={<Link href={`/seasons/${id}/maps`} />}>
          Set on Series maps
        </Button>
      </div>
    );

  return (
    <div className="p-4">
      {isLoading ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/60">
          <Icon name="mdi-loading" size={64} className="animate-spin text-primary" />
        </div>
      ) : null}

      {/* the season list is loaded by the guard, so a null id here is a slug that names no season */}
      <StatusAlert modelValue={seasonId ? null : "Failed to load the season. Please try again later."} closable={false} />

      {/* The season is one event of the GNL league, so it wears the shared event header */}
      <EventHeader event={season} />
      <div className="mt-3 mb-4 flex flex-wrap gap-2">
        <Badge className={toneClass()}>
          <Icon name="mdi-calendar-range" />
          {season.round_count} rounds
        </Badge>
        <Badge className={toneClass()}>
          <Icon name="mdi-account-group" />
          {teams.length} teams
        </Badge>
      </div>

      {/* Series with no result, reached from the unscored count on the Seasons page */}
      {unscoredOnly ? (
        <Card className="card mb-4 gap-0 py-0">
          <CardTitle className="flex items-center gap-2 bg-primary px-4 py-3 text-on-primary">
            <Icon name="mdi-clipboard-alert" />
            Series
            <Badge variant="outline" className="ml-1 border-on-primary text-on-primary">
              No result
              <button type="button" aria-label="Clear the no result filter" onClick={() => setUnscoredOnly(false)}>
                <Icon name="mdi-close" />
              </button>
            </Badge>
          </CardTitle>
          <GroupedTable
            columns={UNSCORED_COLUMNS}
            groups={unscoredGroups}
            defaultOpen
            empty="Every series of this season has a result"
            group={({ group }) => (
              <td colSpan={UNSCORED_COLUMNS.length}>
                <strong>Round {group.key}</strong>
                <span className="ml-2 text-muted-foreground">{group.rows.length} with no result</span>
              </td>
            )}
            rows={({ group }) =>
              group.rows.map((row: Row) => (
                <tr key={row.id} className="detail-row border-b">
                  <td />
                  <td className="whitespace-nowrap">
                    <Link href={`/match/${row.match_id}`} className="text-inherit no-underline hover:underline">
                      {row.match?.team1?.name} vs {row.match?.team2?.name}
                    </Link>
                  </td>
                  <td>
                    <PlayerName player={row.player1} race={row.player1_race} mmr={row.player1_mmr} />
                  </td>
                  <td>
                    <PlayerName player={row.player2} race={row.player2_race} mmr={row.player2_mmr} />
                  </td>
                  <td className="whitespace-nowrap">{row.date_time ? formatDateTime(row.date_time) : timeMissing(row, "Not scheduled")}</td>
                  <td>
                    <CastChips series={row as CastSeries} />
                  </td>
                </tr>
              ))
            }
          />
        </Card>
      ) : null}

      {/* Round navigation tabs */}
      <Card className="card mb-4 gap-0 py-0">
        <Tabs value={selectedWeek} onValueChange={(value) => fetchMatches(Number(value))}>
          <TabsList variant="line" className="max-w-full justify-start overflow-x-auto">
            {Array.from({ length: season.round_count || 0 }, (_, i) => i + 1).map((week) => (
              <TabsTrigger key={week} value={week} className="flex-none px-3">
                <Icon name="mdi-calendar-week" />
                Round {week}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </Card>

      {/* Action Bar */}
      <Card className="card mb-4 gap-0 py-0">
        <CardTitle className="flex items-center gap-2 bg-primary px-4 py-3 text-on-primary">
          <Icon name="mdi-trophy" />
          Round {selectedWeek} matches
        </CardTitle>
        {auth.isAdmin ? (
          <CardContent className="flex flex-wrap justify-end gap-2 p-2">
            <Button variant="outline" nativeButton={false} render={<Link href={`/seasons/${id}/maps`} />}>
              <Icon name="mdi-map-outline" />
              Series maps
            </Button>
            <Button variant="outline" nativeButton={false} render={<Link href={`/seasons/${id}/achievements`} />}>
              <Icon name="mdi-trophy-variant-outline" />
              Achievements
            </Button>
            <Button onClick={openMatchCreationModal}>
              <Icon name="mdi-plus" />
              Add match
            </Button>
          </CardContent>
        ) : null}
      </Card>

      {/* Matches for the selected round */}
      {matches.length ? (
        <div className="grid gap-4 min-[1280px]:grid-cols-2">
          {matches.map((match) => (
            <Card key={match.id} className="card gap-0 py-0 transition-colors hover:border-primary">
              <CardContent className="p-4">
                {/* the whole card body opens the match, as the season team cards below do */}
                <Link href={`/match/${match.id}`} className="flex items-center gap-2 text-inherit no-underline">
                  {[
                    { team: match.team1, score: match.team1_score, other: match.team2_score },
                    null,
                    { team: match.team2, score: match.team2_score, other: match.team1_score },
                  ].map((side, i) =>
                    side ? (
                      <div key={i} className="flex-1 text-center">
                        <span className="mx-auto block size-20 overflow-hidden rounded-full border-[3px] border-primary/20 max-[959.98px]:size-15">
                          <img className="size-full object-cover" src={teamImageUrl(side.team)} alt="" onError={showDefaultTeamImage} />
                        </span>
                        <div className="mt-3 font-semibold">{side.team.name}</div>
                        <Badge className={`tnum mt-2 min-w-15 justify-center text-2xl ${scoreClass(side.score, side.other)}`}>{side.score}</Badge>
                      </div>
                    ) : (
                      <div key={i} className="flex flex-col items-center justify-center">
                        <Icon name="mdi-sword-cross" size={40} className="text-primary" />
                        <div className="mt-2 text-xs whitespace-nowrap text-muted-foreground">{roundLabel(roundOf(season, match.playday))}</div>
                      </div>
                    ),
                  )}
                </Link>

                <Separator className="my-3" />
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    {roundMapId(match.playday) ? (
                      <Badge variant="ghost">
                        <Icon name="mdi-map" />
                        {getMapName(roundMapId(match.playday))}
                      </Badge>
                    ) : usesFixedMap && !matchPlayed(match) ? (
                      <Badge variant="ghost" className="text-warning">
                        <Icon name="mdi-map-marker-alert" />
                        Round {match.playday} has no fixed map
                      </Badge>
                    ) : null}
                  </div>
                  <RowActions
                    actions={[
                      { icon: "mdi-pencil", label: "Edit match", onClick: () => editMatch(match) },
                      { icon: "mdi-delete", label: "Delete match", color: "error", onClick: () => openDeleteDialog(match.id, removeMatch) },
                    ]}
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="p-8 text-center">
          <Icon name="mdi-calendar-blank" size={64} className="text-muted-foreground" />
          <div className="mt-4 text-xl text-muted-foreground">No matches scheduled for Round {selectedWeek}</div>
          {auth.isAdmin ? (
            <Button variant="secondary" className="mt-4" onClick={openMatchCreationModal}>
              <Icon name="mdi-plus" />
              Schedule the first match
            </Button>
          ) : null}
        </div>
      )}

      {/* Teams panel */}
      <Accordion className="card mt-6 rounded-lg px-4">
        <AccordionItem value="teams">
          <AccordionTrigger className="text-lg">
            <span className="flex items-center gap-2">
              <Icon name="mdi-shield-account" />
              {`Season teams (${teams.length})`}
            </span>
          </AccordionTrigger>
          <AccordionContent>
            {auth.isCaptain ? (
              <div className="flex flex-wrap gap-2 pb-3">
                {auth.isAdmin ? (
                  <Button variant="secondary" onClick={openTeamSelectionModal}>
                    <Icon name="mdi-plus" />
                    Add teams
                  </Button>
                ) : null}
                <Button variant="secondary" nativeButton={false} render={<Link href={`/seasons/${id}/assign`} />}>
                  <Icon name="mdi-account-multiple-plus" />
                  Assign signups
                </Button>
              </div>
            ) : null}

            {teams.length ? (
              // The grid changes at 600, 960 and 1280, as the Vue grid does, not at the Tailwind defaults
              <div className="grid gap-4 min-[600px]:grid-cols-2 min-[960px]:grid-cols-3 min-[1280px]:grid-cols-4">
                {teams.map((team) => (
                  <Card key={team.id} className="card gap-0 py-0 transition-colors hover:border-primary">
                    <Link href={`/team/${team.id}/season/${id}`} className="block p-4 text-center text-inherit no-underline">
                      <span className="mx-auto block size-16 overflow-hidden rounded-full">
                        <img className="size-full object-cover" src={teamImageUrl(team)} alt="" onError={showDefaultTeamImage} />
                      </span>
                      <div className="mt-3 mb-2 text-lg">{team.name}</div>
                      <Separator className="my-2" />
                      <Badge className="mb-1 bg-success text-on-success">
                        <Icon name="mdi-trophy" />
                        {team.seasons_info[0].final_score} pts
                      </Badge>
                      <div className="flex justify-between text-xs">
                        <div className="text-left">
                          <div className="text-muted-foreground">Against:</div>
                          <div className="tnum font-bold">{team.seasons_info[0].points_against}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-muted-foreground">Available:</div>
                          <div className="tnum font-bold">{team.seasons_info[0].points_available}</div>
                        </div>
                      </div>
                    </Link>
                  </Card>
                ))}
              </div>
            ) : (
              <StatusAlert modelValue="No teams have been added to this season yet." type="info" />
            )}
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* Team Selection Dialog */}
      <Dialog open={isTeamDialogOpen} onOpenChange={(open) => (open ? setIsTeamDialogOpen(true) : closeTeamSelectionModal())}>
        <DialogContent showCloseButton={false} className="max-w-[700px] gap-0 p-0 sm:max-w-[700px]">
          <DialogTitle className="flex items-center gap-2 bg-primary px-4 py-3 text-on-primary">
            <Icon name="mdi-shield-plus" />
            Add teams to the season
          </DialogTitle>
          <DataTable
            data={availableTeams}
            empty="Every team is already in this season"
            columns={[
              {
                id: "select",
                header: "",
                enableSorting: false,
                cell: ({ row }) => (
                  <Checkbox
                    checked={selectedTeams.includes(row.original.id)}
                    onCheckedChange={(checked) =>
                      setSelectedTeams((was) => (checked ? [...was, row.original.id] : was.filter((teamId) => teamId !== row.original.id)))
                    }
                    aria-label={row.original.name}
                  />
                ),
              },
              { id: "name", accessorKey: "name", header: "Name" },
              { id: "long_name", accessorKey: "long_name", header: "Long Name" },
            ]}
          />
          <div className="flex justify-end gap-2 p-4">
            <Button variant="ghost" onClick={closeTeamSelectionModal}>
              Cancel
            </Button>
            {auth.isAdmin ? (
              <Button onClick={addTeams} disabled={!selectedTeams.length}>
                Add {selectedTeams.length} Team(s)
              </Button>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Match Dialog */}
      {newMatch ? (
        <Dialog open={isModalOpen} onOpenChange={(open) => (open ? setIsModalOpen(true) : closeMatchCreationModal())}>
          <DialogContent showCloseButton={false} className="max-w-[600px] gap-0 p-0 sm:max-w-[600px]">
            <DialogTitle className="flex items-center gap-2 bg-primary px-4 py-3 text-on-primary">
              <Icon name="mdi-calendar-plus" />
              Create a match in round {selectedWeek}
            </DialogTitle>
            <StatusAlert modelValue={matchError} className="mx-4 mt-4" onClose={() => setMatchError(null)} />
            <div className="flex flex-col gap-4 p-4">
              {usesFixedMap ? mapLine(selectedWeek) : null}
              <div className="grid gap-4 min-[960px]:grid-cols-2">
                <Pick label="Team 1" items={teamItems} value={newMatch.team1_id} onChange={(value) => setNewMatch({ ...newMatch, team1_id: value })} />
                <Pick label="Team 2" items={teamItems} value={newMatch.team2_id} onChange={(value) => setNewMatch({ ...newMatch, team2_id: value })} />
              </div>
            </div>
            <div className="flex justify-end gap-2 p-4 pt-0">
              <Button variant="ghost" onClick={closeMatchCreationModal}>
                Cancel
              </Button>
              {auth.isAdmin ? <Button onClick={confirmSelection}>Create match</Button> : null}
            </div>
          </DialogContent>
        </Dialog>
      ) : null}

      {/* Edit Match Dialog */}
      {selectedMatch ? (
        <Dialog open={editMatchDialogOpen} onOpenChange={(open) => (open ? setEditMatchDialogOpen(true) : cancelEdit())}>
          <DialogContent showCloseButton={false} className="max-w-[600px] gap-0 p-0 sm:max-w-[600px]">
            <DialogTitle className="flex items-center gap-2 bg-primary px-4 py-3 text-on-primary">
              <Icon name="mdi-pencil" />
              Edit match
            </DialogTitle>
            <StatusAlert modelValue={matchError} className="mx-4 mt-4" onClose={() => setMatchError(null)} />
            <div className="flex flex-col gap-4 p-4">
              {usesFixedMap ? mapLine(selectedMatch.playday) : null}
              <div className="grid gap-4 min-[960px]:grid-cols-2">
                <Pick
                  label="Team 1"
                  items={teamItems}
                  value={selectedMatch.team1_id}
                  onChange={(value) => setSelectedMatch({ ...selectedMatch, team1_id: value })}
                />
                <Pick
                  label="Team 2"
                  items={teamItems}
                  value={selectedMatch.team2_id}
                  onChange={(value) => setSelectedMatch({ ...selectedMatch, team2_id: value })}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 p-4 pt-0">
              <Button variant="ghost" onClick={cancelEdit}>
                Cancel
              </Button>
              {auth.isAdmin ? <Button onClick={updateMatch}>Save changes</Button> : null}
            </div>
          </DialogContent>
        </Dialog>
      ) : null}

      <ConfirmDeleteDialog
        modelValue={showDeleteDialog}
        message="Are you sure you want to delete this item? This action cannot be undone."
        onUpdateModelValue={(open) => (open ? undefined : cancelDeleteDialog())}
        onConfirm={confirmDelete}
        onCancel={cancelDeleteDialog}
      />
    </div>
  );
}

export default SeasonDetailsView;
