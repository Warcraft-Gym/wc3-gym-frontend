"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Icon } from "@/components/ui/Icon";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toneClass } from "@/components/ui/tone";
import { Note } from "@/components/ui/Note";
import { ColumnNote } from "@/components/ColumnNote";
import { EventHeader } from "@/components/EventHeader";
import { EventResults } from "@/components/EventResults";
import { HistoricalBoard } from "@/components/koth/HistoricalBoard";
import { KothNightBoard } from "@/components/koth/KothNightBoard";
import { StreamLinks } from "@/components/koth/StreamLinks";
import { HIDE_RESULTS, useHideResultsSwitch } from "@/components/hide-results";
import { PlayerName } from "@/components/PlayerName";
import { RaceIcon } from "@/components/RaceIcon";
import { SignupDialog } from "@/components/SignupDialog";
import { StageView } from "@/components/StageView";
import { StatusAlert } from "@/components/StatusAlert";
import { placeIcon, placeMedal, placings } from "@/helpers/awards.mjs";
import { byPlayer, bySeed, bySignup, cupRosters, entrantName, raceRows, rostersByEntrant, signupCount } from "@/helpers/entrants.mjs";
import { FORMATS, SCHEDULING_MODES, SERIES_PER_ENTRANT_PER_ROUND, seriesPerEntrant, seriesPerFixture, stateOf, titleOf } from "@/helpers/event-labels.mjs";
import { actOnEvent, blocksHint, eventActionButton, leaveWord } from "@/helpers/events.mjs";
import { myRaces } from "@/helpers/koth.mjs";
import { raceWrapper } from "@/helpers/races.js";
import { saveReturnUrl } from "@/helpers/return-url.mjs";
import { seasonSlug } from "@/helpers/season-slug.mjs";
import { useAuth, useEventStore, useTeamStore } from "@/stores";
import { useEventRunner } from "@/hooks/event-runner";
import { ReportResultDialog, type ReportResultDialogHandle } from "@/components/ReportResultDialog";
import { lobbyReportOf, reportOf, vetoOf } from "@/helpers/series-actions.mjs";
import { isLobby } from "@/helpers/stage-view.mjs";
import { LobbyPlacesDialog } from "@/components/LobbyPlacesDialog";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { VetoBoard } from "@/components/VetoBoard";
import { TeamCupPanel } from "@/components/TeamCupPanel";
import { teamIdsOf } from "@/helpers/cup-teams.mjs";
import { backendUrl, fetchWrapper } from "@/helpers";
import { eligibilityLines, joinsWaitlist, waitlistNote, waitlistOf } from "@/helpers/events-page.mjs";
import { homeTab, tabOf, withTab } from "@/helpers/event-tabs.mjs";
import { bestOfLine, parsePlan } from "@/helpers/best-of-plan.mjs";
import { rulesOf } from "@/helpers/map-order.mjs";
import { cn } from "@/lib/utils";
import { livesLine } from "@/helpers/cup-wizard.mjs";
import { legsOf, legTitle, openLegIndex, ownEntry } from "@/helpers/cup-rounds.mjs";
import { CupMapPool } from "@/components/CupMapPool";
import { CupOverallTable } from "@/components/CupOverallTable";
import { CupRoundPicker } from "@/components/CupRoundPicker";
import { CupTeamName } from "@/components/CupTeamName";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>;

const phoneCell = "hidden min-[960px]:table-cell";
// a bracket's places sit on the results tab, so its draw tab carries no table under it
const BRACKETS = ["single_elimination", "double_elimination", "placement"];
const raceName = (race: string) => raceWrapper.getRaceObject(race)?.name || race;
const MEDAL_TEXT: Record<string, string> = { "medal-gold": "text-medal-gold", "medal-silver": "text-medal-silver", "medal-bronze": "text-medal-bronze" };
// The helpers are plain JS, so their defaults type the parameters; the seam names the real shapes.
const placesOf = placings as (standings: Row[]) => Record<string, Row>;
const rostersOf = rostersByEntrant as unknown as (entrants: Row[], teams: Row[], eventId: number) => Record<string, Row[]>;
const act_ = actOnEvent as unknown as (action: string, options: Record<string, unknown>) => Promise<string | null>;

/** One event, open to everyone: what it is, how it plays, who is in it, and the one thing the
 *  reader can do about it. An event with no stage is a sign-up list, so it reads its entrants
 *  against the cap in place of the stage table. A GNL season keeps its own pages, so this one
 *  links to them rather than redrawing them. A KOTH night draws its board, live or archived, in
 *  place of the entrants and the stages, and `?mode=clean` draws it for a stream. The spoiler switch is the reader's own, kept in this
 *  browser. */
