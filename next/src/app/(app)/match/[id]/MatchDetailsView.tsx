/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useEffect, useRef, useState } from "react";
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
import { checkInStatus } from "@/helpers/check-in.mjs";
import { fixtureRosters } from "@/helpers/fixture.mjs";
import { seasonSlug } from "@/helpers/season-slug.mjs";
import { holdsResult, seriesEditBody } from "@/helpers/series-actions.mjs";
import { pickedInstant, pickerParts, storedUtc, viewerZone, zoneLabel } from "@/helpers/timezone.mjs";
import { useAuth, useAvailabilityStore, useEventStore, useLadderStore, useMatchStore, useSeason, useSeriesStore, useTeamStore } from "@/stores";
import { CreateSeriesDialog, type SideTeam } from "./CreateSeriesDialog";
import { EditSeriesDialog } from "./EditSeriesDialog";
import { MatchBanner } from "./MatchBanner";
import { MatchRoundNav, type RoundMatches } from "./MatchRoundNav";
import { PublishDraftDialog } from "./PublishDraftDialog";
import { PublishedSeries } from "./SeriesTables";
import { RoundPlanner } from "./plan/RoundPlanner";
import type { Row } from "./match-cells";

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

// Who cannot play this round, said or derived from the blocked times; no answer counts as available
const isOutOn = (rows: Row[] | null, playerId: number, playday?: number) =>
  checkInStatus((rows || []).find((row) => row.user_id === playerId && row.playday === playday)).short === "Out";

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

/** One match of a GNL season: the series published under it, and for its captains and the admins the
 *  round planner that fills it. */
