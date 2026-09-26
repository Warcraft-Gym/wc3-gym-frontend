"use client";
import { useEffect, useRef, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { ReportResultDialog, type ReportResultDialogHandle } from "@/components/ReportResultDialog";
import { ScheduleDialog, type ScheduleDialogHandle } from "@/components/player/ScheduleDialog";
import { SignupDialog } from "@/components/SignupDialog";
import { StatusAlert } from "@/components/StatusAlert";
import { CastedGames, NextMatches } from "@/components/home/SeriesPanels";
import { UpcomingEvents } from "@/components/home/UpcomingEvents";
import { SeasonBoard } from "@/components/home/SeasonBoard";
import { YourSeries } from "@/components/home/YourSeries";
import { backendUrl, fetchWrapper } from "@/helpers";
import { dateRange } from "@/helpers/event-labels.mjs";
import { actOnEvent, homeCards } from "@/helpers/events.mjs";
import { offersAction, ownSeries, panelOrder } from "@/helpers/home-hub.mjs";
import { useAuth, useEventStore, useSeason, useSeriesStore, useTeamStore } from "@/stores";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>;

// events.mjs is plain JS, so its defaults type the parameters; the seam names the real shapes.
const buildCards = homeCards as unknown as (input: { events: Row[]; me: Row | null; seasons: Row[] }) => Row[];

// The season the leaderboard names: the latest GNL season that has started, else the latest of all
const boardOf = (seasons: Row[]) => [...seasons].reverse().find((season) => season.phase !== "open") ?? seasons[seasons.length - 1] ?? null;

// The started seasons /me names, or, off-season, the finished board season
const ownSeasons = (mine: Row[], board: Row | null): Row[] => {
  const started = mine.filter((season) => season.signed_up && season.phase !== "open");
  if (started.length || !board || board.phase !== "complete") return started;
  return [board];
};

/** The home hub: five panels over one page. The member's own next series and last result, the next
 *  matches of the whole app, the signups still open, the latest season's standings and the casts. */
export function HomeView() {
  const eventStore = useEventStore();
  const seriesStore = useSeriesStore();
  const teamStore = useTeamStore();
  const { seasons, fetchSeasons } = useSeason();
  const { me, isAdmin } = useAuth();

  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [myEvents, setMyEvents] = useState<Row[]>([]);
  const [hub, setHub] = useState<Row | null>(null);
  // null while the read is out or once it failed; a failed read never prints an empty state
  const [boardTeams, setBoardTeams] = useState<Row[] | null>(null);
  // one /player-series answer per season the member is in, keyed by season id
  const [seasonData, setSeasonData] = useState<Row>({});
  const [acting, setActing] = useState<string | null>(null);
  const [signupEvent, setSignupEvent] = useState<Row | null>(null);

  const scheduleDialog = useRef<ScheduleDialogHandle>(null);
  const reportDialog = useRef<ReportResultDialogHandle>(null);

  const playerId = me?.user?.id ?? null;
  // The one viewer the action bar gates on, as the backend gates the writes
  const viewer = { id: playerId, isAdmin, seats: me?.seats ?? [] };
  const board = boardOf(seasons);
  const mySeasons: Row[] = ownSeasons((me?.seasons ?? []) as Row[], board);

  // The member's own two series: the first season that still pairs him, else the last he played in
  const mine = mySeasons.map((entry) => {
    const { next, last } = ownSeries(seasonData[entry.id]?.series ?? [], playerId);
    return { entry, next, last, season: { ...seasons.find((known: Row) => known.id === entry.id), ...entry } };
  });
  const own = mine.find((row) => row.next) ?? mine.find((row) => row.last) ?? null;

  const nextSeason = [...seasons].reverse().find((season: Row) => season.phase === "open" && season.id !== board?.id) ?? null;

  // Every upcoming event of every league, one row per home card, so the dialog, the GNL link and the withdraw stay
  const eventRows = buildCards({ events: myEvents, me, seasons }).map((card) => {
    const row: Row = myEvents.find((entry) => entry.id === card.id) ?? {};
    return {
      ...card,
      primary: offersAction(row) ? card.primary : null,
      dates: dateRange({ start_date: row.start, end_date: row.end }),
      chip: row.checked_in_at ? "Checked in" : row.joined ? (row.entrant_races?.length ? "Signed up as" : "Signed up") : null,
      races: row.checked_in_at ? [] : (row.entrant_races ?? []),
    };
  });

  // Every event whose row hands a captain a fixture he has still to draft; the row names its event
  const fixtures: Row[] = myEvents.filter((row) => row.captain_fixture).map((row) => ({ ...row.captain_fixture, event: row.name }));

  const loadOwn = async (entries: Row[]) => {
    const answers = await Promise.all(entries.map((season) =>
      fetchWrapper.get(`${backendUrl}/player-series?season_id=${season.id}`).catch(() => null)));
    setSeasonData(Object.fromEntries(entries.map((season, i) => [season.id, answers[i]]).filter(([, answer]) => answer)));
  };

  const reloadEvents = async () => {
    const rows = await eventStore.myEvents();
    setMyEvents(rows);
    return rows;
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

  useEffect(() => {
    let live = true;
    const load = async () => {
      setLoading(true);
      setErrorMessage(null);
      try {
        const [known, rows, series] = await Promise.all([
          fetchSeasons(),
          eventStore.myEvents(),
          // the hub's one new read: public, edge cached, once per page load
          seriesStore.homeSeries().catch(() => {
            setErrorMessage("The next matches and the casted games could not be loaded.");
            return null;
          }),
        ]);
        if (!live) return;
        setMyEvents(rows);
        setHub(series);
        const season = boardOf(known);
        const entries = ownSeasons((me?.seasons ?? []) as Row[], season);
        const [teams] = await Promise.all([
          season
            ? teamStore.fetchTeamsBySeasonBasic(season.id).catch(() => {
                setErrorMessage("The season leaderboard could not be loaded.");
                return null;
              })
            : Promise.resolve([]),
          loadOwn(entries),
        ]);
        if (!live) return;
        setBoardTeams(teams);
      } catch (error) {
        console.error("Error loading the home page:", error);
        if (live) setErrorMessage((error as Error).message || "Failed to load the home page.");
      } finally {
        if (live) setLoading(false);
      }
    };
    load();
    return () => { live = false; };
    // one read per mount; a late /me answer starts it again
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerId]);

  // the reads stand in the with-series order, so a member with a series sees no panel swap
  const order = panelOrder(loading || !!(own?.next || own?.last));

  return (
    <>
      <StatusAlert modelValue={errorMessage} onClose={() => setErrorMessage(null)} />
      <PageHeader title="Home" />

      <div className="flex flex-col gap-5 min-[960px]:grid min-[960px]:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] min-[960px]:items-start">
        <div className="contents min-[960px]:flex min-[960px]:min-w-0 min-[960px]:flex-col min-[960px]:gap-5">
          <YourSeries
            next={own?.next ?? null}
            last={own?.last ?? null}
            season={own?.season ?? null}
            nextSeason={nextSeason}
            teamId={own?.entry?.team?.id ?? null}
            playerId={playerId}
            viewer={viewer}
            loading={loading}
            order={order.own}
            onSchedule={(series) => scheduleDialog.current?.open(series)}
            onReport={(series) => reportDialog.current?.open(series)}
          />
          <NextMatches rows={hub?.next ?? []} fixtures={fixtures} loading={loading} failed={!hub} order={order.next} />
          <UpcomingEvents cards={eventRows} acting={acting} loading={loading} order={order.signup} onAct={act} />
        </div>
        <div className="contents min-[960px]:flex min-[960px]:min-w-0 min-[960px]:flex-col min-[960px]:gap-5">
          <SeasonBoard season={board} nextSeason={nextSeason} teams={boardTeams ?? []} failed={!boardTeams} loading={loading} order={order.board} />
          <CastedGames upcoming={hub?.casts_upcoming ?? []} recent={hub?.casts_recent ?? []} loading={loading} failed={!hub} order={order.cast} />
        </div>
      </div>

      {playerId ? (
        <>
          <ScheduleDialog ref={scheduleDialog} playerId={playerId} onSaved={() => loadOwn(mySeasons)} />
          <ReportResultDialog ref={reportDialog} onSaved={() => loadOwn(mySeasons)} />
        </>
      ) : null}

      {signupEvent ? (
        <SignupDialog event={signupEvent} open onOpenChange={(open) => !open && setSignupEvent(null)} onSignedUp={() => reloadEvents()} />
      ) : null}
    </>
  );
}

export default HomeView;
