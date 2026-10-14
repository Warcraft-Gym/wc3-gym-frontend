"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, type DialogSize } from "@/components/ui/dialog";
import { Icon } from "@/components/ui/Icon";
import { Pick } from "@/components/ui/Pick";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { toneClass } from "@/components/ui/tone";
import { EventHeader } from "@/components/EventHeader";
import { EventResults } from "@/components/EventResults";
import { StageView } from "@/components/StageView";
import { StatusAlert } from "@/components/StatusAlert";
import { FORMATS, SEED_SOURCES, seriesPerEntrant, seriesPerFixture, titleOf } from "@/helpers/event-labels.mjs";
import { winsFor } from "@/helpers/best-of.mjs";
import { gameSlots, scoreOf } from "@/helpers/map-order.mjs";
import {
  advancingRows, drawsByRound, generateFields, isLobby, isScored,
  lobbySeats, lobbyTargets, nextRound, sideName, standsOn, undrawResults,
} from "@/helpers/stage-view.mjs";
import { awardList, placeIcon, placeMedal } from "@/helpers/awards.mjs";
import { playedCount } from "@/helpers/stage-view.mjs";
import { CupDivisionsPanel } from "@/components/CupDivisionsPanel";
import { CupSeedsPanel } from "@/components/CupSeedsPanel";
import { cupRosters, rostersByEntrant } from "@/helpers/entrants.mjs";
import { useEventStore, useTeamStore } from "@/stores";
import { useEventRunner } from "@/hooks/event-runner";
import { CupConsole } from "@/components/CupConsole";
import { CupFormatCard } from "@/components/CupFormatCard";
import { CupOverallTable } from "@/components/CupOverallTable";
import { CupRoundPicker } from "@/components/CupRoundPicker";
import { LobbyPlacesDialog } from "@/components/LobbyPlacesDialog";
import { RepeatCupDialog } from "@/components/RepeatCupDialog";
import { CupRoundsBar } from "@/components/CupRoundsBar";
import { allLegsFinished, legField, legsOf, legStages, legTitle, openLegIndex } from "@/helpers/cup-rounds.mjs";
import { bestOfLine, parsePlan } from "@/helpers/best-of-plan.mjs";
import { tabOf, withTab } from "@/helpers/event-tabs.mjs";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { livesLine } from "@/helpers/cup-wizard.mjs";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>;

// The helpers are plain JS, so their defaults type the parameters; the seam names the real shapes.
const fieldsOf = generateFields as unknown as (entrants: Row[], divisions?: Row[], format?: string) => Row[];
const advancingOf = advancingRows as unknown as (standings: Row[], count?: number | null) => Row[];
const awardsOf = awardList as unknown as (standings: Row[]) => Row[];
const targetsOf = lobbyTargets as unknown as (series: Row[], picked: Row | null) => { id: number; label: string }[];
const nextRoundOf = nextRound as unknown as (stage: Row | null, series: Row[], divisions?: Row[]) => { number: number; done: boolean; blocked: string | null };
const rostersOf = rostersByEntrant as unknown as (entrants: Row[], teams: Row[], eventId: number) => Record<string, Row[]>;
const seatsOf = lobbySeats as (row: Row) => Row[];

// The one refusal a force answers, as app/services/stage_engine.py on_reopened words it
const NEEDS_FORCE = "A later series already carries a result";
const MEDAL_TEXT: Record<string, string> = { "medal-gold": "text-medal-gold", "medal-silver": "text-medal-silver", "medal-bronze": "text-medal-bronze" };
const WON = "flex-1 aria-pressed:bg-primary/15 aria-pressed:text-primary-text";
// a bracket's places sit on the results tab, so its draw carries no table under it
const BRACKETS = ["single_elimination", "double_elimination", "placement"];

/** One ask of the run page: the title bar, the body and the row of answers. */
function Ask({
  open,
  onOpenChange,
  title,
  tone = "primary",
  size = "sm",
  actions,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  tone?: "primary" | "error";
  size?: DialogSize;
  actions: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} size={size} className="gap-0 p-0">
        <DialogTitle className={cn("px-4 py-3", tone === "error" ? "bg-error text-on-error" : "banner bg-banner text-primary")}>{title}</DialogTitle>
        <div className="p-4">{children}</div>
        <div className="flex items-center justify-end gap-2 p-4 pt-0">{actions}</div>
      </DialogContent>
    </Dialog>
  );
}

const busyIcon = (busy: boolean, icon?: string) => (busy ? <Icon name="mdi-loading mdi-spin" /> : icon ? <Icon name={icon} /> : null);

/** The run page: a runner of the event, an admin or one of its organizers, generates a stage
 *  or draws a Swiss round, enters every result, reopens one and advances the stage. A cup's
 *  evening sits above it: check-in, no-shows, the minimum, the cancel and the co-organizers.
 *  It draws each stage with the same StageView the public page shows. */