export function MatchDetailsView({ id }: { id: string }) {
  const router = useRouter();
  const auth = useAuth();
  const matchStore = useMatchStore();
  const seriesStore = useSeriesStore();
  const teamStore = useTeamStore();
  const availabilityStore = useAvailabilityStore();
  const eventStore = useEventStore();
  const ladderStore = useLadderStore();
  const { current_season: season, fetchSeason } = useSeason();

  const smAndDown = useBreakpoint(SM_AND_DOWN);
  const matchId = Number(id);

  const [match, setMatch] = useState<Row>({});
  const [team1, setTeam1] = useState<Row>({});
  const [team2, setTeam2] = useState<Row>({});
  const [series, setSeries] = useState<Row[]>([]);
  const [draftSeries, setDraftSeries] = useState<Row[]>([]);
  const [replays, setReplays] = useState<Row[]>([]);
  const [matchesByRound, setMatchesByRound] = useState<RoundMatches[]>([]);
  const [extraPlayersById, setExtraPlayersById] = useState<Record<number, Row>>({});
  const [draftBoard, setDraftBoard] = useState<Row | null>(null);
  const [draftState, setDraftState] = useState<Row | null>(null);
  // The stamp of the last visit: undefined until the state read answers, null when this team never opened the draft
  const [seenAt, setSeenAt] = useState<string | null | undefined>(undefined);
  const [seenSent, setSeenSent] = useState(false);
  // The round answers of a team the viewer captains, or of both for an admin; null where they are not read
  const [availability1, setAvailability1] = useState<Row[] | null>(null);
  const [availability2, setAvailability2] = useState<Row[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  // Every write that has no dialog of its own reports its failure here
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [createNewSeriesDialogOpen, setCreateNewSeriesDialogOpen] = useState(false);
  const [newSeriesPlayers, setNewSeriesPlayers] = useState<number[][]>([[], []]);
  const [newSeriesIsDraft, setNewSeriesIsDraft] = useState(false);
  const [creationSeriesError, setCreationSeriesError] = useState<string | null>(null);

  const [editSeriesDialogOpen, setEditSeriesDialogOpen] = useState(false);
  const [selectedSeries, setSelectedSeries] = useState<Row | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [updateSeriesError, setUpdateSeriesError] = useState("");

  // The tab the viewer picked; until then a captain opens on the plan while the round has room
  const [tab, setTab] = useState<string | null>(null);

  // The publish confirm over one or more drafts
  const [publishDrafts, setPublishDrafts] = useState<Row[] | null>(null);
  // The published series a captain looks for a replacement for, on the plan tab
  const [replacing, setReplacing] = useState<Row | null>(null);
  // Only the answer of the open confirm is kept, so a slow replaces read of an earlier one is dropped
  const replaceAsk = useRef(0);
  const [publishLost, setPublishLost] = useState<Row | null>(null);
  const [publishError, setPublishError] = useState<string | null>(null);

  const [searchQueryTeam, setSearchQueryTeam] = useState(["", ""]);

  const [syncDialog, setSyncDialog] = useState(false);
  const [syncEntries, setSyncEntries] = useState<SyncEntry[]>([]);

  const [fixtureRows, setFixtureRows] = useState<Row[]>([]);
  const [fixtureRosterMap, setFixtureRosterMap] = useState<Record<string, Row[]>>({});

  const { showDeleteDialog, openDeleteDialog, confirmDelete, cancelDeleteDialog } = useDeleteDialog();
  // The confirm of a removal of several drafts names them; every other delete keeps the plain question
  const [deleteNote, setDeleteNote] = useState<string | null>(null);
  // The same confirm asks before a result is cleared, under its own title and button
  const [clearAsk, setClearAsk] = useState(false);

  // The season's round gives the header its dates; the match carries only the reduced season
  const roundOf = (playday?: number) => season?.rounds?.find((r: Row) => r.playday === playday) || { playday };

  // a captain plans the matches their own team plays; an admin any
  const canDraft = auth.isAdmin || [match.team1_id, match.team2_id].some((teamId) => teamId != null && auth.isCaptainOf(teamId, match.season_id));

  // The team the viewer captains in this fixture; only that team may write a seen mark,
  // and an admin passes isCaptainOf but holds no seat
  const seatTeamOf = (row: Row) => {
    const seats = (auth.me?.seats ?? []) as Row[];
    const seat = seats.find(
      (one) => Number(one.season_id) === Number(row.season_id) && [row.team1_id, row.team2_id].some((teamId) => teamId != null && Number(one.team_id) === Number(teamId)),
    );
    return seat ? Number(seat.team_id) : null;
  };
  const ownTeamId = seatTeamOf(match);

  const roster1: Row[] = team1?.player_by_season?.[match.season_id] || [];
  const roster2: Row[] = team2?.player_by_season?.[match.season_id] || [];

  const outTeam1 = (player: Row) => isOutOn(availability1, player.id, match.playday);
  const outTeam2 = (player: Row) => isOutOn(availability2, player.id, match.playday);

  const sideTeams: SideTeam[] = [
    { team: team1, roster: roster1, isOut: outTeam1 },
    { team: team2, roster: roster2, isOut: outTeam2 },
  ];

  // Full players for the series lists: rosters first, fetched extras second
  const seriesPlayerById = { ...playersOf([team1, team2]), ...extraPlayersById };
  const withFullPlayers = (row: Row): Row => ({
    ...row,
    player1: seriesPlayerById[row.player1_id] || row.player1,
    player2: seriesPlayerById[row.player2_id] || row.player2,
  });
  const enrichedSeries = series.map(withFullPlayers);
  const enrichedDraftSeries = draftSeries.map(withFullPlayers);
  // The places of the round the published series leave open; the board read carries the round size
  const openPlaces = Math.max(0, (draftBoard?.series_per_round || 0) - series.length);
  // The working largest difference of this match
  const maxDifference = draftState?.max_mmr_difference ?? draftBoard?.max_mmr_difference ?? 0;
  const activeTab = tab ?? (canDraft && draftBoard && (openPlaces > 0 || draftSeries.length > 0) ? "plan" : "series");

  const newSeriesPlayer1 = roster1.find((p) => newSeriesPlayers[0].includes(p.id));
  const newSeriesPlayer2 = roster2.find((p) => newSeriesPlayers[1].includes(p.id));

  // the editor's own zone, offset taken at the picked time
  const editorZone = zoneLabel(viewerZone(), viewerZone(), selectedDate && selectedTime ? pickedInstant(selectedDate, selectedTime) : null);
  // The edit writes the same result the report form writes: the season's best-of
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

  const fetchSeriesRows = async (seasonId: number, fresh = false) => {
    const [rows, drafts] = await Promise.all([
      seriesStore.getSeriesByMatchId(seasonId, matchId, fresh),
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

  // A captain reads their own team only, so the team they cannot read stays null
  const fetchAvailability = async (row: Row) => {
    const read = (teamId?: number): Promise<Row[] | null> =>
      teamId && auth.isCaptainOf(teamId, row.season_id) ? availabilityStore.fetchTeamAvailability(teamId, row.season_id).catch(() => null) : Promise.resolve(null);
    const [a1, a2] = await Promise.all([read(row.team1_id), read(row.team2_id)]);
    setAvailability1(a1);
    setAvailability2(a2);
  };

  const mayDraft = (row: Row) =>
    !!row?.id && (auth.isAdmin || [row.team1_id, row.team2_id].some((teamId) => teamId != null && auth.isCaptainOf(teamId, row.season_id)));

  // The state alone: the working difference and the last visit
  const fetchDraftState = async (row: Row, fresh = false) => {
    if (!mayDraft(row)) return;
    const stateRow = await seriesStore.getDraftState(row.id, fresh).catch(() => null);
    setDraftState(stateRow);
    if (stateRow) setSeenAt((was) => (was === undefined ? stateRow.seen_at ?? null : was));
  };

  // One read fills the draft board and one the draft state; both are captain-only
  const fetchDraftBoard = async (row: Row, fresh = false) => {
    if (!mayDraft(row)) return;
    const [boardRow] = await Promise.all([seriesStore.getDraftBoard(row.id, fresh).catch(() => null), fetchDraftState(row, fresh)]);
    setDraftBoard(boardRow);
  };

  // The visit is stamped when the plan first opens, so reading the published list alone
  // never clears the marks; only the viewer's own team may write it
  const markDraftSeen = () => {
    if (seenSent || !ownTeamId || !match.id) return;
    setSeenSent(true);
    seriesStore.markDraftSeen(match.id, ownTeamId).catch(() => undefined);
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

  const fetchMatchDetails = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const row: Row = await matchStore.fetchMatchDetails(matchId);
      setMatch(row);
      // The rosters, the series rows and the season navigation do not depend on each other
      const [teams, , rowsAndDrafts] = await Promise.all([
        row.team1_id && row.team2_id ? fetchTeamDetails(row) : Promise.resolve([{}, {}] as Row[]),
        fetchSeason(row.season_id).catch(() => null),
        fetchSeriesRows(row.season_id),
        fetchSeasonMatches(row),
        fetchAvailability(row),
        fetchDraftBoard(row),
      ]);
      await loadMissingSeriesPlayers(rowsAndDrafts.rows, rowsAndDrafts.drafts, playersOf(teams));
      return { row, teams };
    } catch (error) {
      console.error("Failed to fetch match details:", error);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  // Every write of the draft lands here, and a write moves the board and the state as well
  const fetchMatchSeries = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const { rows, drafts } = await fetchSeriesRows(match.season_id, true);
      await Promise.all([loadMissingSeriesPlayers(rows, drafts, seriesPlayerById), fetchDraftBoard(match, true)]);
    } catch (error) {
      console.error("Failed to fetch match series:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // the loaders set state, so they run just outside the effect body (react-hooks/set-state-in-effect)
    queueMicrotask(async () => {
      setTab(null);
      setReplacing(null); // another fixture holds none of this one's series
      const loaded = await fetchMatchDetails();
      if (loaded) await loadFixtureSeries(loaded.row, loaded.teams);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchId]);

  // Opening the plan stamps the visit, whichever way it opens
  useEffect(() => {
    if (activeTab === "plan") queueMicrotask(markDraftSeen);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, ownTeamId, match.id]);

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

  const cancelCreateSeries = () => setCreateNewSeriesDialogOpen(false);

  const editSeries = (seriesItem: Row) => {
    const copy: Row = { ...seriesItem, isDraft: false };
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
      // A date with no time is still a scheduled series: it takes midnight in the editor's zone
      const edited: Row = { ...selectedSeries, date_time: selectedDate ? storedUtc(selectedDate, selectedTime || "00:00") : null };
      // Only the fields the dialog edits, so a captain's save names no player and no fixture
      await seriesStore.updateSeries({ id: selectedSeries.id, ...seriesEditBody(edited) });
      await fetchMatchSeries();
      cancelEditSeries();
    } catch (error: any) {
      console.error("Error updating series:", error);
      setUpdateSeriesError("Error updating series: " + (error?.error || error?.message || String(error)));
    } finally {
      setIsLoading(false);
    }
  };

  // The stored row of the series in the edit, which says whether it holds a result to clear
  const editedStored = selectedSeries ? enrichedSeries.find((one) => Number(one.id) === Number(selectedSeries.id)) : null;

  const clearResult = async (seriesId?: number | string) => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      await seriesStore.clearSeriesResult(Number(seriesId));
      await fetchMatchSeries();
    } catch (error: any) {
      console.error("Failed to clear the result:", error);
      setErrorMessage(error?.error || error?.message || String(error));
    } finally {
      setIsLoading(false);
    }
  };

  // The edit closes and the confirm names the pairing; the replays stay for the next report
  const askClearResult = (item: Row) => {
    cancelEditSeries();
    setClearAsk(true);
    setDeleteNote(
      `Clear the result of ${item.player1?.name} vs ${item.player2?.name}? The score, the races played and the games go, and the series can be reported again. The replays stay.`,
    );
    openDeleteDialog(item.id, clearResult);
  };

  const createSeries = async () => {
    if (!newSeriesPlayer1 || !newSeriesPlayer2) return;
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

  // The ticked drafts leave in one run, after one confirm; a run that failed part-way still reads what it removed
  const removeDrafts = (rows: Row[]) => {
    const names = rows.map((row) => `${row.player1?.name} vs ${row.player2?.name}`).join(", ");
    setDeleteNote(`Remove ${rows.length} pairings from the draft: ${names}? This cannot be undone.`);
    openDeleteDialog(null, () =>
      runDraftWrite(async () => {
        for (const row of rows) await seriesStore.deleteDraftSeries(Number(row.id));
      }),
    );
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

  // The drafts the captain ticked; a draft that replaces a published series is published on its own,
  // with the confirm that names what is lost
  const publishAllDraftSeries = async (chosen: Row[]) => {
    const plainDrafts = chosen.filter((row) => !row.replaces_series_id);
    if (!plainDrafts.length) return;
    setIsLoading(true);
    try {
      // Start host counts from currently published series, then balance as each draft is promoted
      let { team1Hosts, team2Hosts } = countTeamHosts(enrichedSeries);
      for (const draft of plainDrafts) {
        const autoHostId = getAutoHostPlayerId(draft.player1, draft.player2, team1Hosts, team2Hosts);
        if (autoHostId !== draft.host_player_id) await seriesStore.updateDraftSeries({ ...draft, player1: undefined, player2: undefined, host_player_id: autoHostId });
        await seriesStore.promoteDraftSeries(draft.id);
        if (autoHostId === draft.player1.id) team1Hosts++;
        else team2Hosts++;
      }
      await fetchMatchSeries();
      setTab("series"); // the published series are what the captain checks next
    } catch (error: any) {
      console.error("Failed to publish all draft series:", error);
      await fetchMatchSeries(); // the drafts promoted before the failure must leave the list
      setErrorMessage(`${error.message}. The drafts still listed were not published.`);
    } finally {
      setIsLoading(false);
    }
  };

  // The one draft a replacement confirm asks about, and the published series it names
  const publishOne = publishDrafts && publishDrafts.length === 1 ? publishDrafts[0] : null;

  // The publish confirm. The replaces read fires only here, once, for the one draft it asks about.
  const openPublishAll = (chosen: Row[]) => {
    replaceAsk.current++;
    setPublishError(null);
    setPublishLost(null);
    setPublishDrafts(chosen.filter((row) => !row.replaces_series_id));
  };

  const openPublishReplace = async (item: Row) => {
    const ask = ++replaceAsk.current;
    setPublishError(null);
    setPublishLost(null);
    setPublishDrafts([item]);
    try {
      const lost = await seriesStore.getDraftReplaces(item.id);
      if (ask === replaceAsk.current) setPublishLost(lost);
    } catch (error: any) {
      // the confirm names what is lost, so a failed read blocks the publish instead of hiding it
      if (ask === replaceAsk.current) setPublishError(error?.error || error?.message || String(error));
    }
  };

  const closePublish = () => {
    replaceAsk.current++;
    setPublishDrafts(null);
    setPublishLost(null);
    setPublishError(null);
  };

  // A replacement publishes on its own: the backend makes the new series and removes the old one
  const confirmPublish = async () => {
    const rows = publishDrafts || [];
    setPublishError(null);
    if (!rows.length) return closePublish();
    if (!rows[0].replaces_series_id) {
      await publishAllDraftSeries(rows);
      return closePublish();
    }
    setIsLoading(true);
    try {
      await seriesStore.promoteDraftSeries(rows[0].id);
      await fetchMatchSeries();
      closePublish();
    } catch (error: any) {
      console.error("Failed to publish the replacement:", error);
      await fetchMatchSeries().catch(() => {});
      setPublishError(error?.error || error?.message || String(error));
    } finally {
      setIsLoading(false);
    }
  };

  // The pairing a replacement draft removes, named from the published series the page already holds
  const replacedLabel = (item: Row) => {
    if (!item.replaces_series_id) return null;
    const row = series.find((one) => Number(one.id) === Number(item.replaces_series_id));
    if (!row) return null;
    return `${seriesPlayerById[row.player1_id]?.name || row.player1?.name} vs ${seriesPlayerById[row.player2_id]?.name || row.player2?.name}`;
  };

  // A write that moves a pairing reads the whole series list; another write names the lighter read it needs.
  // It answers whether the write went through.
  const runDraftWrite = async (write: () => Promise<unknown>, read: () => Promise<unknown> = fetchMatchSeries) => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      await write();
      await read();
      return true;
    } catch (error: any) {
      console.error("Failed to write the draft:", error);
      await read().catch(() => {}); // a set that failed part-way still wrote rows, so the board reads them
      setErrorMessage(error?.error || error?.message || String(error));
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // A whole set writes in one go: the hosts count as it goes, and one read follows
  const addPairings = (pairs: { player1_id: number; player2_id: number; replaces_series_id?: number }[]) => {
    let { team1Hosts, team2Hosts } = countTeamHosts([...enrichedSeries, ...enrichedDraftSeries]);
    return runDraftWrite(async () => {
      for (const pair of pairs) {
        const hostId = team1Hosts > team2Hosts ? pair.player2_id : pair.player1_id;
        await seriesStore.createDraftSeries({ match_id: match.id, season_id: match.season_id, ...pair, host_player_id: hostId });
        if (hostId === pair.player1_id) team1Hosts++;
        else team2Hosts++;
      }
    });
  };

  // The pairing keeps its row, so the note says it changed and who changed it
  const changeOpponent = (draft: Row, side: 1 | 2, playerId: number) => {
    const leaving = draft[`player${side}_id`];
    const row: Row = { ...draft, player1: undefined, player2: undefined, [`player${side}_id`]: playerId };
    if (row.host_player_id === leaving) row.host_player_id = playerId;
    return runDraftWrite(() => seriesStore.updateDraftSeries(row));
  };

  const setMaxMmrDifference = (value: number | null) =>
    runDraftWrite(() => seriesStore.setDraftMaxMmrDifference(matchId, value), () => fetchDraftState(match, true));
  // A captain answers the round for a player of their own team: out, back to no answer, or in
  const setAnswer = (teamId: number, playerId: number, available: boolean | null) =>
    runDraftWrite(
      () => availabilityStore.setTeamAvailability(teamId, match.season_id, { user_id: playerId, playday: match.playday, available }),
      () => fetchAvailability(match),
    );
  const meetingsOf = (userA: number, userB: number) => seriesStore.playerMeetings(userA, userB);
  const pairFreeTime = (player1Id: number, player2Id: number) => availabilityStore.pairFreeTime(match.season_id, match.playday, player1Id, player2Id);
  // A player's ladder record over the event window, for the planner's stats panel; the edge caches it
  const playerLadder = (userId: number) => ladderStore.userLadder(userId, { seasonId: match.season_id });

  // The fantasy series is chosen on the draft, and publishing carries the mark onto the series
  const toggleDraftFantasyMatch = (draft: Row) =>
    runDraftWrite(() => seriesStore.updateDraftSeries({ ...draft, player1: undefined, player2: undefined, is_fantasy_match: !draft.is_fantasy_match }));

  // Each proposed replacement is a draft that names the series it replaces; publishing one removes the
  // series, and the other proposals go with it
  const setReplacement = (item: Row, pairs: { player1_id: number; player2_id: number }[]) =>
    addPairings(pairs.map((pair) => ({ ...pair, replaces_series_id: item.id })));
  // A captain of either team, or an admin, looks for a replacement of a series that holds no result
  const replaceAction = (item: Row): RowAction[] =>
    canDraft && item.player1_score == null && item.player2_score == null
      ? [
          {
            icon: "mdi-swap-horizontal",
            label: "Find a replacement",
            public: true,
            onClick: () => {
              setReplacing(item);
              setTab("plan");
            },
          },
        ]
      : [];

  const seriesActions = (item: Row): RowAction[] => [
    ...replays.filter((r) => r.series_id === item.id).map((r) => ({ icon: "mdi-download", label: `Replay game ${r.game_no}`, href: r.url, public: true })),
    { icon: "mdi-open-in-new", label: "Open series", public: true, onClick: () => router.push(`/series/${item.id}`) },
    ...replaceAction(item),
    // a captain of either team edits, vetoes and deletes the series of the match, as an admin does
    { icon: "mdi-pencil", label: "Edit series", public: canDraft, onClick: () => editSeries(item) },
    { icon: "mdi-map-outline", label: "Map veto", public: canDraft, onClick: () => router.push(`/player-series/${item.id}/veto`) },
    { icon: "mdi-delete", label: "Delete series", color: "error", public: canDraft, onClick: () => openDeleteDialog(item.id, removeSeries) },
  ];

  const seasonHref = `/seasons/${match.season ? seasonSlug(match.season) : match.season_id}`;
  const answers: Record<number, Row[]> = {};
  if (availability1 && match.team1_id != null) answers[match.team1_id] = availability1;
  if (availability2 && match.team2_id != null) answers[match.team2_id] = availability2;

  return (
    <PanelLinksContext.Provider value={true}>
      {isLoading ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/60">
          <Icon name="mdi-loading" size={64} className="animate-spin text-primary-text" />
        </div>
      ) : null}

      <MatchBanner match={match} team1={team1} team2={team2} round={roundOf(match.playday)} />

      <div className="p-4">
        <StatusAlert modelValue={errorMessage} onClose={() => setErrorMessage(null)} />

        {/* A fixture of the events module holds ordered series, each with its own mode and
            pick rule; a GNL fixture answers none and reads the lists below instead. */}
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
          <CardTitle className="flex flex-wrap items-center gap-2 banner bg-banner px-4 py-3 text-primary">
            <Icon name="mdi-trophy-variant" />
            Round {match.playday ?? ""} Series
            <span className="flex-1" />
            <Badge variant="outline" className="border-on-banner/40 text-on-banner tnum">
              {series.length} published
            </Badge>
            {canDraft ? (
              <Badge variant="outline" className="border-on-banner/40 text-on-banner tnum">
                {draftSeries.length} in draft
              </Badge>
            ) : null}
            <Button variant="ghost" size="icon-sm" className="text-on-banner" aria-label="Refresh series data" onClick={fetchMatchSeries} disabled={isLoading}>
              <Icon name={isLoading ? "mdi-loading mdi-spin" : "mdi-refresh"} />
            </Button>
          </CardTitle>
          <Tabs
            value={activeTab}
            onValueChange={(value) => {
              setTab(value as string);
              if (value !== "plan") setReplacing(null); // the replacement is looked for on the plan
            }}
          >
            <TabsList variant="line" className="w-full justify-center bg-surface-light">
              <TabsTrigger value="series" className="flex-none px-3">
                <Icon name="mdi-check-circle" />
                Series
              </TabsTrigger>
              {canDraft ? (
                <TabsTrigger value="plan" className="flex-none px-3">
                  <Icon name="mdi-account-multiple-plus" />
                  Plan round
                </TabsTrigger>
              ) : null}
            </TabsList>

            <TabsContent value="series">
              <PublishedSeries
                series={enrichedSeries}
                smAndDown={smAndDown}
                isAdmin={auth.isAdmin}
                canDraft={canDraft}
                openPlaces={openPlaces}
                formateDate={formateDate}
                seriesActions={seriesActions}
                onAddSeries={openCreateNewSeries}
                onDraftSeries={() => setTab("plan")}
                onDeleteAll={() => openDeleteDialog(null, removeAllSeries)}
              />
            </TabsContent>

            {canDraft ? (
              <TabsContent value="plan">
                <RoundPlanner
                  match={match}
                  team1={team1}
                  team2={team2}
                  board={draftBoard}
                  state={draftState}
                  maxDifference={maxDifference}
                  drafts={enrichedDraftSeries}
                  published={enrichedSeries}
                  rosters={[roster1, roster2]}
                  answers={answers}
                  ownTeamId={ownTeamId}
                  viewerId={auth.me?.user?.id ?? null}
                  narrow={smAndDown}
                  busy={isLoading}
                  seenAt={seenAt}
                  replacedLabel={replacedLabel}
                  onAnswer={setAnswer}
                  onAddPairings={addPairings}
                  onChangeOpponent={changeOpponent}
                  onSetMaxDifference={setMaxMmrDifference}
                  onToggleFantasy={toggleDraftFantasyMatch}
                  onRemoveDraft={(draft) => openDeleteDialog(draft.id, removeDraftSeries)}
                  onRemoveDrafts={removeDrafts}
                  onPublish={openPublishAll}
                  onPublishReplace={openPublishReplace}
                  replacing={replacing ? enrichedSeries.find((one) => Number(one.id) === Number(replacing.id)) ?? null : null}
                  onReplace={setReplacement}
                  onCancelReplace={() => setReplacing(null)}
                  onMeetings={meetingsOf}
                  loadFreeTime={pairFreeTime}
                  loadLadder={playerLadder}
                />
              </TabsContent>
            ) : null}
          </Tabs>
        </Card>
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
        zone={editorZone}
        editWins={editWins}
        scoreProblem={editScoreProblem}
        error={updateSeriesError}
        onSave={updateSeries}
        onClearResult={editedStored && holdsResult(editedStored) ? () => askClearResult(editedStored) : undefined}
        onCancel={cancelEditSeries}
      />

      <PublishDraftDialog
        drafts={publishDrafts}
        replaced={publishOne ? enrichedSeries.find((one) => Number(one.id) === Number(publishOne.replaces_series_id)) : null}
        lost={publishLost}
        others={publishOne?.replaces_series_id ? draftSeries.filter((row) => Number(row.replaces_series_id) === Number(publishOne.replaces_series_id)).length - 1 : 0}
        busy={isLoading}
        error={publishError}
        onErrorClose={() => setPublishError(null)}
        onConfirm={confirmPublish}
        onCancel={closePublish}
      />

      <W3CSyncResultDialog modelValue={syncDialog} entries={syncEntries} onUpdateModelValue={setSyncDialog} />

      <ConfirmDeleteDialog
        modelValue={showDeleteDialog}
        message={deleteNote ?? "Are you sure you want to delete this item? This action cannot be undone."}
        {...(clearAsk ? { title: "Clear the result", confirmLabel: "Clear result", deleteIcon: "mdi-eraser" } : {})}
        onUpdateModelValue={(open) => {
          if (open) return;
          setDeleteNote(null);
          setClearAsk(false);
          cancelDeleteDialog();
        }}
        onConfirm={() => {
          confirmDelete();
          setDeleteNote(null);
          setClearAsk(false);
        }}
        onCancel={() => {
          setDeleteNote(null);
          setClearAsk(false);
          cancelDeleteDialog();
        }}
      />
    </PanelLinksContext.Provider>
  );
}

export default MatchDetailsView;
