/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DateTime } from "luxon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Icon } from "@/components/ui/Icon";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";
import { FixtureSeries } from "@/components/FixtureSeries";
import { StatusAlert } from "@/components/StatusAlert";
import { W3CSyncResultDialog, type SyncEntry } from "@/components/W3CSyncResultDialog";
import type { RowAction } from "@/components/RowActions";
import { SM_AND_DOWN, useBreakpoint } from "@/hooks/breakpoint";
import { useDeleteDialog } from "@/hooks/delete-dialog";
import { PanelLinksContext } from "@/hooks/player-panel";
import { backendUrl, fetchWrapper } from "@/helpers";
import { gamesOf, resultProblem, winsFor } from "@/helpers/best-of.mjs";
import { resolveCurrentW3CSeason } from "@/helpers/current-season";
import { fixtureRosters } from "@/helpers/fixture.mjs";
import { seasonSlug } from "@/helpers/season-slug.mjs";
import { pickedInstant, pickerParts, storedUtc, viewerZone, zoneLabel } from "@/helpers/timezone.mjs";
import { useAuth, useAvailabilityStore, useEventStore, useMatchStore, useSeason, useSeriesStore, useTeamStore } from "@/stores";
import { CreateSeriesDialog, type SideTeam } from "./CreateSeriesDialog";
import { EditSeriesDialog } from "./EditSeriesDialog";
import { MatchBanner } from "./MatchBanner";
import { MatchRoundNav, type RoundMatches } from "./MatchRoundNav";
import { ProposeSeriesDialog } from "./ProposeSeriesDialog";
import { DraftSeries, PublishedSeries } from "./SeriesTables";
import { TeamRostersPanel } from "./TeamRostersPanel";
import { mmrOf, type Row } from "./match-cells";

const rostersOf = fixtureRosters as unknown as (series: Row[], teams: Row[], eventId: number) => Record<string, Row[]>;

// Every player the two rosters hold, by id; the series routes answer reduced players
const playersOf = (teams: Row[]) => {
  const map: Record<number, Row> = {};
  for (const team of teams) {
    for (const list of Object.values(team?.player_by_season || {})) {
      for (const player of (list as Row[]) || []) map[player.id] = player;
    }
  }
  return map;
};

// Who said they cannot play this round; no answer counts as available and nothing is ever blocked
const isOutOn = (rows: Row[], playerId: number, playday?: number) =>
  rows.some((row) => row.user_id === playerId && row.playday === playday && row.available === false);

// For every series, host_player_id === player1.id means team1 is hosting
const countTeamHosts = (seriesList: Row[]) => {
  let team1Hosts = 0;
  let team2Hosts = 0;
  for (const s of seriesList) {
    if (s.host_player_id === s.player1?.id) team1Hosts++;
    else if (s.host_player_id === s.player2?.id) team2Hosts++;
  }
  return { team1Hosts, team2Hosts };
};

// The player who hosts next to keep the counts level; player1 is always from team1
const getAutoHostPlayerId = (player1: Row, player2: Row, team1HostCount: number, team2HostCount: number) =>
  team1HostCount > team2HostCount ? player2.id : player1.id;

// A blank score field is no score at all, which Number() would read as a zero
const editedScore = (value: any) => (value === null || value === undefined || value === "" ? NaN : Number(value));

/** One match of a GNL season: its score, the series played under it, and the drafting tools
 *  a captain and an admin use to fill it. */
