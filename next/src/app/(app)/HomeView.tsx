"use client";
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { ReportResultDialog, type ReportResultDialogHandle } from "@/components/ReportResultDialog";
import { ScheduleDialog, type ScheduleDialogHandle } from "@/components/player/ScheduleDialog";
import { SignupDialog } from "@/components/SignupDialog";
import { StatusAlert } from "@/components/StatusAlert";
import { TeamSignupDialog } from "@/components/TeamSignupDialog";
import { BetDialog } from "@/components/fantasy/BetDialog";
import { FantasyPanel } from "@/components/home/FantasyPanel";
import { MyEvents } from "@/components/home/MyEvents";
import { MySeason } from "@/components/home/MySeason";
import { NextMatches } from "@/components/home/SeriesPanels";
import { UpcomingEvents } from "@/components/home/UpcomingEvents";
import { creationOpen, fantasyState, openBets } from "@/helpers/fantasy-panel.mjs";
import { PANEL_ORDER, myEventCards, seasonFixtures, upcomingEvents } from "@/helpers/home-hub.mjs";
import { nextAnswer, sitOutUndo } from "@/helpers/rounds.mjs";
import { backendUrl, fetchWrapper } from "@/helpers";
import { useAuth, useAvailabilityStore, useBlockedTimes, useConfigStore, useEventStore, useFantasyStore, useSeason, useSeriesStore } from "@/stores";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>;

// The season Home follows: the current season the admins set (/me season_id), else the latest one
const currentOf = (seasons: Row[], currentId: number | null | undefined): Row | null =>
  seasons.find((season) => Number(season.id) === Number(currentId)) ?? seasons[seasons.length - 1] ?? null;

// What the events side reads beside GET /me/events: the events the member runs, the team
// invites and the cup series still to play; a read that fails leaves its part empty
type EventsSide = { organized: Row[]; invites: Row[]; series: Row[] };
const NO_EVENTS_SIDE: EventsSide = { organized: [], invites: [], series: [] };

/** The member's Home, in two halves. The GNL side: his season round by round with its signup, his
 *  answers and his series, every season task done and corrected there, the upcoming series and his
 *  fantasy team and bets. The events side: his own events, with the matches to report, the
 *  check-in and the invites in place, and the cups he may still sign up for. A panel shows only
 *  when it has something to say. */