export function EventView({ id }: { id: string }) {
  const router = useRouter();
  const search = useSearchParams();
  const clean = search.get("mode") === "clean";
  const auth = useAuth();
  const store = useEventStore();
  const teamStore = useTeamStore();
  // who runs the event: an admin, or an organizer it names; the page names them and links the run page
  const runner = useEventRunner(id);

  const [board, setBoard] = useState<Row | null>(null); // a KOTH night's board, in place of its entrants and stages
  const [event, setEvent] = useState<Row | null>(null);
  const [leagues, setLeagues] = useState<Row[]>([]);
  const [entrants, setEntrants] = useState<Row[]>([]);
  const [rosters, setRosters] = useState<Record<string, Row[]>>({}); // the players each team entrant fields, so a series box names them
  const [row, setRow] = useState<Row | null>(null); // the caller's own row of /me/events; null for a reader who is not logged in
  const [teamInvites, setTeamInvites] = useState<Row[]>([]); // a team cup: the invitations the caller has not answered
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | boolean>(false); // true, or the race on its way out
  const [answering, setAnswering] = useState(false);
  const [stageData, setStageData] = useState<Record<string, Row>>({});
  const [dialog, setDialog] = useState(false);
  // A cup played over rounds shows one round's draw at a time
  const [legIndex, setLegIndex] = useState(0);
  // the overall table's rows, which place a finished cup over rounds on its podium
  const [overallRows, setOverallRows] = useState<Row[]>([]);
  const [error, setError] = useState<string | null>(null);

  // The switch is per viewer and per browser, not per event, and every stage drawing reads it
  const [hideResults, setHideResults] = useHideResultsSwitch();
  // The tab the address names; a pick writes it back, so a link opens the same tab
  // An address with no tab opens the page's own first tab, which is the results of a finished event
  const [picked, setPicked] = useState<string | null>(() => search.get("tab"));
  const home = homeTab(event);
  const tab = tabOf(picked, home);
  const pickTab = (value: string) => {
    setPicked(value);
    window.history.replaceState(window.history.state, "", withTab(window.location.href, value, home));
  };

  const anonymous = !auth.me;
  // A GNL season signs up on its own page, so it offers no entrant action here
  const keepsEntrants = event?.kind !== "gnl";
  const league = leagues.find((one) => one.id === event?.league_id) || null;
  const stages: Row[] = [...(event?.stages || [])].sort((a, b) => a.position - b.position);
  // The seed column reads once a stage locked its order, and never where the event hides every seed
  const seedsLocked = stages.some((stage) => stage.seeds_locked_at) && entrants.some((row) => row.seed != null);
  // An event that plays no stage is a sign-up list: the entrants are the whole page
  const signupOnly = !!event && !stages.length;
  // An event that plays stages reads as tabs: the draw, who is in, and the results. A GNL season
  // and a sign-up list keep their one page.
  const tabbed = !!event && keepsEntrants && !signupOnly;
  // The tabs open on the draw, so a tabbed page drops the "view" word that only pointed at it
  // a team cup signs teams up through its own panel, so the one-player action stays off
  const button = keepsEntrants && !event?.team_size && !(tabbed && row?.action === "view") ? eventActionButton(row?.action) : null;
  const leaving = leaveWord(row, event);
  const hint = blocksHint(row);
  // the caller's entry waits on the cup's waitlist, the action then being its leave or its check-in
  const waiting = !!row?.waitlisted || row?.action === "waitlisted";
  const held: string[] = myRaces(entrants, auth.me?.user?.id);
  // The chip counts players: a player on two races holds two rows and is one entrant
  const entered = entrants.length ? byPlayer(entrants).length : event?.entrant_count ?? 0;

  const solo = (item: Row) => !raceRows(item).length;
  // A cup that splits its players lists them by division; every other event lists one field
  const listed: Row[] = byPlayer(entrants.filter((entrant) => !entrant.waitlisted_at));
  const cupDivisions: Row[] = event?.kind === "cup" && event?.uses_divisions ? [...(event?.divisions || [])].sort((a: Row, b: Row) => a.position - b.position) : [];
  const looseRows = listed.filter((entrant) => !cupDivisions.some((division) => division.id === entrant.division_id));
  const participantBlocks: { key: string; title: string | null; rows: Row[] }[] = cupDivisions.length
    ? [
        ...cupDivisions.map((division) => ({ key: String(division.id), title: division.name as string, rows: listed.filter((entrant) => entrant.division_id === division.id) })),
        ...(looseRows.length ? [{ key: "loose", title: "Not in a division yet", rows: looseRows }] : []),
      ]
    : [{ key: "all", title: null, rows: listed }];
  const divisionName = (band: Row) => {
    const division = (event?.divisions || []).find((one: Row) => one.id === band.division_id);
    return division ? division.name || `Division ${division.position}` : null;
  };

  // A fixture pairs two team entrants, so a solo event reads no fixture chip
  // a team cup plays one team game a match, so it names no series per fixture
  const fixtureSeries = event?.team_size ? null : seriesPerFixture(event);

  // A phone drops the format, the series count and the scheduling columns, so they ride under the name
  const phoneLine = (stage: Row) =>
    [titleOf(FORMATS, stage.format), seriesPerEntrant(stage) ? `${seriesPerEntrant(stage)} series each entrant a round` : null, titleOf(SCHEDULING_MODES, stage.scheduling_mode)]
      .filter(Boolean)
      .join(" · ");

  // Only the stages that hold series are drawn; the table above lists every stage
  const drawn = stages.map((stage) => ({ ...stage, ...(stageData[stage.id] || {}) })).filter((stage) => stage.series?.length);
  // A cup over rounds reads the draw and the results of the round picked, and adds them up overall
  const legs: Row[] = legsOf(event);
  const leg: Row | null = legs[legIndex] || null;
  const inLeg = (stage: Row) => !leg || leg.stage_ids.includes(stage.id);
  const shownStages = stages.filter(inLeg);
  const shownDrawn = drawn.filter(inLeg);

  // Who reads the draw, as the report rule asks: the player row, the seats, and whether they run
  // the event; a reader who is not logged in reports nothing
  // a team cup's side is acted for by its own players, so the draw knows the caller's teams
  const viewer = { id: auth.me?.user?.id ?? null, isAdmin: auth.isAdmin, runs: runner.runs, seats: auth.me?.seats ?? [], teamIds: event?.team_size ? (teamIdsOf(entrants, auth.me?.user?.id) as number[]) : null };
  // A finished or cancelled cup takes no series write until it is reopened, so it offers no report and no veto
  const reports = !anonymous && !(event?.kind === "cup" && event.closed_at);
  // The caller's own next series to report, as a player or a captain: the prompt over the draw
  const mine = reports
    ? drawn
        .flatMap((stage) => (stage.series as Row[]).map((row) => ({ row, stage })))
        .find(({ row }) => reportOf(row, { id: viewer.id, seats: viewer.seats, teamIds: viewer.teamIds }) === "report" || lobbyReportOf(row, { id: viewer.id }) === "report") ?? null
    : null;
  // The report dialog opens in place on the series it reads afresh, as the series page does;
  // a cup's series read and report on the cup's own routes
  const reportDialog = useRef<ReportResultDialogHandle>(null);
  const cup = event?.kind === "cup";
  // The map veto of one series, opened in place from the draw or from the waiting match
  const [vetoing, setVetoing] = useState<Row | null>(null);
  // A Discord message links each series to its veto with ?veto=<id>: once the draw is read the veto
  // opens for a side of that series, by the same rule as the draw's Veto button, until it is closed;
  // anyone else reads the draw with that series in view
  const vetoLink = Number(search.get("veto")) || null;
  const [linkClosed, setLinkClosed] = useState(false);
  const linked = vetoLink && !linkClosed ? drawn.flatMap((stage) => stage.series as Row[]).find((one) => one.id === vetoLink) ?? null : null;
  const linkedVeto = linked && reports && vetoOf(linked, viewer) ? linked : null;
  const shownVeto = vetoing ?? linkedVeto;
  useEffect(() => {
    if (linked && !linkedVeto) document.getElementById(`series-${linked.id}`)?.scrollIntoView({ block: "center" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linked?.id]);
  // a lobby takes its places in the places dialog instead of a score
  const [placing, setPlacing] = useState<Row | null>(null);
  const [placingError, setPlacingError] = useState<string | null>(null);
  const [placingSaving, setPlacingSaving] = useState(false);
  const openReport = async (row: Row) => {
    if (isLobby(row)) {
      setPlacingError(null);
      setPlacing(row);
      return;
    }
    try {
      const full = await fetchWrapper.get(`${backendUrl}/${cup ? "cup-series" : "series"}/${row.id}`);
      reportDialog.current?.open({ ...full, entrant1_id: row.entrant1_id ?? null, entrant2_id: row.entrant2_id ?? null });
    } catch (e) {
      setError(`The series did not load: ${(e as Error).message}`);
    }
  };

  // Closing an event freezes the table of its last stage as the places it awards, so a
  // finished event names its champion and every other place off that table.
  // a cup over rounds places its players on the overall table instead
  // a cancelled cup awards no place
  const places: Record<string, Row> = stateOf(event) !== "finished" || legs.length || event?.cancelled_at ? {} : placesOf(drawn.at(-1)?.standings || []);

  const logIn = () => {
    saveReturnUrl(window.location.pathname + window.location.search);
    router.push("/login");
  };

  // The entrant list and the caller's own row move together: a signup changes both
  const reload = async (loaded: Row = event as Row) => {
    const [rows, mine] = await Promise.all([
      // reload follows a signup, a withdraw or a report, so it never takes a kept copy
      store.fetchEntrants(loaded.id, true),
      // the caller's row lives behind a login; a read that fails says so instead of reading as closed
      auth.me
        ? store.myEvents().catch((e: Error) => {
            setError(`Your own entry did not load: ${e.message}`);
            return [];
          })
        : Promise.resolve([]),
    ]);
    // a cup not drawn yet lists nobody who left, though a row kept from before that rule remains
    const listed = loaded.kind === "cup" && !loaded.drawn ? rows.filter((one: Row) => !one.withdrawn_at) : rows;
    const list = (loaded.stages || []).length ? bySeed(listed) : bySignup(listed);
    setEntrants(list);
    setRow(mine.find((one: Row) => one.id === loaded.id) ?? null);
    // a team cup reads the invitations of the caller, for its panel
    if (auth.me && loaded.team_size) setTeamInvites(await store.myTeamInvites().catch(() => []));
    // a cup team's entrant row carries its players; another team event reads its league teams
    if (loaded.kind === "cup") setRosters(cupRosters(rows));
    else if (loaded.entrant_kind === "team") {
      const teams = await teamStore.fetchTeamsBySeason(loaded.id).catch(() => []);
      setRosters(rostersOf(rows, teams, loaded.id));
    }
  };

  // Every stage's series and table; a report from the draw reads them again, fresh
  const loadDrawings = async (loaded: Row = event as Row, fresh = false) => {
    const drawings = await Promise.all(
      [...(loaded.stages || [])].map(async (stage: Row) => {
        // A stage nobody has generated answers nothing, and its drawing stays off the page
        const [rows, table] = await Promise.all([store.fetchStage(loaded.id, stage.id, fresh).catch(() => null), store.fetchStandings(loaded.id, stage.id, fresh).catch(() => [])]);
        return rows ? ([stage.id, { ...rows, standings: table }] as const) : null;
      }),
    );
    setStageData(Object.fromEntries(drawings.filter(Boolean) as [string, Row][]));
  };

  // One action word, one thing to do. The dialog and the draw are this page's own; every
  // other word goes through the shared act.
  const act = async (race: string | null = null, action = row?.action) => {
    if (action === "sign_up") return setDialog(true);
    if (action === "view") {
      pickTab("draw");
      return document.getElementById("the-draw")?.scrollIntoView({ behavior: "smooth" });
    }
    setActing(race ?? (action === row?.action ? true : action));
    setError(await act_(action, { store, eventId: event!.id, row, reload, race, raceName: race ? raceName(race) : race, drawn: drawn.length > 0 }));
    setActing(false);
  };

  // The caller answers the next round himself; the hint only said what his blocks cover
  const answerBlocked = async () => {
    setAnswering(true);
    try {
      await store.answerRound(row, false);
      await reload();
    } catch (e) {
      setError(`That did not go through: ${(e as Error).message}`);
    } finally {
      setAnswering(false);
    }
  };

  useEffect(() => {
    const load = async () => {
      try {
        const [loaded, leagueRows] = await Promise.all([store.fetchEvent(Number(id)), store.fetchLeagues()]);
        // A night shows its board or nothing: the event and the board land in one render, so the
        // stages-and-entrants page of other events never flashes ahead of the board, on a stream least of all
        const night =
          loaded.kind === "koth"
            ? await store.fetchBoard(loaded.id).catch((e: Error) => {
                setError(`The event did not load: ${e.message}`);
                return null;
              })
            : null;
        setEvent(loaded);
        setLegIndex(openLegIndex(legsOf(loaded)));
        setLeagues(leagueRows);
        setBoard(night);
        if (night) return;
        await reload(loaded);
        await loadDrawings(loaded);
      } catch (e) {
        setError(`The event did not load: ${(e as Error).message}`);
      } finally {
        setLoading(false);
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (board && event) {
    const runLink = auth.isAdmin ? (
      <Button nativeButton={false} size="sm" variant="outline" className="text-primary-text" render={<Link href={`/koth/nights/${event.id}`} />}>
        <Icon name="mdi-play-circle-outline" />
        Run the event
      </Button>
    ) : null;
    // an admin puts the night on a stream without typing the clean link
    const adminLinks = runLink ? (
      <>
        {runLink}
        <StreamLinks eventId={event.id} />
      </>
    ) : null;
    return (
      <>
        <StatusAlert modelValue={error} onClose={() => setError(null)} />
        <EventHeader event={event} league={league} />
        {board.historical ? (
          <>
            {runLink ? <div className="mt-4 flex flex-wrap gap-2">{runLink}</div> : null}
            <HistoricalBoard board={board} />
          </>
        ) : (
          <KothNightBoard event={event} board={board} clean={clean} onError={setError}>
            {adminLinks}
          </KothNightBoard>
        )}
      </>
    );
  }

  // The best-of a stage plays: one for every match, or the early rounds and each part with its own
  // a free for all lobby is one game, so its line names no best-of
  const bestOfOf = (stage: Row) =>
    stage.format === "ffa" ? null : stage.best_of_by_round ? bestOfLine(stage.best_of, parsePlan(stage.best_of_by_round), stage.format) : `Best of ${stage.best_of}`;
  // One line a stage: what it plays, for the draw tab before and over the bracket
  const stageLine = (stage: Row) =>
    [
      event?.custom_game ? `Custom game on ${event.maps?.[0]?.name ?? "one map"}` : null,
      shownStages.length > 1 ? stage.name || `Stage ${stage.position}` : null, titleOf(FORMATS, stage.format), stage.format === "placement" ? livesLine(stage.placement_lives) : null, bestOfOf(stage), seriesPerEntrant(stage) ? `${seriesPerEntrant(stage)} series each entrant a round` : null, titleOf(SCHEDULING_MODES, stage.scheduling_mode)]
      .filter(Boolean)
      .join(" · ");

  const hideSwitch = (
    <Label className="flex items-center gap-2">
      <Switch checked={hideResults} onCheckedChange={setHideResults} />
      Hide results
    </Label>
  );

  // The pieces of the page; the tabs and the one page lay them out
  const sections = {
    stages: (
      <Card className="card mt-4">
        <CardHeader>
          <CardTitle>Stages</CardTitle>
        </CardHeader>
        <CardContent className="px-0">
          <div className="table-scroll overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead style={{ width: "56px" }}>#</TableHead>
                  <TableHead>Stage</TableHead>
                  <TableHead className={phoneCell}>Format</TableHead>
                  <TableHead className="text-right">Best of</TableHead>
                  <TableHead className={cn("text-right", phoneCell)}>
                    <ColumnNote title="Series per entrant" note={SERIES_PER_ENTRANT_PER_ROUND} />
                  </TableHead>
                  <TableHead className={phoneCell}>Scheduling</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stages.map((stage) => (
                  <TableRow key={stage.position}>
                    <TableCell>{stage.position}</TableCell>
                    <TableCell className="py-3">
                      {stage.name || `Stage ${stage.position}`}
                      <div className="text-xs text-muted-foreground min-[960px]:hidden">{phoneLine(stage)}</div>
                    </TableCell>
                    <TableCell className={phoneCell}>{titleOf(FORMATS, stage.format)}</TableCell>
                    <TableCell className="text-right">{stage.best_of}</TableCell>
                    <TableCell className={cn("text-right", phoneCell)}>{seriesPerEntrant(stage) ?? "—"}</TableCell>
                    <TableCell className={phoneCell}>{titleOf(SCHEDULING_MODES, stage.scheduling_mode)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    ),

    /* Who is in. A seed reads only once a stage locked its order, so it means something.
       A sign-up list counts its entrants against the cap and prints what each one wrote. */
    entrants: (
      <Card className={cn("card", !tabbed && "mt-4")}>
        <CardHeader>
          <CardTitle>{signupOnly ? "Sign-ups" : tabbed ? "Participants" : "Entrants"}</CardTitle>
          {signupOnly ? <div className="text-sm text-muted-foreground">{signupCount(event as Row, entrants)}</div> : null}
        </CardHeader>
        <CardContent className="px-0">
          {entrants.length ? (
            participantBlocks.map((block) => (
            <div key={block.key}>
            {block.title ? <h3 className="mt-3 px-4 text-sm font-bold text-muted-foreground uppercase">{block.title}</h3> : null}
            <ul className="flex flex-col">
              {block.rows.map((entrant: Row) => (
                <li key={entrant.id} className={cn("px-4 py-1", entrant.withdrawn_at && "text-muted-foreground")}>
                  <div className="flex items-center gap-3">
                    {seedsLocked ? <span className="tnum min-w-[2ch] text-right text-xs text-muted-foreground">{solo(entrant) ? entrant.seed ?? "—" : ""}</span> : null}
                    {entrant.user ? (
                      <PlayerName player={entrant.user} race={solo(entrant) ? entrant.race : undefined} />
                    ) : cup && entrant.team ? (
                      <CupTeamName team={entrant.team} />
                    ) : (
                      <span>{entrantName(entrant)}</span>
                    )}
                    {places[entrant.id] ? (
                      <Badge variant="outline">
                        {placeMedal(places[entrant.id].place) ? (
                          <Icon name={placeIcon(places[entrant.id].place)} size={14} className={MEDAL_TEXT[placeMedal(places[entrant.id].place)]} />
                        ) : null}
                        {places[entrant.id].title}
                      </Badge>
                    ) : null}
                    {entrant.checked_in_at ? (
                      <>
                        <Icon name="mdi-check" className="text-success" title="Checked in" />
                        <span className="sr-only">checked in</span>
                      </>
                    ) : null}
                    {entrant.withdrawn_at ? <span className="text-xs">withdrawn</span> : null}
                  </div>
                  {/* A cup team: its players, the captain first, and the players invited who have not answered */}
                  {entrant.roster?.length || entrant.invited?.length ? (
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pl-6 text-sm">
                      {(entrant.roster as Row[]).map((one) => (
                        <PlayerName key={one.user.id} player={one.user} />
                      ))}
                      {(entrant.invited as Row[]).map((one) => (
                        <span key={one.id} className="text-muted-foreground">
                          {one.name} (invited)
                        </span>
                      ))}
                    </div>
                  ) : null}
                  {/* A player on more than one race: one line a race, with its seed and its division */}
                  {raceRows(entrant).map((race: Row) => (
                    <div key={race.id} className={cn("flex items-center gap-2 pl-6 text-sm", race.withdrawn_at && "text-muted-foreground")}>
                      {seedsLocked ? <span className="tnum min-w-[2ch] text-right text-xs text-muted-foreground">{race.seed ?? "—"}</span> : null}
                      <RaceIcon raceIdentifier={race.race} />
                      <span>{raceName(race.race)}</span>
                      {divisionName(race) ? <span className="text-xs text-muted-foreground">{divisionName(race)}</span> : null}
                      {race.withdrawn_at ? <span className="text-xs">withdrawn</span> : null}
                    </div>
                  ))}
                  {entrant.note ? <div className="max-w-[70ch] text-sm whitespace-pre-line text-muted-foreground">{entrant.note}</div> : null}
                </li>
              ))}
            </ul>
            </div>
            ))
          ) : (
            <p className="px-4 pb-4 text-muted-foreground">No entrants yet</p>
          )}
          {/* a cup that is drawn or full keeps its late signups in line; a runner lets them in */}
          {waitlistOf(entrants).length ? (
            <>
              <h3 className="mt-3 px-4 text-sm font-bold text-muted-foreground uppercase">Waitlist</h3>
              <ol className="flex flex-col">
                {waitlistOf(entrants).map((entrant: Row, index: number) => (
                  <li key={entrant.id} className="flex items-center gap-3 px-4 py-1 text-muted-foreground">
                    <span className="tnum w-6 text-right text-xs">{index + 1}</span>
                    {entrant.user ? <PlayerName player={entrant.user} race={entrant.race || undefined} /> : <span>{entrant.team?.name || "A team"}</span>}
                  </li>
                ))}
              </ol>
            </>
          ) : null}
        </CardContent>
      </Card>
    ),

    mine: mine ? (
      <Card className={cn("card border-primary/60", tabbed ? "mb-4" : "mt-4")}>
        <CardContent className="flex flex-wrap items-center gap-3 p-4">
          <Icon name="mdi-sword-cross" size={24} className="text-primary-text" />
          <div className="min-w-0 flex-[1_1_260px]">
            {isLobby(mine.row) ? (
              <>
                <div className="font-heading text-base font-bold">Your lobby is waiting for its places</div>
                <div className="text-sm text-muted-foreground">
                  {(mine.row.sides as Row[]).map((seat) => seat.team?.name || seat.user?.name).filter(Boolean).join(", ")}
                  {mine.row.lobby_map ? ` · ${mine.row.lobby_map.name}` : ""}. Played it? Enter where everyone finished.
                </div>
              </>
            ) : (
              <>
                <div className="font-heading text-base font-bold">Your match is waiting for its result</div>
                <div className="text-sm text-muted-foreground">
                  {[mine.row.player1?.name || mine.row.team1?.name, mine.row.player2?.name || mine.row.team2?.name].filter(Boolean).join(" vs ")}
                  {mine.stage.name ? ` · ${mine.stage.name}` : ""}. Played it? Report the result here, or with the Report button on your box in the draw.
                </div>
              </>
            )}
          </div>
          {/* a cup series vetoes its maps first: game 1 plays the map the veto leaves */}
          {!isLobby(mine.row) && (rulesOf(mine.row.rules?.map_rules) as string[]).includes("decider") ? (
            <Button variant="outline" onClick={() => setVetoing(mine.row)}>
              <Icon name="mdi-map-outline" />
              Map veto
            </Button>
          ) : null}
          <Button onClick={() => openReport(mine.row)}>
            <Icon name="mdi-clipboard-check-outline" />
            {isLobby(mine.row) ? "Report places" : "Report result"}
          </Button>
        </CardContent>
      </Card>
    ) : null,

    // The stages read the same drawing the run page shows, with no admin control on it
    draw: shownDrawn.map((stage) => (
      <div key={stage.id}>
        {tabbed ? (
          <p className="mb-3 text-sm text-muted-foreground">{stageLine(stage)}</p>
        ) : (
          <h3 className="mt-4 mb-2 font-bold">{stage.name || `Stage ${stage.position}`}</h3>
        )}
        <StageView
          cup={cup}
          stage={stage}
          series={stage.series}
          rounds={stage.rounds}
          divisions={event?.divisions}
          standings={tabbed && BRACKETS.includes(stage.format) ? [] : stage.standings}
          rosters={rosters}
          viewer={anonymous ? undefined : viewer}
          onReport={reports ? openReport : undefined}
          onVeto={reports ? setVetoing : undefined}
        />
      </div>
    )),
  };

  return (
    <HIDE_RESULTS.Provider value={hideResults}>
      <StatusAlert modelValue={error} onClose={() => setError(null)} />
      {loading ? <Progress value={null} /> : null}

      {event ? (
        <>
          {/* a cup and a sign-up list are found on the Events tab, so they lead back to it */}
          {keepsEntrants ? (
            <Link href="/events" className="mb-2 inline-block text-sm">
              ← Events
            </Link>
          ) : null}
          <EventHeader event={event} league={league} />
          {event.cancelled_at ? (
            <Badge className={cn("mt-2", toneClass("warning"))}>
              <Icon name="mdi-cancel" />
              Cancelled
            </Badge>
          ) : null}
          {event.cup_recurrence ? (
            <Link href={`/events/recurring/${event.cup_recurrence.id}`} className="mt-2 inline-flex items-center gap-1 text-sm">
              <Icon name="mdi-calendar-sync" />
              Part of {event.cup_recurrence.name}
            </Link>
          ) : null}
          {runner.organizers.length ? (
            <p className="mt-2 text-sm text-muted-foreground">Run by {runner.organizers.map((one) => one.name || "an organizer").join(", ")}</p>
          ) : null}
          {event.description ? <p className="mt-3 max-w-[70ch] whitespace-pre-line">{event.description}</p> : null}
          {cup ? <CupMapPool maps={event.maps || []} customGame={!!event.custom_game} /> : null}
          {/* What a player needs before signing up; a checked event refuses anyone without it */}
          {(eligibilityLines(event) as string[]).length ? (
            <div className="mt-3 max-w-[70ch] rounded-lg border border-border p-3 text-sm">
              <p className="mb-1 font-bold">{event.eligibility_required || event.bnet_required ? "Who can sign up" : "What the organizers look at"}</p>
              <ul className="list-disc pl-5">
                {(eligibilityLines(event) as string[]).map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
              {event.bnet_required ? (
                <p className="mt-2 text-muted-foreground">
                  Verify your battle tag on <Link href="/profile">your profile</Link> with &quot;Verify with Battle.net&quot; before you sign up.
                </p>
              ) : null}
            </div>
          ) : null}

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Badge className={toneClass(null)}>
              <Icon name="mdi-account-multiple" />
              {event.team_size ? `${entered} ${entered === 1 ? "team" : "teams"}` : `${entered} ${entered === 1 ? "entrant" : "entrants"}`}
            </Badge>
            {fixtureSeries ? (
              <Badge className={toneClass(null)}>
                <Icon name="mdi-sword-cross" />
                {fixtureSeries} series per fixture
              </Badge>
            ) : null}

            {/* a signup on a cup's waitlist checks in as one that is in does, beside the chip; a team's panel shows its own */}
            {waiting && !event.team_size ? (
              <Badge className={toneClass("warning")}>
                <Icon name="mdi-account-clock" />
                On the waitlist
              </Badge>
            ) : null}
            {/* The one action the server picked for this caller; a chip once he is checked in */}
            {row?.action === "checked_in" ? (
              <Badge className={toneClass("success")}>
                <Icon name="mdi-check" />
                Checked in
              </Badge>
            ) : button && row?.action === "withdraw" && held.length > 1 ? (
              /* A player on more than one race withdraws one race at a time */
              held.map((race) => (
                <Button key={race} size="sm" variant="outline" className="text-error" disabled={acting === race} onClick={() => act(race)}>
                  <Icon name={acting === race ? "mdi-loading mdi-spin" : button.icon} />
                  Withdraw {raceName(race)}
                </Button>
              ))
            ) : button ? (
              <ActionButton
                button={row?.action === "sign_up" && joinsWaitlist(event, entrants, drawn.length > 0) ? { ...button, text: "Join the waitlist" } : button}
                busy={acting === true}
                onClick={() => act()}
              />
            ) : anonymous && event.signups_open && keepsEntrants ? (
              <Button size="sm" onClick={logIn}>
                <Icon name="mdi-login" />
                Log in to sign up
              </Button>
            ) : null}

            {/* Check-in took the one action; a cup's player may still leave beside it */}
            {leaving ? <ActionButton button={eventActionButton(leaving) as Row} busy={acting === leaving} onClick={() => act(null, leaving)} /> : null}

            {/* An event that takes one entry per race lets a player in on another race beside his own row */}
            {event.multi_entry && event.signups_open && held.length > 0 && held.length < raceWrapper.races.length ? (
              <Button size="sm" variant="outline" className="text-primary-text" onClick={() => setDialog(true)}>
                <Icon name="mdi-account-plus" />
                Enter another race
              </Button>
            ) : null}

            {/* The caller's own blocks cover the next round; the answer is his, the blocks only inform */}
            {hint ? (
              <>
                <Badge className={toneClass("info")}>
                  <Icon name="mdi-calendar-remove" />
                  {hint.title}
                </Badge>
                <Button size="sm" variant="outline" className="text-error" disabled={answering} onClick={answerBlocked}>
                  <Icon name={answering ? "mdi-loading mdi-spin" : "mdi-close"} />
                  {hint.text}
                </Button>
              </>
            ) : null}

            {/* Both targets sit behind a login, so a reader who is not logged in reads neither; a
                tabbed page holds its entrants on the Participants tab */}
            {!anonymous && !tabbed ? (
              <Button nativeButton={false} size="sm" variant="outline" className="text-primary-text" render={<Link href={`/events/${event.id}/entrants`} />}>
                <Icon name="mdi-account-multiple" />
                Entrants
              </Button>
            ) : null}
            {runner.runs && event.kind !== "gnl" ? (
              <Button nativeButton={false} size="sm" className="text-on-primary" render={<Link href={`/events/${event.id}/admin`} />}>
                <Icon name="mdi-tune-variant" />
                {event.kind === "cup" ? "Manage cup" : "Run the event"}
              </Button>
            ) : null}
            {!anonymous && event.kind === "gnl" ? (
              <Button nativeButton={false} size="sm" variant="outline" className="text-primary-text" render={<Link href={`/seasons/${seasonSlug(event)}`} />}>
                <Icon name="mdi-trophy-outline" />
                Season page
              </Button>
            ) : null}
          </div>
          {waiting ? <Note className="mt-3 max-w-[70ch]">{waitlistNote(event, entrants, drawn.length > 0)}</Note> : null}

          {event.team_size ? (
            <TeamCupPanel event={event} entrants={entrants} userId={auth.me?.user?.id ?? null} invites={teamInvites} onChanged={() => reload()} onError={setError} />
          ) : null}

          {tabbed ? (
            <Tabs value={tab} onValueChange={(value) => pickTab(value as string)} className="mt-6">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-border">
                <TabsList variant="line" className="max-w-full justify-start overflow-x-auto overflow-y-hidden">
                  <TabsTrigger value="draw" className="flex-none px-3">
                    <Icon name="mdi-tournament" />
                    Draw
                  </TabsTrigger>
                  <TabsTrigger value="participants" className="flex-none px-3">
                    <Icon name="mdi-account-multiple" />
                    Participants
                    <span className="tnum text-muted-foreground">{entered}</span>
                  </TabsTrigger>
                  <TabsTrigger value="results" className="flex-none px-3">
                    <Icon name="mdi-podium" />
                    Results
                  </TabsTrigger>
                </TabsList>
                <span className="flex-1" />
                {hideSwitch}
              </div>
              <TabsContent value="draw" id="the-draw" className="mt-4">
                {legs.length ? (
                  <CupRoundPicker
                    event={event}
                    legs={legs}
                    legIndex={legIndex}
                    onLeg={setLegIndex}
                    entry={ownEntry(entrants, auth.me?.user?.id, { waiting: true })}
                    drawn={shownDrawn.length > 0}
                    onLegs={(cup_legs) => setEvent((old) => (old ? { ...old, cup_legs } : old))}
                    onError={setError}
                  />
                ) : null}
                {sections.mine}
                {shownDrawn.length ? (
                  sections.draw
                ) : (
                  <Card className="card">
                    <CardContent className="flex flex-col gap-1 p-4">
                      {shownStages.map((stage) => (
                        <p key={stage.id}>{stageLine(stage)}</p>
                      ))}
                      <p className="text-muted-foreground">The bracket shows here once the organizers draw it.</p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
              <TabsContent value="participants" className="mt-4">
                {sections.entrants}
              </TabsContent>
              <TabsContent value="results" className="mt-4">
                {legs.length ? <CupOverallTable event={event} onRows={setOverallRows} /> : null}
                {/* the matches below are one round's; the picker names which */}
                {legs.length ? <CupRoundPicker event={event} legs={legs} legIndex={legIndex} onLeg={setLegIndex} entry={null} drawn onLegs={() => {}} onError={setError} /> : null}
                <EventResults
                  event={event as Row}
                  stages={shownDrawn}
                  entrants={entrants}
                  places={legs.length ? overallRows.filter((row: Row) => row.legs?.length).map((row: Row) => ({ entrant_id: row.entrant_id, position: row.position, name: row.name, user_id: row.user?.id ?? null })) : undefined}
                  matchesTitle={leg ? `Matches · ${legTitle(leg)}` : undefined}
                />
              </TabsContent>
            </Tabs>
          ) : event ? (
            <>
              {!signupOnly ? sections.stages : null}
              {sections.entrants}
              {drawn.length ? (
                <div id="the-draw" className="mt-6 flex items-center justify-between">
                  <h2>The draw</h2>
                  {hideSwitch}
                </div>
              ) : null}
              {sections.mine}
              {sections.draw}
            </>
          ) : null}

          {placing ? (
            <LobbyPlacesDialog
              key={placing.id}
              lobby={placing}
              title="Report the places"
              open
              onOpenChange={(open) => !open && setPlacing(null)}
              saving={placingSaving}
              error={placingError}
              onError={setPlacingError}
              onSave={async (places) => {
                setPlacingSaving(true);
                setPlacingError(null);
                try {
                  await store.setPlaces(placing.id, places);
                  setPlacing(null);
                  await Promise.all([reload(), loadDrawings(event as Row, true)]);
                } catch (e) {
                  setPlacingError((e as Error).message || "The places were not saved");
                } finally {
                  setPlacingSaving(false);
                }
              }}
            />
          ) : null}
          {dialog ? <SignupDialog event={event} held={held} entrants={entrants} open onOpenChange={setDialog} onSignedUp={() => reload()} /> : null}
          {shownVeto ? (
            <Dialog
              open
              onOpenChange={(open) => {
                if (open) return;
                setVetoing(null);
                setLinkClosed(true);
              }}
            >
              <DialogContent size="xl" className="gap-0 p-0">
                <DialogTitle className="banner bg-banner px-4 py-3 text-primary">Map veto</DialogTitle>
                <div className="max-h-[80vh] overflow-y-auto p-4">
                  <VetoBoard seriesId={shownVeto.id} cup={cup} />
                </div>
              </DialogContent>
            </Dialog>
          ) : null}
          {!anonymous ? <ReportResultDialog
              ref={reportDialog}
              cup={cup}
              // a result can move the phase, so the header reads the event again with the draw
              onSaved={() =>
                Promise.all([
                  reload(),
                  loadDrawings(event as Row, true),
                  store
                    .fetchEvent((event as Row).id, true)
                    .then((fresh: Row) => setEvent((old) => (old ? { ...old, ...fresh } : old)))
                    .catch(() => {}),
                ])
              }
            /> : null}
        </>
      ) : null}
    </HIDE_RESULTS.Provider>
  );
}

/** The one button the server picked for this caller. */
function ActionButton({ button, busy, onClick }: { button: Row; busy: boolean; onClick: () => void }) {
  const tint = button.color === "error" ? "text-error" : "text-primary-text";
  const variant = button.variant === "outlined" ? "outline" : "default";
  return (
    <Button size="sm" variant={variant} className={variant === "outline" ? tint : undefined} disabled={busy} onClick={onClick}>
      <Icon name={busy ? "mdi-loading mdi-spin" : button.icon} />
      {button.text}
    </Button>
  );
}

export default EventView;
