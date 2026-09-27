"use client";
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { ReportResultDialog, type ReportResultDialogHandle } from "@/components/ReportResultDialog";
import { ScheduleDialog, type ScheduleDialogHandle } from "@/components/player/ScheduleDialog";
import { SignupDialog } from "@/components/SignupDialog";
import { StatusAlert } from "@/components/StatusAlert";
import { BetDialog } from "@/components/fantasy/BetDialog";
import { FantasyPanel } from "@/components/home/FantasyPanel";
import { MySeason } from "@/components/home/MySeason";
import { NextMatches } from "@/components/home/SeriesPanels";
import { OpenSignups } from "@/components/home/OpenSignups";
import { StatsPanel } from "@/components/home/StatsPanel";
import { dateRange } from "@/helpers/event-labels.mjs";
import { actOnEvent, homeCards } from "@/helpers/events.mjs";
import { creationOpen, fantasyState, openBets } from "@/helpers/fantasy-panel.mjs";
import { PANEL_ORDER, openSignups, seasonFixtures } from "@/helpers/home-hub.mjs";
import { nextAnswer } from "@/helpers/rounds.mjs";
import { achievementSummary, gnlSeasons, seasonScore, seasonsPlayed } from "@/helpers/player-summary.mjs";
import { myProfilePath } from "@/helpers/players.mjs";
import { backendUrl, fetchWrapper } from "@/helpers";
import { useAuth, useAvailabilityStore, useConfigStore, useEventStore, useFantasyStore, useLadderStore, usePlayerStore, useSeason, useSeriesStore } from "@/stores";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>;

// events.mjs is plain JS, so its defaults type the parameters; the seam names the real shapes.
const buildCards = homeCards as unknown as (input: { events: Row[]; me: Row | null; seasons: Row[] }) => Row[];

// The season Home follows: the current season the admins set (/me season_id), else the latest one
const currentOf = (seasons: Row[], currentId: number | null | undefined): Row | null =>
  seasons.find((season) => Number(season.id) === Number(currentId)) ?? seasons[seasons.length - 1] ?? null;

/** The member's Home: every panel a player needs for the week, all on the current season. An open
 *  signup, his season round by round with his answer and his series, the upcoming series, his fantasy
 *  team and bets, and his own stats. A panel shows only when it has something to say. */