export function HomeView() {
  const eventStore = useEventStore();
  const seriesStore = useSeriesStore();
  const configStore = useConfigStore();
  const availabilityStore = useAvailabilityStore();
  const fantasyStore = useFantasyStore();
  const { seasons, fetchSeasons } = useSeason();
  const { me, isAdmin } = useAuth();

  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  // a signup lands here with ?signed_up=<season>; Home confirms it once
  const signedUp = useSearchParams().get("signed_up");
  const [successMessage, setSuccessMessage] = useState<string | null>(() => (signedUp ? `You are signed up for ${signedUp}.` : null));
  const [myEvents, setMyEvents] = useState<Row[]>([]);
  const [eventsSide, setEventsSide] = useState<EventsSide>(NO_EVENTS_SIDE);
  const [hub, setHub] = useState<Row | null>(null);
  // the /player-series answer of the season Home lists; null while it is read or when there is none
  const [games, setGames] = useState<Row | null>(null);
  // the round whose answer is being written, so only its buttons wait
  const [savingRound, setSavingRound] = useState<number | null>(null);
  // the rounds the last "sit out all" turned out, each with the answer it held, and the count the ask named
  const [undo, setUndo] = useState<{ rounds: Row[]; count: number } | null>(null);
  // the cup whose signup dialog is open: a player's own signup, or a team's
  const [signupEvent, setSignupEvent] = useState<Row | null>(null);
  const [teamEvent, setTeamEvent] = useState<Row | null>(null);
  const [signupBusy, setSignupBusy] = useState<number | null>(null);

  // fantasy: the panel's state, the open bets, and the series whose bet dialog is open
  const [fantasy, setFantasy] = useState<{ state: "create" | "bets" | null; rows: Row[]; loading: boolean }>({ state: null, rows: [], loading: true });
  const [betSeries, setBetSeries] = useState<Row | null>(null);

  const scheduleDialog = useRef<ScheduleDialogHandle>(null);
  const reportDialog = useRef<ReportResultDialogHandle>(null);

  const playerId: number | null = me?.user?.id ?? null;
  // The one viewer the action bar gates on, as the backend gates the writes
  const viewer = { id: playerId, isAdmin, seats: me?.seats ?? [] };
  // every GNL panel follows the current season: the games, the answers and fantasy
  const currentSeason = currentOf(seasons, me?.season_id);
  const currentId: number | null = currentSeason?.id ?? me?.season_id ?? null;
  // the member's own row of that season, when /me lists him in it
  const currentEntry: Row | null = ((me?.seasons ?? []) as Row[]).find((season) => Number(season.id) === Number(currentId)) ?? null;
  const fantasySeasonId: number | null = currentId;

  // The events side: his own events, one card each, and the cups he may still enter, none twice
  const mine = myEventCards({ events: myEvents, ...eventsSide });
  const upcoming = upcomingEvents(myEvents, mine.map((card: Row) => card.id));

  // A captain's fixtures: every one of the current season sits on its round in My Season, which only
  // a member with a player row sees; the next one to draft of every other event stays in Upcoming Series
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
    setUndo(null); // a hand-written answer is newer than the bulk write, so the way back closes
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

  // One answer, out, for every round of the season that has not ended
  const sitOutRest = async (cards: Row[]) => {
    if (!currentId) return;
    setErrorMessage(null);
    const before: Row[] = games?.availability ?? [];
    try {
      const rows = await availabilityStore.setAllPlayerAvailability({ season_id: Number(currentId), available: false });
      setGames((was) => (was ? { ...was, availability: rows } : was));
      const back = sitOutUndo(before, rows, cards);
      setUndo(back.rounds.length ? back : null);
    } catch (error) {
      setErrorMessage((error as Error).message || "Your answers could not be saved.");
    }
  };

  // Putting the answers back one round at a time, because the bulk write takes one answer for all
  const undoSitOut = async () => {
    if (!currentId || !undo) return;
    const { rounds } = undo;
    setUndo(null);
    setErrorMessage(null);
    let rows: Row[] = [];
    try {
      for (const round of rounds) {
        rows = await availabilityStore.setPlayerAvailability({ season_id: Number(currentId), playday: round.playday, available: round.available });
      }
    } catch (error) {
      setErrorMessage((error as Error).message || "Your answers could not be saved.");
    } finally {
      // a write that fails part way still leaves the rounds it did restore on the page
      if (rows.length) setGames((was) => (was ? { ...was, availability: rows } : was));
    }
  };

  // A save in the blocked-times dialog changes the rounds the blocks cover, so the answers read again;
  // a save before the page opened is in its first read already
  const { changed: blocksChanged } = useBlockedTimes();
  const blocksSeen = useRef(blocksChanged);
  useEffect(() => {
    if (blocksSeen.current === blocksChanged) return;
    blocksSeen.current = blocksChanged;
    (async () => {
      await loadGames(currentId);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blocksChanged]);

  // A dialog's save says what it did and reads the rounds again
  const afterWrite = async (message: string) => {
    setSuccessMessage(message);
    await loadGames(currentId);
  };

  // The events side's own reads; none of them blocks the page
  const readEventsSide = async (): Promise<EventsSide> => {
    const [organized, invites, series] = await Promise.all([
      eventStore.myOrganizedEvents().catch(() => []),
      eventStore.myTeamInvites().catch(() => []),
      eventStore.myCupSeries().catch(() => []),
    ]);
    return { organized: organized ?? [], invites: invites ?? [], series: series ?? [] };
  };

  // A signup, a check-in, an invite or a report changes the events side, so all of it reads again
  const reloadEvents = async () => {
    const [rows, side] = await Promise.all([eventStore.myEvents(), readEventsSide()]);
    setMyEvents(rows);
    setEventsSide(side);
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
        seriesStore.searchSeriesBySeason(fantasySeasonId, true).catch(() => []),
        fantasyStore.searchBets(`season_id == ${fantasySeasonId} AND user_id == ${playerId}`).catch(() => []),
      ]);
      setFantasy({ state, rows: openBets(series ?? [], bets ?? []), loading: false });
    } catch {
      setFantasy({ state: null, rows: [], loading: false });
    }
  };

  // A team cup opens the team dialog; any other cup or list the player's own, on the full event
  const signUp = async (row: Row) => {
    if (Number(row.team_size) > 1) return setTeamEvent(row);
    setSignupBusy(row.id);
    try {
      setSignupEvent(await eventStore.fetchEvent(row.id));
    } catch (error) {
      setErrorMessage(`The event did not load: ${(error as Error).message}`);
    } finally {
      setSignupBusy(null);
    }
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
        const [known, rows, series, side] = await Promise.all([
          fetchSeasons(),
          eventStore.myEvents(),
          // public, edge cached, once per page load
          seriesStore.homeSeries().catch(() => {
            setErrorMessage("The upcoming series could not be loaded.");
            return null;
          }),
          readEventsSide(),
        ]);
        if (!live) return;
        setMyEvents(rows);
        setEventsSide(side);
        setHub(series);
        const seasonId = currentOf(known, me?.season_id)?.id ?? me?.season_id ?? null;
        await loadGames(seasonId);
        if (!live) return;
        setLoading(false);
        // the fantasy reads come after the page has drawn; the panel waits for its own
        loadFantasy();
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

  return (
    <>
      <StatusAlert modelValue={errorMessage} onClose={() => setErrorMessage(null)} />
      <StatusAlert modelValue={successMessage} type="success" onClose={() => setSuccessMessage(null)} />
      <PageHeader title="Home" />

      {/* the GNL panels stand on the left, the events on the right; a phone stacks them by PANEL_ORDER */}
      <div className="flex flex-col gap-5 min-[960px]:grid min-[960px]:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] min-[960px]:items-start">
        <div className="contents min-[960px]:flex min-[960px]:min-w-0 min-[960px]:flex-col min-[960px]:gap-5">
          {playerId ? (
            <MySeason
              season={currentSeason}
              entry={currentEntry}
              data={games}
              playerId={playerId}
              viewer={viewer}
              loading={loading}
              savingRound={savingRound}
              fixtures={drafts.matches}
              order={PANEL_ORDER.games}
              undo={undo}
              superadmin={!!me?.superadmin}
              onAnswer={answerRound}
              onSitOut={sitOutRest}
              onUndo={undoSitOut}
              onSchedule={(series) => scheduleDialog.current?.open(series)}
              onReport={(series) => reportDialog.current?.open(series)}
            />
          ) : null}
          <NextMatches rows={hub?.next ?? []} fixtures={drafts.others} loading={loading} failed={!hub} order={PANEL_ORDER.next} />
          {/* drawn once its reads say it has something to offer, so it never shows and then vanishes */}
          {fantasy.state ? (
            <FantasyPanel state={fantasy.state} rows={fantasy.rows} loading={false} order={PANEL_ORDER.fantasy} onBet={setBetSeries} />
          ) : null}
        </div>
        <div className="contents min-[960px]:flex min-[960px]:min-w-0 min-[960px]:flex-col min-[960px]:gap-5">
          <MyEvents
            cards={mine}
            loading={loading}
            order={PANEL_ORDER.mine}
            onChanged={reloadEvents}
            onError={setErrorMessage}
            onMessage={setSuccessMessage}
          />
          <UpcomingEvents rows={upcoming} loading={loading} order={PANEL_ORDER.upcoming} busy={signupBusy} onSignUp={signUp} />
        </div>
      </div>

      {playerId ? (
        <>
          <ScheduleDialog ref={scheduleDialog} playerId={playerId} onSaved={afterWrite} />
          <ReportResultDialog ref={reportDialog} onSaved={afterWrite} />
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
      <TeamSignupDialog
        event={teamEvent ?? {}}
        userId={playerId}
        open={!!teamEvent}
        onOpenChange={(open) => !open && setTeamEvent(null)}
        onDone={async () => {
          setSuccessMessage(`Your team is signed up for ${teamEvent?.name ?? "the cup"}. Each player you invited joins once they accept.`);
          await reloadEvents();
        }}
      />
    </>
  );
}

export default HomeView;