export function MatchDetailsView({ id }: { id: string }) {
  const router = useRouter();
  const auth = useAuth();
  const matchStore = useMatchStore();
  const seriesStore = useSeriesStore();
  const teamStore = useTeamStore();
  const availabilityStore = useAvailabilityStore();
  const eventStore = useEventStore();
  const { current_season: season, fetchSeason, fetchSeasonLadderPlayers } = useSeason();

  const smAndDown = useBreakpoint(SM_AND_DOWN);
  const matchId = Number(id);

  const [match, setMatch] = useState<Row>({});
  const [team1, setTeam1] = useState<Row>({});
  const [team2, setTeam2] = useState<Row>({});
  const [series, setSeries] = useState<Row[]>([]);
  const [draftSeries, setDraftSeries] = useState<Row[]>([]);
  const [replays, setReplays] = useState<Row[]>([]);
  const [matchesByRound, setMatchesByRound] = useState<RoundMatches[]>([]);
  // The season ladder record of every signup, by user id, for the record against each race
  const [ladderById, setLadderById] = useState<Map<number, Row>>(new Map());
  const [extraPlayersById, setExtraPlayersById] = useState<Record<number, Row>>({});
  const [availability1, setAvailability1] = useState<Row[]>([]);
  const [availability2, setAvailability2] = useState<Row[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  // Every write that has no dialog of its own reports its failure here
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [currentW3CSeason, setCurrentW3CSeason] = useState<number | undefined>(undefined);

  const [createNewSeriesDialogOpen, setCreateNewSeriesDialogOpen] = useState(false);
  const [newSeriesPlayers, setNewSeriesPlayers] = useState<number[][]>([[], []]);
  const [newSeriesIsDraft, setNewSeriesIsDraft] = useState(false);
  const [creationSeriesError, setCreationSeriesError] = useState<string | null>(null);

  const [editSeriesDialogOpen, setEditSeriesDialogOpen] = useState(false);
  const [selectedSeries, setSelectedSeries] = useState<Row | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [updateSeriesError, setUpdateSeriesError] = useState("");

  const [seriesViewTab, setSeriesViewTab] = useState("published");

  const [showProposeSeriesModal, setShowProposeSeriesModal] = useState(false);
  const [proposePlayersTeam1, setProposePlayersTeam1] = useState<number[]>([]);
  const [proposePlayersTeam2, setProposePlayersTeam2] = useState<number[]>([]);
  const [proposeSeriesMMRDiff, setProposeSeriesMMRDiff] = useState("");
  const [proposedSeries, setProposedSeries] = useState<Row[]>([]);
  const [proposePairs, setProposePairs] = useState(0); // selected pairs on the last proposal
  const [proposeExisting, setProposeExisting] = useState(0); // of those, pairs that already had a series
  const [selectedProposedSeries, setSelectedProposedSeries] = useState<string[]>([]);

  const [searchQueryTeam, setSearchQueryTeam] = useState(["", ""]);
  const [searchQuerySeries, setSearchQuerySeries] = useState("");

  const [syncDialog, setSyncDialog] = useState(false);
  const [syncEntries, setSyncEntries] = useState<SyncEntry[]>([]);

  const [fixtureRows, setFixtureRows] = useState<Row[]>([]);
  const [fixtureRosterMap, setFixtureRosterMap] = useState<Record<string, Row[]>>({});

  const { showDeleteDialog, openDeleteDialog, confirmDelete, cancelDeleteDialog } = useDeleteDialog();

  // The season's round gives the header its dates; the match carries only the reduced season
  const roundOf = (playday?: number) => season?.rounds?.find((r: Row) => r.playday === playday) || { playday };

  // a captain writes the draft of the matches their own team plays; an admin any
  const canDraft = auth.isAdmin || [match.team1_id, match.team2_id].some((teamId) => teamId != null && auth.isCaptainOf(teamId, match.season_id));

  const roster1: Row[] = team1?.player_by_season?.[match.season_id] || [];
  const roster2: Row[] = team2?.player_by_season?.[match.season_id] || [];
  // The tables hold ids, so a roster reload never leaves a selection pointing at a stale row
  const playersById = (roster: Row[], ids: number[]) => roster.filter((p) => ids.includes(p.id));

  const outTeam1 = (player: Row) => isOutOn(availability1, player.id, match.playday);
  const outTeam2 = (player: Row) => isOutOn(availability2, player.id, match.playday);
  // Already in a series on this match, published or draft; a second one is allowed by hand
  const hasSeries = (playerId: number) => [...series, ...draftSeries].some((s) => s.player1_id === playerId || s.player2_id === playerId);

  const sideTeams: SideTeam[] = [
    { team: team1, roster: roster1, isOut: outTeam1 },
    { team: team2, roster: roster2, isOut: outTeam2 },
  ];

  // Full players for the series tables: rosters first, fetched extras second
  const seriesPlayerById = { ...playersOf([team1, team2]), ...extraPlayersById };
  const withFullPlayers = (row: Row) => ({
    ...row,
    player1: seriesPlayerById[row.player1_id] || row.player1,
    player2: seriesPlayerById[row.player2_id] || row.player2,
  });
  const enrichedSeries = series.map(withFullPlayers);
  const enrichedDraftSeries = draftSeries.map(withFullPlayers);

  const newSeriesPlayer1 = playersById(roster1, newSeriesPlayers[0])[0];
  const newSeriesPlayer2 = playersById(roster2, newSeriesPlayers[1])[0];
  const selectedProposed = proposedSeries.filter((ps) => selectedProposedSeries.includes(ps.key));
  const proposedKey = (p1: Row, p2: Row) => `${p1.id}-${p2.id}`;
  const isProposeValid = proposeSeriesMMRDiff !== "";

  // the admin's own zone, offset taken at the picked time
  const adminZone = zoneLabel(viewerZone(), viewerZone(), selectedDate && selectedTime ? pickedInstant(selectedDate, selectedTime) : null);
  // An admin writes the same result the report form writes: the season's best-of
  const editWins = winsFor(gamesOf(season?.map_rules));
  const editScoreProblem = (() => {
    const p1 = editedScore(selectedSeries?.player1_score);
    const p2 = editedScore(selectedSeries?.player2_score);
    if (Number.isNaN(p1) && Number.isNaN(p2)) return null; // a series nobody has played yet
    return resultProblem(p1, p2, season?.map_rules);
  })();

  const formateDate = (dateToFormat?: string | null) => {
    if (!dateToFormat) return dateToFormat;
    // stored UTC, read in the reader's zone; the season page carries the year
    return DateTime.fromISO(dateToFormat, { zone: "UTC" })
      .toLocal()
      .toLocaleString({ month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "shortOffset" });
  };

  // Fetch the series players the rosters do not hold
  const loadMissingSeriesPlayers = async (rows: Row[], drafts: Row[], known: Record<number, Row>) => {
    const ids = new Set<number>();
    for (const row of [...rows, ...drafts]) {
      for (const playerId of [row.player1_id, row.player2_id]) {
        if (playerId && !known[playerId]) ids.add(playerId);
      }
    }
    if (ids.size === 0) return;
    const query = [...ids].map((playerId) => `id == ${playerId}`).join(" or ");
    try {
      const found = await fetchWrapper.post(`${backendUrl}/users/search?query=${encodeURIComponent(query)}`);
      setExtraPlayersById((was) => {
        const next = { ...was };
        for (const player of found || []) next[player.id] = player;
        return next;
      });
    } catch (error) {
      console.error("Failed to load series players:", error);
    }
  };

  const fetchSeriesRows = async () => {
    const [rows, drafts] = await Promise.all([
      seriesStore.getSeriesByMatchId(matchId),
      // drafts are captain-only on the backend, and a refused draft list must not blank the series table
      auth.isCaptain ? seriesStore.getDraftSeriesByMatchId(matchId).catch(() => []) : Promise.resolve([]),
      // a failed replay list must not blank the series table
      matchStore.getMatchReplays(matchId).then((found: Row[]) => setReplays(found || []), console.warn),
    ]);
    setSeries(rows || []);
    setDraftSeries(drafts || []);
    return { rows: (rows || []) as Row[], drafts: (drafts || []) as Row[] };
  };

  const fetchSeasonMatches = async (row: Row) => {
    if (!row?.season_id) return;
    try {
      const seasonMatches: Row[] = await matchStore.searchMatchesBySeason(row.season_id);
      const numberOfRounds = row.season?.round_count || Math.max(0, ...seasonMatches.map((m) => m.playday || 0));
      setMatchesByRound(
        Array.from({ length: numberOfRounds }, (_, i) => ({ roundNumber: i + 1, matches: seasonMatches.filter((m) => m.playday === i + 1) })),
      );
    } catch (error) {
      console.error("Failed to fetch season matches:", error);
    }
  };

  // A captain reads their own team only, so the team they cannot read stays empty
  const fetchAvailability = async (row: Row) => {
    const read = (teamId?: number) =>
      teamId && auth.isCaptainOf(teamId, row.season_id) ? availabilityStore.fetchTeamAvailability(teamId, row.season_id).catch(() => []) : Promise.resolve([]);
    const [a1, a2] = await Promise.all([read(row.team1_id), read(row.team2_id)]);
    setAvailability1(a1);
    setAvailability2(a2);
    return [a1, a2] as Row[][];
  };

  const fetchTeamDetails = async (row: Row) => {
    try {
      const [t1, t2] = await Promise.all([
        teamStore.getTeamDetailsSeason(row.team1_id, row.season_id),
        teamStore.getTeamDetailsSeason(row.team2_id, row.season_id),
      ]);
      setTeam1(t1);
      setTeam2(t2);
      return [t1, t2] as Row[];
    } catch (error) {
      console.error("Failed to fetch match details:", error);
      return [{}, {}] as Row[];
    }
  };

  const fetchLadderPlayers = async (row: Row) => {
    try {
      const rows: Row[] = await fetchSeasonLadderPlayers(row.season_id);
      setLadderById(new Map(rows.map((p) => [p.id, p])));
    } catch (error) {
      console.error("Failed to fetch ladder players:", error);
    }
  };

  // The ordered series this fixture holds, when the event runs it through the events module
  const loadFixtureSeries = async (row: Row, teams: Row[]) => {
    const eventId = row?.season_id;
    if (!eventId || !row?.id) return;
    const answer = await eventStore.fetchFixture(eventId, row.id).catch(() => null);
    if (!answer?.series?.length) return;
    setFixtureRows(answer.series);
    // The two teams of the fixture are already read for the header, so nothing is read twice
    setFixtureRosterMap(rostersOf(answer.series, teams, eventId));
  };

  // The default selection: everyone who did not say they cannot play this round
  const availableIds = (team: Row, rows: Row[], row: Row) =>
    ((team?.player_by_season?.[row.season_id] || []) as Row[]).filter((p) => !isOutOn(rows, p.id, row.playday)).map((p) => p.id);
  const selectAvailableTeam1 = () => setProposePlayersTeam1(roster1.filter((p) => !outTeam1(p)).map((p) => p.id));
  const selectAvailableTeam2 = () => setProposePlayersTeam2(roster2.filter((p) => !outTeam2(p)).map((p) => p.id));

  const fetchMatchDetails = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const row: Row = await matchStore.fetchMatchDetails(matchId);
      setMatch(row);
      // The rosters, the series rows and the season navigation do not depend on each other
      const [teams, , rowsAndDrafts, , availability] = await Promise.all([
        row.team1_id && row.team2_id ? fetchTeamDetails(row) : Promise.resolve([{}, {}] as Row[]),
        fetchSeason(row.season_id).catch(() => null),
        fetchSeriesRows(),
        fetchSeasonMatches(row),
        fetchAvailability(row),
        fetchLadderPlayers(row),
      ]);
      setProposePlayersTeam1(availableIds(teams[0], availability[0], row));
      setProposePlayersTeam2(availableIds(teams[1], availability[1], row));
      await loadMissingSeriesPlayers(rowsAndDrafts.rows, rowsAndDrafts.drafts, playersOf(teams));
      return { row, teams };
    } catch (error) {
      console.error("Failed to fetch match details:", error);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMatchSeries = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const { rows, drafts } = await fetchSeriesRows();
      await loadMissingSeriesPlayers(rows, drafts, seriesPlayerById);
    } catch (error) {
      console.error("Failed to fetch match series:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // the loaders set state, so they run just outside the effect body (react-hooks/set-state-in-effect)
    queueMicrotask(async () => {
      // The w3champions season does not depend on the match, so both reads start together
      const [w3cSeason, loaded] = await Promise.all([resolveCurrentW3CSeason(), fetchMatchDetails()]);
      setCurrentW3CSeason(w3cSeason ?? undefined);
      if (loaded) await loadFixtureSeries(loaded.row, loaded.teams);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchId]);

  const syncEntry = (title: string, settled: PromiseSettledResult<any>): SyncEntry =>
    settled.status === "fulfilled" ? { title, result: settled.value } : { title, error: settled.reason };

  const syncW3CTeams = async () => {
    setIsLoading(true);
    setSyncEntries([]);
    setSyncDialog(true);
    const [r1, r2] = await Promise.allSettled([
      teamStore.syncPlayersW3C(match.team1_id, match.season_id),
      teamStore.syncPlayersW3C(match.team2_id, match.season_id),
    ]);
    setSyncEntries([syncEntry(team1.name, r1), syncEntry(team2.name, r2)]);
    try {
      await fetchTeamDetails(match);
    } catch (error) {
      console.error("Failed to refresh team details after sync:", error);
    }
    setIsLoading(false);
  };

  const openCreateNewSeries = () => {
    setCreateNewSeriesDialogOpen(true);
    setNewSeriesPlayers([[], []]);
    setNewSeriesIsDraft(false);
    setCreationSeriesError(null);
  };

  const openCreateNewDraftSeries = () => {
    setCreateNewSeriesDialogOpen(true);
    setNewSeriesPlayers([[], []]);
    setNewSeriesIsDraft(true); // Force draft mode
    setCreationSeriesError(null);
  };

  const cancelCreateSeries = () => setCreateNewSeriesDialogOpen(false);

  const editSeries = (seriesItem: Row) => {
    // Mark if this is a draft for proper update routing
    const copy: Row = { ...seriesItem, isDraft: seriesViewTab === "draft" };
    setUpdateSeriesError("");
    setSelectedSeries(copy);
    const { date, time } = copy.date_time ? pickerParts(copy.date_time) : { date: null, time: null };
    setSelectedDate(date);
    setSelectedTime(time);
    setEditSeriesDialogOpen(true);
  };

  const cancelEditSeries = () => setEditSeriesDialogOpen(false);

  const updateSeries = async () => {
    if (!selectedSeries) return;
    setIsLoading(true);
    setUpdateSeriesError("");
    try {
      // A date with no time is still a scheduled series: it takes midnight in the admin's zone
      const row: Row = { ...selectedSeries, date_time: selectedDate ? storedUtc(selectedDate, selectedTime || "00:00") : null };
      // Update either draft or published series depending on type
      if (row.isDraft) await seriesStore.updateDraftSeries(row);
      else await seriesStore.updateSeries(row);
      await fetchMatchSeries();
      cancelEditSeries();
    } catch (error: any) {
      console.error("Error updating series:", error);
      setUpdateSeriesError("Error updating series: " + (error?.error || error?.message || String(error)));
    } finally {
      setIsLoading(false);
    }
  };

  const createSeries = async () => {
    // Auto-assign host to keep counts balanced between teams
    const { team1Hosts, team2Hosts } = countTeamHosts([...series, ...draftSeries]);
    const newSeries = {
      match_id: match.id,
      season_id: match.season_id,
      player1_id: newSeriesPlayer1.id,
      player2_id: newSeriesPlayer2.id,
      host_player_id: getAutoHostPlayerId(newSeriesPlayer1, newSeriesPlayer2, team1Hosts, team2Hosts),
    };
    setIsLoading(true);
    try {
      // Create as draft or published series based on checkbox
      if (newSeriesIsDraft) await seriesStore.createDraftSeries(newSeries);
      else await seriesStore.createSeries(newSeries);
      await fetchMatchSeries();
      cancelCreateSeries();
    } catch (error: any) {
      console.error("Failed to create series:", error);
      setCreationSeriesError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const removeSeries = async (seriesId?: number | string) => {
    setIsLoading(true);
    try {
      await seriesStore.deleteSeries(Number(seriesId));
      await fetchMatchDetails();
    } catch (error: any) {
      console.error("Failed to remove series:", error);
      setErrorMessage(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const removeDraftSeries = async (draftSeriesId?: number | string) => {
    setIsLoading(true);
    try {
      await seriesStore.deleteDraftSeries(Number(draftSeriesId));
      await fetchMatchSeries();
    } catch (error: any) {
      console.error("Failed to remove draft series:", error);
      setErrorMessage(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const removeAllSeries = async () => {
    setIsLoading(true);
    try {
      await seriesStore.deleteAllSeries(series);
      await fetchMatchDetails();
    } catch (error: any) {
      console.error("Failed to remove series:", error);
      setErrorMessage(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const removeAllDraftSeries = async () => {
    setIsLoading(true);
    try {
      await seriesStore.deleteAllDraftSeriesForMatch(matchId);
      await fetchMatchSeries();
    } catch (error: any) {
      console.error("Failed to remove draft series:", error);
      setErrorMessage(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const publishDraftSeries = async (draftSeriesItem: Row) => {
    setIsLoading(true);
    try {
      // Re-evaluate host against current published series before promoting
      const { team1Hosts, team2Hosts } = countTeamHosts(series);
      const autoHostId = getAutoHostPlayerId(draftSeriesItem.player1, draftSeriesItem.player2, team1Hosts, team2Hosts);
      if (autoHostId !== draftSeriesItem.host_player_id) await seriesStore.updateDraftSeries({ ...draftSeriesItem, host_player_id: autoHostId });
      await seriesStore.promoteDraftSeries(draftSeriesItem.id);
      await fetchMatchSeries();
    } catch (error: any) {
      console.error("Failed to publish draft series:", error);
      setErrorMessage(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const publishAllDraftSeries = async () => {
    if (!draftSeries.length) return;
    setIsLoading(true);
    try {
      // Start host counts from currently published series, then balance as each draft is promoted
      let { team1Hosts, team2Hosts } = countTeamHosts(series);
      for (const draft of draftSeries) {
        const autoHostId = getAutoHostPlayerId(draft.player1, draft.player2, team1Hosts, team2Hosts);
        if (autoHostId !== draft.host_player_id) await seriesStore.updateDraftSeries({ ...draft, host_player_id: autoHostId });
        await seriesStore.promoteDraftSeries(draft.id);
        if (autoHostId === draft.player1.id) team1Hosts++;
        else team2Hosts++;
      }
      await fetchMatchSeries();
    } catch (error: any) {
      console.error("Failed to publish all draft series:", error);
      await fetchMatchSeries(); // the drafts promoted before the failure must leave the list
      setErrorMessage(`${error.message}. The drafts still listed were not published.`);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleDraftFantasyMatch = async (draftSeriesItem: Row) => {
    setIsLoading(true);
    try {
      await seriesStore.updateDraftSeries({ ...draftSeriesItem, is_fantasy_match: !draftSeriesItem.is_fantasy_match });
      await fetchMatchSeries();
    } catch (error: any) {
      console.error("Failed to toggle fantasy match:", error);
      setErrorMessage(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const proposeSeries = () => {
    const kept = selectedProposed;
    const t1Players = playersById(roster1, proposePlayersTeam1);
    const t2Players = playersById(roster2, proposePlayersTeam2);
    const maxDiff = Number(proposeSeriesMMRDiff);
    const rows: Row[] = [];
    let existing = 0;

    for (const p1 of t1Players) {
      const p1Mmr = mmrOf(p1, p1.signup_race, currentW3CSeason) || 0;
      for (const p2 of t2Players) {
        // A published or draft series for this pair already exists
        if ([...series, ...draftSeries].some((s) => p1.id === s.player1_id && p2.id === s.player2_id)) {
          existing++;
          continue;
        }
        const keptSeries = kept.find((ps) => ps.key === proposedKey(p1, p2));
        if (keptSeries) {
          rows.push(keptSeries);
          continue;
        }
        const p2Mmr = mmrOf(p2, p2.signup_race, currentW3CSeason) || 0;
        if (Math.abs(p1Mmr - p2Mmr) <= maxDiff) {
          rows.push({
            key: proposedKey(p1, p2),
            match_id: match.id,
            season_id: match.season_id,
            host_player_id: p1.id,
            player1_id: p1.id,
            player1: p1,
            player1_race: p1.signup_race,
            player2_id: p2.id,
            player2: p2,
            player2_race: p2.signup_race,
          });
        }
      }
    }
    setProposePairs(t1Players.length * t2Players.length);
    setProposeExisting(existing);
    setProposedSeries(rows);
    setSelectedProposedSeries((was) => was.filter((key) => rows.some((ps) => ps.key === key)));
  };

  const openProposeSeries = () => {
    proposeSeries();
    setShowProposeSeriesModal(true);
  };
  const cancelProposeSeries = () => setShowProposeSeriesModal(false);
  const removeProposedSeries = (key?: number | string) => setProposedSeries((was) => was.filter((row) => row.key !== key));

  const createSelectedProposedSeries = async (isDraft = false) => {
    setIsLoading(true);
    try {
      // Start host counts from series already on this match
      const baseSeries = isDraft ? [...series, ...draftSeries] : [...series];
      let { team1Hosts, team2Hosts } = countTeamHosts(baseSeries);
      for (const ps of selectedProposed) {
        const hostId = getAutoHostPlayerId(ps.player1, ps.player2, team1Hosts, team2Hosts);
        const seriesWithHost = { ...ps, host_player_id: hostId };
        if (isDraft) await seriesStore.createDraftSeries(seriesWithHost);
        else await seriesStore.createSeries(seriesWithHost);
        // Track new host for subsequent iterations
        if (hostId === ps.player1.id) team1Hosts++;
        else team2Hosts++;
      }
      await fetchMatchSeries();
      cancelProposeSeries();
    } catch (error: any) {
      console.error("Failed to create series:", error);
      setErrorMessage(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const seriesActions = (item: Row): RowAction[] => [
    ...replays.filter((r) => r.series_id === item.id).map((r) => ({ icon: "mdi-download", label: `Replay game ${r.game_no}`, href: r.url, public: true })),
    { icon: "mdi-open-in-new", label: "Open series", public: true, onClick: () => router.push(`/series/${item.id}`) },
    { icon: "mdi-pencil", label: "Edit Series", onClick: () => editSeries(item) },
    { icon: "mdi-map-outline", label: "Map veto", onClick: () => router.push(`/player-series/${item.id}/veto`) },
    { icon: "mdi-delete", label: "Delete Series", color: "error", onClick: () => openDeleteDialog(item.id, removeSeries) },
  ];

  const draftActions = (item: Row): RowAction[] => [
    { icon: "mdi-pencil", label: "Edit draft", public: canDraft, onClick: () => editSeries(item) },
    {
      icon: item.is_fantasy_match ? "mdi-star-off" : "mdi-star",
      label: item.is_fantasy_match ? "Remove from Fantasy" : "Mark as Fantasy Match",
      color: item.is_fantasy_match ? "warning" : "primary",
      onClick: () => toggleDraftFantasyMatch(item),
    },
    { icon: "mdi-publish", label: "Publish Series", color: "success", onClick: () => publishDraftSeries(item) },
    { icon: "mdi-delete", label: "Delete Draft", color: "error", public: canDraft, onClick: () => openDeleteDialog(item.id, removeDraftSeries) },
  ];

  const seasonHref = `/seasons/${match.season ? seasonSlug(match.season) : match.season_id}`;

  return (
    <PanelLinksContext.Provider value={true}>
      {isLoading ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/60">
          <Icon name="mdi-loading" size={64} className="animate-spin text-primary" />
        </div>
      ) : null}

      <MatchBanner match={match} team1={team1} team2={team2} round={roundOf(match.playday)} />

      <div className="p-4">
        <StatusAlert modelValue={errorMessage} onClose={() => setErrorMessage(null)} />

        {/* A fixture of the events module holds ordered series, each with its own mode and
            pick rule; a GNL fixture answers none and reads the tables below instead. */}
        {fixtureRows.length ? <FixtureSeries className="mb-4" series={fixtureRows} rosters={fixtureRosterMap} /> : null}

        <MatchRoundNav
          match={match}
          seasonHref={seasonHref}
          matchesByRound={matchesByRound}
          isAdmin={auth.isAdmin}
          isLoading={isLoading}
          onSyncW3C={syncW3CTeams}
          onOpenMatch={(next) => (next === match.id ? undefined : router.push(`/match/${next}`))}
        />

        <Card className="card mb-4 gap-0 py-0">
          <CardTitle className="flex flex-wrap items-center gap-2 bg-primary px-4 py-3 text-on-primary">
            <Icon name="mdi-trophy-variant" />
            Series Management
            <span className="flex-1" />
            <Badge variant="outline" className="border-on-primary text-on-primary">
              {series.length} Published
            </Badge>
            {auth.isCaptain ? (
              <Badge variant="outline" className="border-on-primary text-on-primary">
                {draftSeries.length} Drafts
              </Badge>
            ) : null}
            <Button variant="ghost" size="icon-sm" className="text-on-primary" aria-label="Refresh series data" onClick={fetchMatchSeries} disabled={isLoading}>
              <Icon name={isLoading ? "mdi-loading mdi-spin" : "mdi-refresh"} />
            </Button>
          </CardTitle>

          <Tabs value={seriesViewTab} onValueChange={(value) => setSeriesViewTab(value as string)}>
            <TabsList variant="line" className="w-full justify-center bg-surface-light">
              <TabsTrigger value="published" className="flex-none px-3">
                <Icon name="mdi-check-circle" />
                Published Series
              </TabsTrigger>
              {auth.isCaptain ? (
                <TabsTrigger value="draft" className="flex-none px-3">
                  <Icon name="mdi-pencil-circle" />
                  Draft Series
                </TabsTrigger>
              ) : null}
            </TabsList>

            <TabsContent value="published">
              <PublishedSeries
                series={enrichedSeries}
                smAndDown={smAndDown}
                w3cSeason={currentW3CSeason}
                isAdmin={auth.isAdmin}
                formateDate={formateDate}
                seriesActions={seriesActions}
                onAddSeries={openCreateNewSeries}
                onDeleteAll={() => openDeleteDialog(null, removeAllSeries)}
              />
            </TabsContent>

            {auth.isCaptain ? (
              <TabsContent value="draft">
                <DraftSeries
                  draftSeries={enrichedDraftSeries}
                  smAndDown={smAndDown}
                  w3cSeason={currentW3CSeason}
                  seasonId={match.season_id}
                  ladderById={ladderById}
                  isAdmin={auth.isAdmin}
                  canDraft={canDraft}
                  draftActions={draftActions}
                  onAddDraftSeries={openCreateNewDraftSeries}
                  onPublishAll={publishAllDraftSeries}
                  onDeleteAll={() => openDeleteDialog(null, removeAllDraftSeries)}
                />
              </TabsContent>
            ) : null}
          </Tabs>
        </Card>

        {/* Team rosters and the proposal tools; proposing series is an admin write */}
        {auth.isAdmin ? (
          <TeamRostersPanel
            team1={team1}
            team2={team2}
            roster1={roster1}
            roster2={roster2}
            selected1={proposePlayersTeam1}
            onSelected1Change={setProposePlayersTeam1}
            selected2={proposePlayersTeam2}
            onSelected2Change={setProposePlayersTeam2}
            search={searchQueryTeam}
            onSearchChange={(side, value) => setSearchQueryTeam((was) => was.map((one, i) => (i === side ? value : one)))}
            outTeam1={outTeam1}
            outTeam2={outTeam2}
            hasSeries={hasSeries}
            onSelectAvailableTeam1={selectAvailableTeam1}
            onSelectAvailableTeam2={selectAvailableTeam2}
            mmrDiff={proposeSeriesMMRDiff}
            onMmrDiffChange={setProposeSeriesMMRDiff}
            canPropose={isProposeValid}
            onPropose={openProposeSeries}
            w3cSeason={currentW3CSeason}
          />
        ) : null}
      </div>

      <CreateSeriesDialog
        open={createNewSeriesDialogOpen}
        sideTeams={sideTeams}
        selected={newSeriesPlayers}
        onSelectedChange={(side, ids) => setNewSeriesPlayers((was) => was.map((one, i) => (i === side ? ids : one)))}
        search={searchQueryTeam}
        onSearchChange={(side, value) => setSearchQueryTeam((was) => was.map((one, i) => (i === side ? value : one)))}
        isDraft={newSeriesIsDraft}
        onIsDraftChange={setNewSeriesIsDraft}
        w3cSeason={currentW3CSeason}
        isAdmin={auth.isAdmin}
        isLoading={isLoading}
        error={creationSeriesError}
        onErrorClose={() => setCreationSeriesError(null)}
        onSyncW3C={syncW3CTeams}
        onCreate={createSeries}
        onCancel={cancelCreateSeries}
      />

      <EditSeriesDialog
        open={editSeriesDialogOpen}
        series={selectedSeries}
        onPatch={(part) => setSelectedSeries((was) => ({ ...was, ...part }))}
        date={selectedDate}
        onDateChange={setSelectedDate}
        time={selectedTime}
        onTimeChange={setSelectedTime}
        adminZone={adminZone}
        editWins={editWins}
        scoreProblem={editScoreProblem}
        error={updateSeriesError}
        onSave={updateSeries}
        onCancel={cancelEditSeries}
      />

      {showProposeSeriesModal ? (
        <ProposeSeriesDialog
          open={showProposeSeriesModal}
          team1={team1}
          team2={team2}
          proposed={proposedSeries}
          selected={selectedProposedSeries}
          onSelectedChange={setSelectedProposedSeries}
          search={searchQuerySeries}
          onSearchChange={setSearchQuerySeries}
          pairs={proposePairs}
          existing={proposeExisting}
          ladderById={ladderById}
          seasonId={match.season_id}
          w3cSeason={currentW3CSeason}
          hasSeries={hasSeries}
          errorMessage={errorMessage}
          onErrorClose={() => setErrorMessage(null)}
          onRemove={(key) => openDeleteDialog(key, removeProposedSeries)}
          onCreate={createSelectedProposedSeries}
          onCancel={cancelProposeSeries}
        />
      ) : null}

      <W3CSyncResultDialog modelValue={syncDialog} entries={syncEntries} onUpdateModelValue={setSyncDialog} />

      <ConfirmDeleteDialog
        modelValue={showDeleteDialog}
        message="Are you sure you want to delete this item? This action cannot be undone."
        onUpdateModelValue={(open) => (open ? undefined : cancelDeleteDialog())}
        onConfirm={confirmDelete}
        onCancel={cancelDeleteDialog}
      />
    </PanelLinksContext.Provider>
  );
}

export default MatchDetailsView;
