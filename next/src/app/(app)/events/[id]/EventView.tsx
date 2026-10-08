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
import { byPlayer, bySeed, bySignup, entrantName, raceRows, rostersByEntrant, seedsByEntrant, signupCount } from "@/helpers/entrants.mjs";
import { FORMATS, SCHEDULING_MODES, SERIES_PER_ENTRANT_PER_ROUND, seriesPerEntrant, seriesPerFixture, stateOf, titleOf } from "@/helpers/event-labels.mjs";
import { actOnEvent, blocksHint, eventActionButton } from "@/helpers/events.mjs";
import { myRaces } from "@/helpers/koth.mjs";
import { raceWrapper } from "@/helpers/races.js";
import { saveReturnUrl } from "@/helpers/return-url.mjs";
import { seasonSlug } from "@/helpers/season-slug.mjs";
import { useAuth, useEventStore, useTeamStore } from "@/stores";
import { useEventRunner } from "@/hooks/event-runner";
import { ReportResultDialog, type ReportResultDialogHandle } from "@/components/ReportResultDialog";
import { reportOf } from "@/helpers/series-actions.mjs";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { VetoBoard } from "@/components/VetoBoard";
import { backendUrl, fetchWrapper } from "@/helpers";
import { eligibilityLines } from "@/helpers/events-page.mjs";
import { homeTab, tabOf, withTab } from "@/helpers/event-tabs.mjs";
import { bestOfLine, parsePlan } from "@/helpers/best-of-plan.mjs";
import { rulesOf } from "@/helpers/map-order.mjs";
import { cn } from "@/lib/utils";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>;