export function HomeView() {
  const eventStore = useEventStore();
  const seriesStore = useSeriesStore();
  const configStore = useConfigStore();
  const availabilityStore = useAvailabilityStore();
  const fantasyStore = useFantasyStore();
  const playerStore = usePlayerStore();
  const ladderStore = useLadderStore();
  const { seasons, fetchSeasons } = useSeason();
  const { me, isAdmin } = useAuth();

  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  // a signup lands here with ?signed_up=<season>; Home confirms it once
  const signedUp = useSearchParams().get("signed_up");
  const [successMessage, setSuccessMessage] = useState<string | null>(() => (signedUp ? `You are signed up for ${signedUp}.` : null));
  const [myEvents, setMyEvents] = useState<Row[]>([]);
  const [hub, setHub] = useState<Row | null>(null);
  // the /player-series answer of the season Home lists; null while it is read or when there is none
  const [games, setGames] = useState<Row | null>(null);
  // the round whose answer is being written, so only its buttons wait
  const [savingRound, setSavingRound] = useState<number | null>(null);
  const [acting, setActing] = useState<string | null>(null);
  const [signupEvent, setSignupEvent] = useState<Row | null>(null);

  // fantasy: the panel's state, the open bets, and the series whose bet dialog is open
  const [fantasy, setFantasy] = useState<{ state: "create" | "bets" | null; rows: Row[]; loading: boolean }>({ state: null, rows: [], loading: true });
  const [betSeries, setBetSeries] = useState<Row | null>(null);

  // the stats panel; a figure is undefined while its read is out
  const [stats, setStats] = useState<Row>({});

  const scheduleDialog = useRef<ScheduleDialogHandle>(null);
  const reportDialog = useRef<ReportResultDialogHandle>(null);

  const playerId: number | null = me?.user?.id ?? null;
  // The one viewer the action bar gates on, as the backend gates the writes
  const viewer = { id: playerId, isAdmin, seats: me?.seats ?? [] };
  // every panel follows the current season: the games, the answers, the stats and fantasy
  const currentSeason = currentOf(seasons, me?.season_id);
  const currentId: number | null = currentSeason?.id ?? me?.season_id ?? null;
  // the member's own row of that season, when /me lists him in it
  const currentEntry: Row | null = ((me?.seasons ?? []) as Row[]).find((season) => Number(season.id) === Number(currentId)) ?? null;
  const fantasySeasonId: number | null = currentId;

  // The signup rows reuse the home card, so the dialog, the GNL link and the withdraw stay
  const cards = buildCards({ events: myEvents, me, seasons });
  const signupRows = openSignups(myEvents)
    .map((row: Row) => {
      const card = cards.find((entry) => entry.id === row.id);
      return card
        ? {
            ...card,
            dates: dateRange({ start_date: row.start, end_date: row.end }),
            chip: row.checked_in_at ? "Checked in" : row.joined ? (row.entrant_races?.length ? "Signed up as" : "Signed up") : null,
            races: row.checked_in_at ? [] : (row.entrant_races ?? []),
          }
        : null;
    })
    .filter(Boolean) as Row[];

  // The fixtures a captain has still to draft: the current season's sits on its round in My Season,
  // which only a member with a player row sees; every other one stays in Upcoming Series
  const drafts = seasonFixtures(myEvents, playerId ? currentId : null);

  const loadGames = async (seasonId: number | null) => {
    if (!seasonId || !playerId) return setGames(null);
    setGames(await fetchWrapper.get(`${backendUrl}/player-series?season_id=${seasonId}`).catch(() => null));
  };

  // One round's answer: the state pressed, or none when he pressed the one it holds
  const answerRound = async (playday: number, want: boolean) => {
    if (!currentId) return;
    setSavingRound(playday);
    setErrorMessage(null);
    try {
      const held = (games?.availability ?? []).find((row: Row) => row.playday === playday)?.available ?? null;
      const rows = await availabilityStore.setPlayerAvailability({ season_id: Number(currentId), playday, available: nextAnswer(held, want) });
      setGames((was) => (was ? { ...was, availability: rows } : was));
    } catch (error) {
      setErrorMessage((error as Error).message || "Your answer could not be saved.");
    } finally {
      setSavingRound(null);
    }
  };

  const reloadEvents = async () => {
    const rows = await eventStore.myEvents();
    setMyEvents(rows);
    return rows;
  };

  // The fantasy panel: nothing to read for a member with no player row
  const loadFantasy = async () => {
    if (!playerId || !fantasySeasonId) return setFantasy({ state: null, rows: [], loading: false });
    try {
      const [setting, teams] = await Promise.all([
        configStore.fetchSetting("fantasy_team_creation_enabled").catch(() => null),
        fantasyStore.searchTeams(`captain_id == ${playerId} and season_id == ${fantasySeasonId}`).catch(() => []),
      ]);
      const state = fantasyState({ open: creationOpen(setting), team: teams?.[0] ?? null });
      if (state !== "bets") return setFantasy({ state, rows: [], loading: false });
      const [series, bets] = await Promise.all([
        seriesStore.eventSeries(fantasySeasonId).catch(() => []),
        fantasyStore.searchBets(`season_id == ${fantasySeasonId} AND user_id == ${playerId}`).catch(() => []),
      ]);
      setFantasy({ state, rows: openBets(series ?? [], bets ?? []), loading: false });
    } catch {
      setFantasy({ state: null, rows: [], loading: false });
    }
  };

  // The stats panel: the GNL seasons of the history, then one cached ladder read per season
  const loadStats = async (currentId: number | null) => {
    if (!playerId) return;
    try {
      const history = await playerStore.playerHistory(playerId);
      const seasonIds: number[] = gnlSeasons(history).map((event: Row) => event.season_id);
      setStats((known) => ({ ...known, seasons: seasonsPlayed(history) }));
      const ladders = await Promise.all(
        seasonIds.map((seasonId) => ladderStore.userLadder(playerId, { seasonId }).then((ladder: Row) => ({ seasonId, ladder })).catch(() => ({ seasonId, ladder: null }))),
      );
      setStats((known) => ({ ...known, ...achievementSummary(ladders, currentId) }));
    } catch {
      setStats((known) => ({ ...known, seasons: null, thisSeason: null, overall: null, top3: [], complete: false }));
    }
  };

  // A sign up opens the home's own dialog; every other action word goes through the shared act
  const act = async (card: Row) => {
    if (card.primary.act === "sign_up") {
      setSignupEvent(await eventStore.fetchEvent(card.id));
      return;
    }
    setActing(card.key);
    setErrorMessage(
      await actOnEvent(card.primary.act, {
        store: eventStore,
        eventId: card.id,
        row: myEvents.find((row) => row.id === card.id),
        reload: reloadEvents,
      }),
    );
    setActing(null);
  };

  // the note shows once; a reload or a shared link does not repeat it
  useEffect(() => {
    if (signedUp) window.history.replaceState(null, "", "/");
  }, [signedUp]);

  useEffect(() => {
    let live = true;
    const load = async () => {
      setLoading(true);
      setErrorMessage(null);
      try {
        const [known, rows, series] = await Promise.all([
          fetchSeasons(),
          eventStore.myEvents(),
          // public, edge cached, once per page load
          seriesStore.homeSeries().catch(() => {
            setErrorMessage("The upcoming series could not be loaded.");
            return null;
          }),
        ]);
        if (!live) return;
        setMyEvents(rows);
        setHub(series);
        const seasonId = currentOf(known, me?.season_id)?.id ?? me?.season_id ?? null;
        await loadGames(seasonId);
        if (!live) return;
        setLoading(false);
        // the fantasy and stats reads come after the page has drawn; each panel waits for its own
        loadFantasy();
        loadStats(seasonId);
      } catch (error) {
        console.error("Error loading the home page:", error);
        if (live) {
          setErrorMessage((error as Error).message || "Failed to load the home page.");
          setLoading(false);
        }
      }
    };
    load();
    return () => { live = false; };
    // one read per mount; a late /me answer starts it again
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerId]);

  const seriesRows: Row[] = games?.series ?? [];
  const summary = { ...stats, score: loading ? undefined : seasonScore(seriesRows, playerId) };

  return (
    <>
      <StatusAlert modelValue={errorMessage} onClose={() => setErrorMessage(null)} />
      <StatusAlert modelValue={successMessage} type="success" onClose={() => setSuccessMessage(null)} />
      <PageHeader title="Home" />

      <div className="flex flex-col gap-5 min-[960px]:grid min-[960px]:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] min-[960px]:items-start">
        <div className="contents min-[960px]:flex min-[960px]:min-w-0 min-[960px]:flex-col min-[960px]:gap-5">
          {loading || signupRows.length ? (
            <OpenSignups cards={signupRows} acting={acting} loading={loading} order={PANEL_ORDER.signup} onAct={act} />
          ) : null}
          {playerId ? (
            <MySeason
              season={currentSeason}
              entry={currentEntry}
              data={games}
              playerId={playerId}
              viewer={viewer}
              loading={loading}
              savingRound={savingRound}
              fixture={drafts.own}
              order={PANEL_ORDER.games}
              onAnswer={answerRound}
              onSchedule={(series) => scheduleDialog.current?.open(series)}
              onReport={(series) => reportDialog.current?.open(series)}
            />
          ) : null}
          <NextMatches rows={hub?.next ?? []} fixtures={drafts.others} loading={loading} failed={!hub} order={PANEL_ORDER.next} />
        </div>
        <div className="contents min-[960px]:flex min-[960px]:min-w-0 min-[960px]:flex-col min-[960px]:gap-5">
          {playerId ? (
            <StatsPanel summary={summary} seasonName={currentSeason?.name ?? null} to={myProfilePath(me)} order={PANEL_ORDER.stats} />
          ) : null}
          {/* drawn once its reads say it has something to offer, so it never shows and then vanishes */}
          {fantasy.state ? (
            <FantasyPanel state={fantasy.state} rows={fantasy.rows} loading={false} order={PANEL_ORDER.fantasy} onBet={setBetSeries} />
          ) : null}
        </div>
      </div>

      {playerId ? (
        <>
          <ScheduleDialog ref={scheduleDialog} playerId={playerId} onSaved={() => loadGames(currentId)} />
          <ReportResultDialog ref={reportDialog} onSaved={() => loadGames(currentId)} />
        </>
      ) : null}

      {betSeries ? (
        <BetDialog
          key={betSeries.id}
          series={betSeries}
          seasonId={fantasySeasonId}
          onClose={() => setBetSeries(null)}
          onSaved={async (message) => {
            setBetSeries(null);
            setSuccessMessage(message);
            await loadFantasy();
          }}
        />
      ) : null}

      {signupEvent ? (
        <SignupDialog event={signupEvent} open onOpenChange={(open) => !open && setSignupEvent(null)} onSignedUp={() => reloadEvents()} />
      ) : null}
    </>
  );
}

export default HomeView;