export function EventAdminView({ id }: { id: string }) {
  const router = useRouter();
  const store = useEventStore();
  const teamStore = useTeamStore();
  const runner = useEventRunner(id);

  const [event, setEvent] = useState<Row | null>(null);
  const [league, setLeague] = useState<Row | null>(null);
  const [entrants, setEntrants] = useState<Row[]>([]);
  const [series, setSeries] = useState<Row[]>([]);
  const [rounds, setRounds] = useState<Row[]>([]);
  const [standings, setStandings] = useState<Row[]>([]);
  const [rosters, setRosters] = useState<Record<string, Row[]>>({}); // the players each team entrant fields, so a series box names them
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [tab, setTab] = useState(0);
  // A cup played over rounds shows one round at a time; the stage tab is a stage of that round
  const [legIndex, setLegIndex] = useState(0);
  // read again after a round is finished or reopened, so the overall table follows
  const [overallVersion, setOverallVersion] = useState(0);
  const [overallRows, setOverallRows] = useState<Row[]>([]);
  const [repeating, setRepeating] = useState(false);
  // The page's own tab, Draw, Participants or Results, as the address names it; the stage tab
  // above is which stage the draw and the results read
  const [view, setView] = useState(() => (typeof window === "undefined" ? "draw" : tabOf(new URLSearchParams(window.location.search).get("tab"))));
  const pickView = (value: string) => {
    setView(value);
    window.history.replaceState(window.history.state, "", withTab(window.location.href, value));
  };

  const [confirmGenerate, setConfirmGenerate] = useState(false);
  const [confirmDraw, setConfirmDraw] = useState(false);
  const [confirmAdvance, setConfirmAdvance] = useState(false);
  const [confirmFinish, setConfirmFinish] = useState(false);
  const [confirmUndraw, setConfirmUndraw] = useState(false);
  const [resultsToDelete, setResultsToDelete] = useState<number | null>(null); // the results a confirmed redraw deletes
  const [confirmForce, setConfirmForce] = useState(false);
  const [resultOpen, setResultOpen] = useState(false);
  const [lobbyOpen, setLobbyOpen] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);
  const [moving, setMoving] = useState<Row | null>(null); // the seat the move dialog carries
  const [moveTo, setMoveTo] = useState<number | null>(null);
  const [picked, setPicked] = useState<Row | null>(null);
  const [winners, setWinners] = useState<(string | null)[]>([]);
  const [awardSide, setAwardSide] = useState<number | null>(null);

  const legs: Row[] = legsOf(event);
  const leg: Row | null = legs[legIndex] || null;
  const stagesOf = (row: Row | null, ofLeg: Row | null = null): Row[] => legStages(row?.stages || [], ofLeg);
  const stages = stagesOf(event, leg);
  // the players a round draws are the ones checked in for it
  const field: Row[] = legField(entrants, leg);
  const stage: Row | null = stages[tab] || null;
  const complete = series.length > 0 && series.every(isScored);

  // The two series settings, each where it applies: the round robin's own, and the fixture's
  const entrantSeries = seriesPerEntrant(stage);
  // a cup plays one series a pairing and holds no fixture, so it names no series per fixture
  const fixtureSeries = event?.kind === "cup" ? null : seriesPerFixture(event);

  // What the generate dialog promises: where the seeds come from, and the field per division
  const seedSource = titleOf(SEED_SOURCES, entrants.find((row) => row.seed_source)?.seed_source || "mmr");
  const fields = fieldsOf(field, event?.divisions, stage?.format);
  const showByes = fields.some((row) => row.byes != null);

  // Who the next stage takes: the top of each division's table, or the whole table
  const advancing = advancingOf(standings, stage?.advance_count);

  // Closing the event freezes the table of its last stage, so the finish sits on that tab; a cup
  // over rounds pays its overall table, so it finishes once every round is finished
  const lastStage = !!stage && tab === stages.length - 1;
  const finishes = lastStage && (!legs.length || allLegsFinished(legs));
  const awards = awardsOf(standings);
  const awardsByDivision = awards.some((one) => one.division);

  // A Swiss stage draws one round at a time; the engine refuses while a drawn series has no
  // result, and once the stage has drawn every round it plays
  const drawsRounds = drawsByRound(stage);
  const draw = nextRoundOf(stage, series, event?.divisions);
  const drawNote = !drawsRounds ? "" : draw.done ? "This stage has drawn every round it plays." : draw.blocked || "";

  const loadStage = async (ofEvent: Row | null = event, ofStage: Row | null = stage) => {
    setSeries([]);
    setRounds([]);
    setStandings([]);
    if (!ofEvent || !ofStage) return;
    try {
      // the run page reads after every write, so it never takes a cached draw
      const [drawn, table] = await Promise.all([store.fetchStage(ofEvent.id, ofStage.id, true), store.fetchStandings(ofEvent.id, ofStage.id, true).catch(() => [])]);
      const rows: Row[] = drawn.series || [];
      setSeries(rows);
      setRounds(drawn.rounds || []);
      setStandings(table);
      // A reload swaps every series row, so the open dialog follows the one it was showing
      const shown = picked ? rows.find((row) => row.id === picked.id) || null : null;
      setPicked(shown);
    } catch (e) {
      setError(`The stage did not load: ${(e as Error).message}`);
    }
  };

  const pickTab = (index: number) => {
    setTab(index);
    loadStage(event, stages[index] || null);
  };
  const pickLeg = (index: number) => {
    setLegIndex(index);
    setTab(0);
    loadStage(event, stagesOf(event, legs[index] || null)[0] || null);
  };
  // A finished or reopened round clears the seeds and changes the overall table
  const afterLeg = async () => {
    setEntrants(await store.fetchEntrants(event!.id, true));
    setOverallVersion((version) => version + 1);
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [row, leagues] = await Promise.all([store.fetchEvent(Number(id)), store.fetchLeagues()]);
        // a KOTH night runs on its own run page, not on the stage engine
        if (row.kind === "koth") {
          router.replace(`/koth/nights/${row.id}`);
          return;
        }
        setEvent(row);
        setLeague(leagues.find((one: Row) => one.id === row.league_id) || null);
        const rows: Row[] = await store.fetchEntrants(row.id, true).catch(() => []);
        setEntrants(rows);
        // a cup team's entrant row carries its players; another team event reads its league teams
        if (row.kind === "cup") setRosters(cupRosters(rows));
        else if (row.entrant_kind === "team") {
          const teams = await teamStore.fetchTeamsBySeason(row.id).catch(() => []);
          setRosters(rostersOf(rows, teams, row.id));
        }
        // a cup over rounds opens on its first round not finished
        const openLeg = legsOf(row)[openLegIndex(legsOf(row))] || null;
        setLegIndex(openLegIndex(legsOf(row)));
        await loadStage(row, stagesOf(row, openLeg)[0] || null);
      } catch (e) {
        setError(`The event did not load: ${(e as Error).message}`);
      } finally {
        setLoading(false);
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // One write, then the stage again. The answer is the refusal, or nothing when it went through.
  const run = async (work: () => Promise<unknown>): Promise<string | null> => {
    setSaving(true);
    setDialogError(null);
    try {
      await work();
      await loadStage();
      return null;
    } catch (e) {
      const message = (e as Error).message || "The write failed";
      setDialogError(message);
      setError(message);
      return message;
    } finally {
      setSaving(false);
    }
  };
  const readEvent = async () => setEvent(await store.fetchEvent(Number(id)));

  const generate = async () => {
    if (!(await run(() => store.generateStage(event!.id, stage!.id)))) setConfirmGenerate(false);
  };
  const drawRound = async () => {
    if (!(await run(() => store.drawNextRound(event!.id, stage!.id)))) setConfirmDraw(false);
  };
  const advance = async () => {
    if (!(await run(() => store.advanceStage(event!.id, stage!.id)))) {
      setConfirmAdvance(false);
      await readEvent();
    }
  };
  const finish = async () => {
    if (!(await run(() => store.finishEvent(event!.id)))) {
      setConfirmFinish(false);
      await readEvent();
    }
  };
  // Closing the undo dialog forgets the results count it asked about
  const closeUndraw = (open: boolean) => {
    setConfirmUndraw(open);
    if (!open) setResultsToDelete(null);
  };
  // Taking the draw back deletes the bracket; a stage with results asks once more, then confirms
  const undraw = async () => {
    const refused = await run(() => store.undrawStage(event!.id, stage!.id, resultsToDelete != null));
    if (!refused) {
      closeUndraw(false);
      await readEvent();
      setEntrants(await store.fetchEntrants(event!.id, true));
      return;
    }
    const results = undrawResults(refused);
    if (results == null) return;
    setResultsToDelete(results);
    setDialogError(null);
    setError(null);
  };
  const reopenEvent = async () => {
    if (!(await run(() => store.reopenEvent(event!.id)))) await readEvent();
  };

  // One series in the dialog: its games open on the score it already carries. A free for
  // all lobby carries places instead of a score, so it opens the placement dialog.
  const openSeries = (row: Row) => {
    setPicked(row);
    setDialogError(null);
    setAwardSide(null);
    if (isLobby(row)) {
      setLobbyOpen(true);
      return;
    }
    const [a, b] = [row.player1_score ?? 0, row.player2_score ?? 0];
    setWinners([...Array(a).fill("A"), ...Array(b).fill("B")]);
    setResultOpen(true);
  };

  // A lobby's places, its map and its clear, from the shared places dialog
  const savePlaces = async (places: { side_no: number; place: number }[]) => {
    if (!(await run(() => store.setPlaces(picked!.id, places)))) setLobbyOpen(false);
  };
  const changeMap = (mapId: number) => run(() => store.setLobbyMap(picked!.id, mapId));
  const clearLobby = async () => {
    if (!(await run(() => store.clearLobby(picked!.id)))) setLobbyOpen(false);
  };

  const moveTargets = targetsOf(series, picked);

  const openMove = (seat: Row) => {
    setMoving(seat);
    setMoveTo(null);
    setDialogError(null);
    setMoveOpen(true);
  };

  // A move is two writes: the target seats the entrant and the lobby he leaves drops him
  const moveEntrant = async () => {
    const target = series.find((row) => row.id === moveTo);
    const taken = (target?.sides || []).map((seat: Row) => seat.entrant_id).filter(Boolean);
    const left = seatsOf(picked!).map((seat) => seat.entrant_id).filter((entrantId) => entrantId && entrantId !== moving!.entrant_id);
    const refused = await run(async () => {
      await store.setLobbySides(target!.id, [...taken, moving!.entrant_id]);
      await store.setLobbySides(picked!.id, left);
    });
    if (!refused) {
      setMoveOpen(false);
      setLobbyOpen(false);
    }
  };

  const scored = isScored(picked);
  const bothSides = !!(standsOn(picked, 1) && standsOn(picked, 2));
  const wins = winsFor(stage?.best_of);
  const score: number[] = scoreOf(winners);
  // every game answered, plus the next while the series is open
  const gameRows = Array.from({ length: gameSlots(stage?.best_of || 3, winners) }, (unused, index) => index + 1);
  const validScore = bothSides && (score[0] === wins) !== (score[1] === wins) && Math.max(score[0], score[1]) === wins;

  const nameOf = (side: number) => sideName(picked, side) || `Side ${side}`;
  // A changed winner drops the games after it: they were played from a different score
  const setWinner = (game: number, side: string | null) => setWinners([...winners.slice(0, game - 1), ...(side ? [side] : [])]);

  const saveScore = async () => {
    const [a, b] = score;
    if (!(await run(() => store.scoreSeries(picked!.id, { player1_score: a, player2_score: b })))) setResultOpen(false);
  };
  const award = async (kind: string) => {
    if (!(await run(() => store.awardCupSeries(picked!.id, kind, awardSide)))) setResultOpen(false);
  };

  const reopen = async (force: boolean) => {
    const cleared = { player1_score: null, player2_score: null };
    const refused = await run(() => store.scoreSeries(picked!.id, cleared, force));
    if (!refused) {
      setConfirmForce(false);
      setResultOpen(false);
    } else if (!force && refused.includes(NEEDS_FORCE)) {
      // every other failure is an error, not a question, so it stays in the alert
      setConfirmForce(true);
    }
  };

  // Every event but a GNL season runs in tabs: the draw, who is in, the results
  const tabbed = !!event && event.kind !== "gnl";
  // A cup that plays without divisions is one field, and names no division anywhere
  const oneField = event?.kind === "cup" && !event.uses_divisions;
  // A cup's first stage is seeded beside its draw; a later stage plays what the stage before sends on
  const seedsAside = event?.kind === "cup" && !!stage && stage.position === stages[0]?.position;
  const consoleProps = {
    event: event as Row,
    entrants,
    drawn: series.length > 0,
    organizers: runner.organizers,
    onEvent: setEvent,
    // a team's roster fills its boxes in the draw, so a swap or an added team reads the teams again
    onEntrants: (rows: Row[]) => {
      setEntrants(rows);
      if (event?.kind === "cup") setRosters(cupRosters(rows));
      else if (event?.entrant_kind === "team") {
        teamStore
          .fetchTeamsBySeason(event.id, true)
          .then((teams: Row[]) => setRosters(rostersOf(rows, teams, event.id)))
          .catch(() => {});
      }
    },
    series,
    onSeries: () => loadStage(),
    onOrganizers: runner.reload,
    onError: setError,
  };
  // The stages of an event that plays more than one, over the draw and over the results
  const stagePicker = (
    <Tabs value={tab} onValueChange={(value) => pickTab(value as number)} className="mb-4">
      <TabsList variant="line" className="max-w-full justify-start overflow-x-auto">
        {stages.map((one, index) => (
          <TabsTrigger key={one.id} value={index} className="flex-none px-3">
            {one.name || `Stage ${one.position}`}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );

  // The route admits every member; the event's own list says who runs it
  if (runner.loaded && !runner.runs) {
    return (
      <div className="mx-auto max-w-[560px] p-4">
        <h1 className="mb-3">You Don&apos;t Run This Event</h1>
        <p className="mb-6">Only the admins and the organizers of this event open its run page.</p>
        <Button nativeButton={false} render={<Link href={`/events/${id}`} />}>Back to the event</Button>
      </div>
    );
  }

  return (
    <>
      <StatusAlert modelValue={error} onClose={() => setError(null)} />
      {loading || !runner.loaded ? <Progress value={null} /> : null}

      {event && runner.loaded ? (
        <>
          <Link href={`/events/${event.id}`} className="mb-2 inline-block text-sm">
            ← {event.name}
          </Link>
          <EventHeader event={event} league={league} />
          {/* a cup made from a rule names it; any other cup can be set to repeat */}
          {event.kind === "cup" ? (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {event.cup_recurrence ? (
                <Link href={`/events/recurring/${event.cup_recurrence.id}`} className="inline-flex items-center gap-1 text-sm">
                  <Icon name="mdi-calendar-sync" />
                  Part of {event.cup_recurrence.name}
                </Link>
              ) : (
                <Button size="sm" variant="outline" disabled={!event.starts_at} onClick={() => setRepeating(true)}>
                  <Icon name="mdi-calendar-sync" />
                  Repeat this cup
                </Button>
              )}
            </div>
          ) : null}
          {repeating ? <RepeatCupDialog event={event} open onOpenChange={setRepeating} /> : null}

          {tabbed ? (
            <Tabs value={view} onValueChange={(value) => pickView(value as string)} className="mt-4">
              <TabsList variant="line" className="max-w-full justify-start overflow-x-auto">
                <TabsTrigger value="draw" className="flex-none px-3">
                  <Icon name="mdi-tournament" />
                  Draw
                </TabsTrigger>
                <TabsTrigger value="participants" className="flex-none px-3">
                  <Icon name="mdi-account-multiple" />
                  Participants
                  <span className="tnum text-muted-foreground">{entrants.filter((row) => !row.withdrawn_at).length}</span>
                </TabsTrigger>
                <TabsTrigger value="results" className="flex-none px-3">
                  <Icon name="mdi-podium" />
                  Results
                </TabsTrigger>
              </TabsList>
              <TabsContent value="draw" className="mt-4">
                <CupConsole part="evening" {...consoleProps} />
                {legs.length ? (
                  <CupRoundsBar
                    event={event}
                    legs={legs}
                    legIndex={legIndex}
                    onLeg={pickLeg}
                    entrants={entrants}
                    drawn={tab > 0 || series.length > 0}
                    played={lastStage && complete}
                    onLegs={(cup_legs) => setEvent({ ...event, cup_legs })}
                    onFinished={afterLeg}
                    onChanged={async () => {
                      // a round added or removed changes the stages, so the round shown is read again
                      const fresh = await store.fetchEvent(event.id, true);
                      const index = Math.min(legIndex, Math.max(legsOf(fresh).length - 1, 0));
                      setEvent(fresh);
                      setLegIndex(index);
                      setTab(0);
                      await loadStage(fresh, stagesOf(fresh, legsOf(fresh)[index] || null)[0] || null);
                    }}
                    onError={setError}
                  />
                ) : null}
                {/* a cup's best-of and maps change until its bracket is drawn */}
                {event.kind === "cup" && stage ? <CupFormatCard key={stage.id} event={event} stage={stage} drawn={series.length > 0} onEvent={setEvent} /> : null}
                {stages.length > 1 ? stagePicker : null}

                {stage ? (
                  <>
                    <div className="mt-4 flex flex-wrap items-center gap-3">
                      <Badge className={toneClass(null)}>{titleOf(FORMATS, stage.format)}</Badge>
                      {stage.format === "placement" ? <Badge className={toneClass(null)}>{livesLine(stage.placement_lives)}</Badge> : null}
                      <Badge className={toneClass(null)}>{stage.best_of_by_round ? bestOfLine(stage.best_of, parsePlan(stage.best_of_by_round), stage.format) : `Best of ${stage.best_of}`}</Badge>
                      {entrantSeries ? <Badge className={toneClass(null)}>{entrantSeries} series each entrant a round</Badge> : null}
                      {fixtureSeries ? <Badge className={toneClass(null)}>{fixtureSeries} series per fixture</Badge> : null}
                      {stage.auto_advance ? (
                        <Badge className={toneClass("info")}>
                          <Icon name="mdi-fast-forward" />
                          Advance is automatic
                        </Badge>
                      ) : null}
                      <span className="flex-1" />
                      {/* a Swiss stage pairs one round at a time, so it is drawn round by round and
                          never generated whole */}
                      {drawsRounds ? (
                        <Button disabled={saving || draw.done || !!draw.blocked} onClick={() => setConfirmDraw(true)}>
                          <Icon name="mdi-cards-playing-outline" />
                          Draw the next round
                        </Button>
                      ) : !series.length ? (
                        <Button disabled={saving} onClick={() => setConfirmGenerate(true)}>
                          <Icon name="mdi-tournament" />
                          Generate
                        </Button>
                      ) : null}
                      {/* advancing seeds the next stage, so a cup, which plays one stage, never offers it */}
                      {complete && !lastStage ? (
                        <Button disabled={saving} onClick={() => setConfirmAdvance(true)}>
                          <Icon name="mdi-arrow-right-bold" />
                          Advance
                        </Button>
                      ) : null}
                    {/* a drawn stage can be taken back and drawn again, until the event or its round is finished */}
                      {series.length > 0 && !event.closed_at && event.kind !== "gnl" && !leg?.finished_at ? (
                        <Button variant="outline" className="text-error" disabled={saving} onClick={() => setConfirmUndraw(true)}>
                          <Icon name="mdi-undo-variant" />
                          Undo the draw
                        </Button>
                      ) : null}
                      {/* The event ends on its last stage, so only that stage's table pays the places */}
                      {finishes ? (
                        <Button variant="outline" className="text-primary-text" disabled={saving} onClick={() => setConfirmFinish(true)}>
                          <Icon name="mdi-trophy" />
                          Finish
                        </Button>
                      ) : null}
                      {/* Finish stamps the event closed; the reopen clears the stamp and the places it paid */}
                      {finishes && event.closed_at ? (
                        <Button variant="outline" disabled={saving} onClick={reopenEvent}>
                          <Icon name="mdi-lock-open-variant" />
                          Reopen
                        </Button>
                      ) : null}
                    </div>
                    {drawNote ? <p className="mt-1 text-xs text-muted-foreground">{drawNote}</p> : null}

                    <div className={seedsAside ? "mt-4 grid items-start gap-4 min-[1100px]:grid-cols-[minmax(0,1fr)_20rem]" : "mt-4"}>
                      <div className="min-w-0">
                        <StageView stage={stage} series={series} rounds={rounds} divisions={event.divisions} standings={tabbed && BRACKETS.includes(stage.format) ? [] : standings} rosters={rosters} onOpenSeries={openSeries} />
                      </div>
                      {seedsAside ? <CupSeedsPanel
                          event={event}
                          stage={stage}
                          entrants={field}
                          drawn={series.length > 0}
                          editable={!event.closed_at && !leg?.finished_at}
                          onEntrants={consoleProps.onEntrants}
                          onRedrawn={async () => {
                            await loadStage();
                            setEvent(await store.fetchEvent(event.id, true));
                          }}
                        /> : null}
                    </div>
                  </>
                ) : null}
              </TabsContent>
              <TabsContent value="participants" className="mt-4">
                {event.kind === "cup" && event.uses_divisions ? <CupDivisionsPanel event={event} entrants={entrants} drawn={series.length > 0} onEvent={setEvent} onEntrants={consoleProps.onEntrants} /> : null}
                <CupConsole part="people" {...consoleProps} />
              </TabsContent>
              <TabsContent value="results" className="mt-4">
                {legs.length ? <CupOverallTable event={event} fresh version={overallVersion} onRows={setOverallRows} /> : null}
                {legs.length ? <CupRoundPicker event={event} legs={legs} legIndex={legIndex} onLeg={pickLeg} entry={null} drawn onLegs={() => {}} onError={setError} /> : null}
                {stages.length > 1 ? stagePicker : null}
                {stage ? (
                  <EventResults
                    event={event}
                    stages={[{ ...stage, series, rounds, standings: lastStage ? standings : [] }]}
                    entrants={entrants}
                    onOpenSeries={openSeries}
                    places={legs.length ? overallRows.filter((row: Row) => row.legs?.length).map((row: Row) => ({ entrant_id: row.entrant_id, position: row.position, name: row.name, user_id: row.user?.id ?? null })) : undefined}
                    matchesTitle={leg ? `Matches · ${legTitle(leg)}` : undefined}
                  />
                ) : null}
              </TabsContent>
            </Tabs>
          ) : (
            <>
              {stages.length > 1 ? stagePicker : null}

              {stage ? (
                <>
                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <Badge className={toneClass(null)}>{titleOf(FORMATS, stage.format)}</Badge>
                    {stage.format === "placement" ? <Badge className={toneClass(null)}>{livesLine(stage.placement_lives)}</Badge> : null}
                    <Badge className={toneClass(null)}>{stage.best_of_by_round ? bestOfLine(stage.best_of, parsePlan(stage.best_of_by_round), stage.format) : `Best of ${stage.best_of}`}</Badge>
                    {entrantSeries ? <Badge className={toneClass(null)}>{entrantSeries} series each entrant a round</Badge> : null}
                    {fixtureSeries ? <Badge className={toneClass(null)}>{fixtureSeries} series per fixture</Badge> : null}
                    {stage.auto_advance ? (
                      <Badge className={toneClass("info")}>
                        <Icon name="mdi-fast-forward" />
                        Advance is automatic
                      </Badge>
                    ) : null}
                    <span className="flex-1" />
                    {/* a Swiss stage pairs one round at a time, so it is drawn round by round and
                        never generated whole */}
                    {drawsRounds ? (
                      <Button disabled={saving || draw.done || !!draw.blocked} onClick={() => setConfirmDraw(true)}>
                        <Icon name="mdi-cards-playing-outline" />
                        Draw the next round
                      </Button>
                    ) : !series.length ? (
                      <Button disabled={saving} onClick={() => setConfirmGenerate(true)}>
                        <Icon name="mdi-tournament" />
                        Generate
                      </Button>
                    ) : null}
                    {/* advancing seeds the next stage, so a cup, which plays one stage, never offers it */}
                    {complete && !lastStage ? (
                      <Button disabled={saving} onClick={() => setConfirmAdvance(true)}>
                        <Icon name="mdi-arrow-right-bold" />
                        Advance
                      </Button>
                    ) : null}
                    {/* The event ends on its last stage, so only that stage's table pays the places */}
                    {lastStage ? (
                      <Button variant="outline" className="text-primary-text" disabled={saving} onClick={() => setConfirmFinish(true)}>
                        <Icon name="mdi-trophy" />
                        Finish
                      </Button>
                    ) : null}
                    {/* Finish stamps the event closed; the reopen clears the stamp and the places it paid */}
                    {lastStage && event.closed_at ? (
                      <Button variant="outline" disabled={saving} onClick={reopenEvent}>
                        <Icon name="mdi-lock-open-variant" />
                        Reopen
                      </Button>
                    ) : null}
                  </div>
                  {drawNote ? <p className="mt-1 text-xs text-muted-foreground">{drawNote}</p> : null}

                  <div className="mt-4">
                    <StageView stage={stage} series={series} rounds={rounds} divisions={event.divisions} standings={tabbed && BRACKETS.includes(stage.format) ? [] : standings} rosters={rosters} onOpenSeries={openSeries} />
                  </div>
                </>
              ) : null}
            </>
          )}
        </>
      ) : null}

      {/* Generating writes every series of the stage, so it says what it is about to make */}
      <Ask
        open={confirmGenerate}
        onOpenChange={setConfirmGenerate}
        title="Generate this stage"
        actions={
          <>
            <Button variant="ghost" onClick={() => setConfirmGenerate(false)}>Cancel</Button>
            <Button disabled={saving} onClick={generate}>{busyIcon(saving)}Generate</Button>
          </>
        }
      >
        <p className="mb-3">Seeds come from {seedSource}.</p>
        <Table>
          <TableHeader>
            <TableRow>
              {oneField ? null : <TableHead>Division</TableHead>}
              <TableHead className="text-right">Entrants</TableHead>
              {showByes ? <TableHead className="text-right">Byes</TableHead> : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {fields.map((row) => (
              <TableRow key={row.key}>
                {oneField ? null : <TableCell>{row.name}</TableCell>}
                <TableCell className="tnum text-right">{row.entrants}</TableCell>
                {showByes ? <TableCell className="tnum text-right">{row.byes}</TableCell> : null}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Ask>

      {/* The draw pairs the round from the table as it stands, so it names the round first */}
      <Ask
        open={confirmDraw}
        onOpenChange={setConfirmDraw}
        title={`Draw round ${draw.number}`}
        actions={
          <>
            <Button variant="ghost" onClick={() => setConfirmDraw(false)}>Cancel</Button>
            <Button disabled={saving} onClick={drawRound}>{busyIcon(saving)}Draw round {draw.number}</Button>
          </>
        }
      >
        <p>
          Round {draw.number} pairs each entrant with the closest opponent he has not met yet, from the table as it stands. An odd field gives the bye to the lowest entrant
          without one.
        </p>
      </Ask>

      {/* Advancing carries the top entrants into the next stage */}
      <Ask
        open={confirmAdvance}
        onOpenChange={setConfirmAdvance}
        title="Advance this stage"
        actions={
          <>
            <Button variant="ghost" onClick={() => setConfirmAdvance(false)}>Cancel</Button>
            <Button disabled={saving} onClick={advance}>{busyIcon(saving)}Advance</Button>
          </>
        }
      >
        {!advancing.length ? (
          <p>Nobody moves on: the standings are empty.</p>
        ) : (
          <>
            <p className="mb-2">These entrants move into the next stage.</p>
            <ul className="ml-4 list-disc">
              {advancing.map((row) => (
                <li key={row.entrant_id}>{row.name}</li>
              ))}
            </ul>
          </>
        )}
      </Ask>

      {/* Taking the draw back loses every result in it, so the confirm names what goes */}
      <Ask
        open={confirmUndraw}
        onOpenChange={closeUndraw}
        title="Undo the draw"
        tone="error"
        size="confirm"
        actions={
          <>
            <Button id="undraw-cancel" variant="ghost" disabled={saving} onClick={() => closeUndraw(false)}>Cancel</Button>
            <Button id="undraw-confirm" variant="destructive" disabled={saving} onClick={undraw}>
              {busyIcon(saving)}
              {resultsToDelete != null ? `Delete ${resultsToDelete} ${resultsToDelete === 1 ? "result" : "results"}` : "Undo the draw"}
            </Button>
          </>
        }
      >
        <StatusAlert modelValue={dialogError} onClose={() => setDialogError(null)} />
        {resultsToDelete != null ? (
          <p id="undraw-results" className="mb-2">
            <span className="tnum font-bold">{resultsToDelete}</span> {resultsToDelete === 1 ? "series of this stage holds a result" : "series of this stage hold results"}. Undoing the draw deletes {resultsToDelete === 1 ? "it" : "them"}.
          </p>
        ) : (
          <p className="mb-2">
            The bracket and its {series.length} series are deleted
            {playedCount(series) ? `, with ${playedCount(series)} ${playedCount(series) === 1 ? "result" : "results"}` : ""}, their map vetoes and replays.
          </p>
        )}
        <p className="text-muted-foreground">Every player stays in. Add or remove players, seed again and draw again.</p>
      </Ask>

      {/* Finishing writes the places, so it names who takes each one first */}
      <Ask
        open={confirmFinish}
        onOpenChange={setConfirmFinish}
        title="Finish this event"
        actions={
          <>
            <Button variant="ghost" disabled={saving} onClick={() => setConfirmFinish(false)}>Cancel</Button>
            <Button disabled={!awards.length || saving} onClick={finish}>{busyIcon(saving)}Finish</Button>
          </>
        }
      >
        <StatusAlert modelValue={dialogError} onClose={() => setDialogError(null)} />
        {!awards.length ? (
          <p>Nobody is awarded: this stage&apos;s table is empty. Enter the results first.</p>
        ) : (
          <>
            <p className="mb-2">These entrants are awarded their place.</p>
            <Table>
              <TableHeader>
                <TableRow>
                  {awardsByDivision ? <TableHead>Division</TableHead> : null}
                  <TableHead>Entrant</TableHead>
                  <TableHead>Place</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {awards.map((one) => (
                  <TableRow key={one.key}>
                    {awardsByDivision ? <TableCell>{one.division || "—"}</TableCell> : null}
                    <TableCell>{one.name}</TableCell>
                    <TableCell>
                      {placeMedal(one.place) ? <Icon name={placeIcon(one.place)} size={16} className={cn("mr-1", MEDAL_TEXT[placeMedal(one.place)])} /> : null}
                      {one.title}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <p className="mt-3 text-xs text-muted-foreground">Finishing again rewrites the places from the table as it stands.</p>
          </>
        )}
      </Ask>

      {/* One free for all lobby: where every seat finished, its map, and who sits in it */}
      {lobbyOpen && picked ? (
        <LobbyPlacesDialog
          key={picked.id}
          lobby={picked}
          open
          onOpenChange={setLobbyOpen}
          saving={saving}
          error={dialogError}
          onError={setDialogError}
          onSave={savePlaces}
          maps={event?.maps || []}
          onMap={changeMap}
          onClear={clearLobby}
          onMove={openMove}
        />
      ) : null}

      {/* An entrant leaves one lobby for another, before either of them is played */}
      <Ask
        open={moveOpen}
        onOpenChange={setMoveOpen}
        title="Move to another lobby"
        size="sm"
        actions={
          <>
            <Button variant="ghost" disabled={saving} onClick={() => setMoveOpen(false)}>Cancel</Button>
            <Button disabled={!moveTo || saving} onClick={moveEntrant}>{busyIcon(saving)}Move</Button>
          </>
        }
      >
        <StatusAlert modelValue={dialogError} onClose={() => setDialogError(null)} />
        <Pick labelAfter label="Lobby" items={moveTargets.map((item) => ({ value: item.id, title: item.label }))} value={moveTo} onChange={setMoveTo} />
        {!moveTargets.length ? <p className="mt-3 text-muted-foreground">This round holds no other lobby that is still to play.</p> : null}
      </Ask>

      {/* One series: the winner of each game, or a result no game was played for */}
      <Ask
        open={resultOpen && !!picked}
        onOpenChange={setResultOpen}
        title="Enter a result"
        size="md"
        actions={
          <>
            {scored ? (
              <Button variant="ghost" className="text-error" disabled={saving} onClick={() => reopen(false)}>
                {busyIcon(saving)}Reopen
              </Button>
            ) : null}
            <span className="flex-1" />
            <Button variant="ghost" disabled={saving} onClick={() => setResultOpen(false)}>Close</Button>
            <Button disabled={!validScore || saving} onClick={saveScore}>{busyIcon(saving, "mdi-content-save")}Save result</Button>
          </>
        }
      >
        <StatusAlert modelValue={dialogError} onClose={() => setDialogError(null)} />
        <p className="mb-4 text-base">
          {nameOf(1)} {score[0]} – {score[1]} {nameOf(2)}
        </p>

        {scored ? (
          <Alert className="alert mb-4 text-info">
            <AlertDescription className="flex items-start gap-2 text-foreground">
              <Icon name="mdi-information-outline" className="text-info" />
              This series carries a result. Reopening it clears every side it feeds.
            </AlertDescription>
          </Alert>
        ) : null}

        {bothSides ? (
          <>
            {gameRows.map((game) => (
              <div key={game} className="mb-3">
                <div className="mb-1 text-sm font-medium">Game {game}</div>
                <ToggleGroup
                  variant="outline"
                  spacing={0}
                  className="w-full"
                  aria-label={`Game ${game}`}
                  value={winners[game - 1] ? [winners[game - 1] as string] : []}
                  onValueChange={(value) => setWinner(game, (value[0] as string) || null)}
                >
                  <ToggleGroupItem value="A" className={WON}>
                    {winners[game - 1] === "A" ? <Icon name="mdi-check" /> : null}
                    {nameOf(1)} won
                  </ToggleGroupItem>
                  <ToggleGroupItem value="B" className={WON}>
                    {winners[game - 1] === "B" ? <Icon name="mdi-check" /> : null}
                    {nameOf(2)} won
                  </ToggleGroupItem>
                </ToggleGroup>
              </div>
            ))}
            <p className="mb-4 text-xs text-muted-foreground">The map and the replay of each game are entered by the players.</p>
          </>
        ) : (
          <p className="mb-4 text-muted-foreground">Both sides fill when the series above are played.</p>
        )}

        <Separator className="mb-4" />
        <div className="mb-2 text-sm font-medium">No game played</div>
        <ToggleGroup
          variant="outline"
          spacing={0}
          className="mb-2 w-full"
          aria-label="No game played"
          value={awardSide ? [String(awardSide)] : []}
          onValueChange={(value) => setAwardSide(value[0] ? Number(value[0]) : null)}
        >
          <ToggleGroupItem value="1" className={WON}>
            {awardSide === 1 ? <Icon name="mdi-check" /> : null}
            {nameOf(1)}
          </ToggleGroupItem>
          <ToggleGroupItem value="2" className={WON}>
            {awardSide === 2 ? <Icon name="mdi-check" /> : null}
            {nameOf(2)}
          </ToggleGroupItem>
        </ToggleGroup>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={!awardSide || scored || saving} onClick={() => award("walkover")}>
            Walkover
          </Button>
          <Button variant="outline" size="sm" disabled={!awardSide || scored || saving} onClick={() => award("forfeit")}>
            Forfeit
          </Button>
        </div>
      </Ask>

      {/* A reopen the engine refused: a series below already carries a result */}
      <Ask
        open={confirmForce}
        onOpenChange={setConfirmForce}
        title="Reopen past a played series"
        tone="error"
        size="confirm"
        actions={
          <>
            <Button variant="ghost" onClick={() => setConfirmForce(false)}>Cancel</Button>
            <Button variant="destructive" disabled={saving} onClick={() => reopen(true)}>{busyIcon(saving)}Reopen anyway</Button>
          </>
        }
      >
        A series below this one already carries a result. Reopening clears it, and the bracket refills when this series is scored again.
      </Ask>
    </>
  );
}

export default EventAdminView;