const phoneCell = "hidden min-[960px]:table-cell";
// a bracket's places sit on the results tab, so its draw tab carries no table under it
const BRACKETS = ["single_elimination", "double_elimination"];
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
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | boolean>(false); // true, or the race on its way out
  const [answering, setAnswering] = useState(false);
  const [stageData, setStageData] = useState<Record<string, Row>>({});
  const [dialog, setDialog] = useState(false);
  // the wizard lands here when the event was written but its divisions were not
  const [error, setError] = useState<string | null>(search.get("divisions") === "unsaved" ? "The event was created, but its divisions were not saved." : null);

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
  const seedsLocked = stages.some((stage) => stage.seeds_locked_at);
  // An event that plays no stage is a sign-up list: the entrants are the whole page
  const signupOnly = !!event && !stages.length;
  // An event that plays stages reads as tabs: the draw, who is in, and the results. A GNL season
  // and a sign-up list keep their one page.
  const tabbed = !!event && keepsEntrants && !signupOnly;
  // The tabs open on the draw, so a tabbed page drops the "view" word that only pointed at it
  const button = keepsEntrants && !(tabbed && row?.action === "view") ? eventActionButton(row?.action) : null;
  const hint = blocksHint(row);
  const held: string[] = myRaces(entrants, auth.me?.user?.id);
  // The chip counts players: a player on two races holds two rows and is one entrant
  const entered = entrants.length ? byPlayer(entrants).length : event?.entrant_count ?? 0;

  const solo = (item: Row) => !raceRows(item).length;
  const divisionName = (band: Row) => {
    const division = (event?.divisions || []).find((one: Row) => one.id === band.division_id);
    return division ? division.name || `Division ${division.position}` : null;
  };

  // A fixture pairs two team entrants, so a solo event reads no fixture chip
  const fixtureSeries = seriesPerFixture(event);

  // A phone drops the format, the series count and the scheduling columns, so they ride under the name
  const phoneLine = (stage: Row) =>
    [titleOf(FORMATS, stage.format), seriesPerEntrant(stage) ? `${seriesPerEntrant(stage)} series each entrant a round` : null, titleOf(SCHEDULING_MODES, stage.scheduling_mode)]
      .filter(Boolean)
      .join(" · ");

  // Only the stages that hold series are drawn; the table above lists every stage
  const drawn = stages.map((stage) => ({ ...stage, ...(stageData[stage.id] || {}) })).filter((stage) => stage.series?.length);

  // Who reads the draw, as the report rule asks: the player row, the seats, and whether they run
  // the event; a reader who is not logged in reports nothing
  const viewer = { id: auth.me?.user?.id ?? null, isAdmin: auth.isAdmin, runs: runner.runs, seats: auth.me?.seats ?? [] };
  // The caller's own next series to report, as a player or a captain: the prompt over the draw
  const mine = auth.me
    ? drawn
        .flatMap((stage) => (stage.series as Row[]).map((row) => ({ row, stage })))
        .find(({ row }) => reportOf(row, { id: viewer.id, seats: viewer.seats }) === "report") ?? null
    : null;
  // The report dialog opens in place on the series it reads afresh, as the series page does
  const reportDialog = useRef<ReportResultDialogHandle>(null);
  // The map veto of one series, opened in place from the draw or from the waiting match
  const [vetoing, setVetoing] = useState<Row | null>(null);
  const openReport = async (row: Row) => {
    try {
      const full = await fetchWrapper.get(`${backendUrl}/series/${row.id}`);
      reportDialog.current?.open({ ...full, entrant1_id: row.entrant1_id ?? null, entrant2_id: row.entrant2_id ?? null });
    } catch (e) {
      setError(`The series did not load: ${(e as Error).message}`);
    }
  };

  // Closing an event freezes the table of its last stage as the places it awards, so a
  // finished event names its champion and every other place off that table.
  const places: Record<string, Row> = stateOf(event) !== "finished" ? {} : placesOf(drawn.at(-1)?.standings || []);

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
    const list = (loaded.stages || []).length ? bySeed(rows) : bySignup(rows);
    setEntrants(list);
    setRow(mine.find((one: Row) => one.id === loaded.id) ?? null);
    // only a team event fields rosters, so nothing else pays for the read
    if (loaded.entrant_kind === "team") {
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
  const act = async (race: string | null = null) => {
    const action = row?.action;
    if (action === "sign_up") return setDialog(true);
    if (action === "view") {
      pickTab("draw");
      return document.getElementById("the-draw")?.scrollIntoView({ behavior: "smooth" });
    }
    setActing(race ?? true);
    setError(await act_(action, { store, eventId: event!.id, row, reload, race, raceName: race ? raceName(race) : race }));
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
  const bestOfOf = (stage: Row) =>
    stage.best_of_by_round ? bestOfLine(stage.best_of, parsePlan(stage.best_of_by_round), stage.format) : `Best of ${stage.best_of}`;
  // One line a stage: what it plays, for the draw tab before and over the bracket
  const stageLine = (stage: Row) =>
    [stages.length > 1 ? stage.name || `Stage ${stage.position}` : null, titleOf(FORMATS, stage.format), bestOfOf(stage), seriesPerEntrant(stage) ? `${seriesPerEntrant(stage)} series each entrant a round` : null, titleOf(SCHEDULING_MODES, stage.scheduling_mode)]
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
            <ul className="flex flex-col">
              {byPlayer(entrants).map((entrant: Row) => (
                <li key={entrant.id} className={cn("px-4 py-1", entrant.withdrawn_at && "text-muted-foreground")}>
                  <div className="flex items-center gap-3">
                    {seedsLocked ? <span className="tnum min-w-[2ch] text-right text-xs text-muted-foreground">{solo(entrant) ? entrant.seed ?? "—" : ""}</span> : null}
                    {entrant.user ? <PlayerName player={entrant.user} race={solo(entrant) ? entrant.race : undefined} /> : <span>{entrantName(entrant)}</span>}
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
          ) : (
            <p className="px-4 pb-4 text-muted-foreground">No entrants yet</p>
          )}
        </CardContent>
      </Card>
    ),

    mine: mine ? (
      <Card className={cn("card border-primary/60", tabbed ? "mb-4" : "mt-4")}>
        <CardContent className="flex flex-wrap items-center gap-3 p-4">
          <Icon name="mdi-sword-cross" size={24} className="text-primary-text" />
          <div className="min-w-0 flex-[1_1_260px]">
            <div className="font-heading text-base font-bold">Your match is waiting for its result</div>
            <div className="text-sm text-muted-foreground">
              {[mine.row.player1?.name || mine.row.team1?.name, mine.row.player2?.name || mine.row.team2?.name].filter(Boolean).join(" vs ")}
              {mine.stage.name ? ` · ${mine.stage.name}` : ""}. Played it? Report the result here, or with the Report button on your box in the draw.
            </div>
          </div>
          {/* a cup series vetoes its maps first: game 1 plays the map the veto leaves */}
          {(rulesOf(mine.row.rules?.map_rules) as string[]).includes("decider") ? (
            <Button variant="outline" onClick={() => setVetoing(mine.row)}>
              <Icon name="mdi-map-outline" />
              Map veto
            </Button>
          ) : null}
          <Button onClick={() => openReport(mine.row)}>
            <Icon name="mdi-clipboard-check-outline" />
            Report result
          </Button>
        </CardContent>
      </Card>
    ) : null,

    // The stages read the same drawing the run page shows, with no admin control on it
    draw: drawn.map((stage) => (
      <div key={stage.id}>
        {tabbed ? (
          <p className="mb-3 text-sm text-muted-foreground">{stageLine(stage)}</p>
        ) : (
          <h3 className="mt-4 mb-2 font-bold">{stage.name || `Stage ${stage.position}`}</h3>
        )}
        <StageView
          stage={stage}
          series={stage.series}
          rounds={stage.rounds}
          divisions={event?.divisions}
          standings={tabbed && BRACKETS.includes(stage.format) ? [] : stage.standings}
          rosters={rosters}
          seeds={seedsByEntrant(entrants) as Record<string, number>}
          viewer={anonymous ? undefined : viewer}
          onReport={anonymous ? undefined : openReport}
          onVeto={anonymous ? undefined : setVetoing}
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
          {runner.organizers.length ? (
            <p className="mt-2 text-sm text-muted-foreground">Run by {runner.organizers.map((one) => one.name || "an organizer").join(", ")}</p>
          ) : null}
          {event.description ? <p className="mt-3 max-w-[70ch] whitespace-pre-line">{event.description}</p> : null}
          {/* What a player needs before signing up; a checked event refuses anyone without it */}
          {(eligibilityLines(event) as string[]).length ? (
            <div className="mt-3 max-w-[70ch] rounded-lg border border-border p-3 text-sm">
              <p className="mb-1 font-bold">{event.eligibility_required ? "Who can sign up" : "What the organizers look at"}</p>
              <ul className="list-disc pl-5">
                {(eligibilityLines(event) as string[]).map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
              {event.eligibility_required && event.bnet_required ? (
                <p className="mt-2 text-muted-foreground">
                  Link your battle tag to Battle.net on <Link href="/profile">your profile</Link> before you sign up.
                </p>
              ) : null}
            </div>
          ) : null}

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Badge className={toneClass(null)}>
              <Icon name="mdi-account-multiple" />
              {`${entered} ${entered === 1 ? "entrant" : "entrants"}`}
            </Badge>
            {fixtureSeries ? (
              <Badge className={toneClass(null)}>
                <Icon name="mdi-sword-cross" />
                {fixtureSeries} series per fixture
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
              <ActionButton button={button} busy={acting === true} onClick={() => act()} />
            ) : anonymous && event.signups_open && keepsEntrants ? (
              <Button size="sm" onClick={logIn}>
                <Icon name="mdi-login" />
                Log in to sign up
              </Button>
            ) : null}

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
                Run the {event.kind === "cup" ? "cup" : "event"}
              </Button>
            ) : null}
            {!anonymous && event.kind === "gnl" ? (
              <Button nativeButton={false} size="sm" variant="outline" className="text-primary-text" render={<Link href={`/seasons/${seasonSlug(event)}`} />}>
                <Icon name="mdi-trophy-outline" />
                Season page
              </Button>
            ) : null}
          </div>

          {tabbed ? (
            <Tabs value={tab} onValueChange={(value) => pickTab(value as string)} className="mt-6">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-border">
                <TabsList variant="line" className="max-w-full justify-start overflow-x-auto">
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
                {sections.mine}
                {drawn.length ? (
                  sections.draw
                ) : (
                  <Card className="card">
                    <CardContent className="flex flex-col gap-1 p-4">
                      {stages.map((stage) => (
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
                <EventResults event={event as Row} stages={drawn} entrants={entrants} />
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

          {dialog ? <SignupDialog event={event} held={held} open onOpenChange={setDialog} onSignedUp={() => reload()} /> : null}
          {vetoing ? (
            <Dialog open onOpenChange={(open) => !open && setVetoing(null)}>
              <DialogContent size="xl" className="gap-0 p-0">
                <DialogTitle className="banner bg-banner px-4 py-3 text-primary">Map veto</DialogTitle>
                <div className="max-h-[80vh] overflow-y-auto p-4">
                  <VetoBoard seriesId={vetoing.id} />
                </div>
              </DialogContent>
            </Dialog>
          ) : null}
          {!anonymous ? <ReportResultDialog ref={reportDialog} onSaved={() => Promise.all([reload(), loadDrawings(event as Row, true)])} /> : null}
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
