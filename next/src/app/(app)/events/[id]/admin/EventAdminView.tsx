"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Icon } from "@/components/ui/Icon";
import { Input } from "@/components/ui/input";
import { Pick } from "@/components/ui/Pick";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { toneClass } from "@/components/ui/tone";
import { EventHeader } from "@/components/EventHeader";
import { PlayerName } from "@/components/PlayerName";
import { StageView } from "@/components/StageView";
import { StatusAlert } from "@/components/StatusAlert";
import { FORMATS, SEED_SOURCES, seriesPerEntrant, seriesPerFixture, titleOf } from "@/helpers/event-labels.mjs";
import { winsFor } from "@/helpers/best-of.mjs";
import { gameSlots, scoreOf } from "@/helpers/map-order.mjs";
import {
  advancingRows, chainChallengers, drawsByRound, generateFields, isLobby, isScored,
  lobbySeats, lobbyTargets, nextRound, pendingChainSeries, sideName, standsOn,
} from "@/helpers/stage-view.mjs";
import { awardList, placeIcon, placeMedal } from "@/helpers/awards.mjs";
import { entrantName, rostersByEntrant } from "@/helpers/entrants.mjs";
import { useEventStore, useTeamStore } from "@/stores";
import { cn } from "@/lib/utils";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>;

// The helpers are plain JS, so their defaults type the parameters; the seam names the real shapes.
const fieldsOf = generateFields as unknown as (entrants: Row[], divisions?: Row[], format?: string) => Row[];
const advancingOf = advancingRows as unknown as (standings: Row[], count?: number | null) => Row[];
const awardsOf = awardList as unknown as (standings: Row[]) => Row[];
const pendingOf = pendingChainSeries as unknown as (series: Row[], divisions?: Row[]) => Row[];
const challengersOf = chainChallengers as unknown as (entrants: Row[], series: Row[]) => Row[];
const targetsOf = lobbyTargets as unknown as (series: Row[], picked: Row | null) => { id: number; label: string }[];
const nextRoundOf = nextRound as unknown as (stage: Row | null, series: Row[], divisions?: Row[]) => { number: number; done: boolean; blocked: string | null };
const rostersOf = rostersByEntrant as unknown as (entrants: Row[], teams: Row[], eventId: number) => Record<string, Row[]>;
const seatsOf = lobbySeats as (row: Row) => Row[];

// The one refusal a force answers, as app/services/stage_engine.py on_reopened words it
const NEEDS_FORCE = "A later series already carries a result";
const MEDAL_TEXT: Record<string, string> = { "medal-gold": "text-medal-gold", "medal-silver": "text-medal-silver", primary: "text-primary" };
// Tailwind builds no class from a number held in data, so the three dialog widths are written out
const WIDTH: Record<number, string> = { 480: "md:max-w-[480px]", 520: "md:max-w-[520px]", 560: "md:max-w-[560px]" };
const WON = "flex-1 aria-pressed:bg-primary/15 aria-pressed:text-primary-text";

/** One ask of the run page: the title bar, the body and the row of answers. */
function Ask({
  open,
  onOpenChange,
  title,
  tone = "primary",
  width = 520,
  actions,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  tone?: "primary" | "error";
  width?: 480 | 520 | 560;
  actions: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className={cn("gap-0 p-0", WIDTH[width])}>
        <DialogTitle className={cn("px-4 py-3", tone === "error" ? "bg-error text-on-error" : "bg-primary text-on-primary")}>{title}</DialogTitle>
        <div className="p-4">{children}</div>
        <div className="flex items-center justify-end gap-2 p-4 pt-0">{actions}</div>
      </DialogContent>
    </Dialog>
  );
}

const busyIcon = (busy: boolean, icon?: string) => (busy ? <Icon name="mdi-loading mdi-spin" /> : icon ? <Icon name={icon} /> : null);

/** The run page: an admin generates a stage or draws a Swiss round, enters every result,
 *  reopens one and advances the stage. It draws each stage with the same StageView the
 *  public page shows. */
export function EventAdminView({ id }: { id: string }) {
  const store = useEventStore();
  const teamStore = useTeamStore();

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

  const [confirmGenerate, setConfirmGenerate] = useState(false);
  const [confirmDraw, setConfirmDraw] = useState(false);
  const [confirmAdvance, setConfirmAdvance] = useState(false);
  const [confirmFinish, setConfirmFinish] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);
  const [challengerOpen, setChallengerOpen] = useState(false);
  const [challenger, setChallenger] = useState<number | null>(null);
  const [confirmForce, setConfirmForce] = useState(false);
  const [resultOpen, setResultOpen] = useState(false);
  const [lobbyOpen, setLobbyOpen] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);
  const [order, setOrder] = useState<Row[]>([]); // the seats of the open lobby, best place first
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const [moving, setMoving] = useState<Row | null>(null); // the seat the move dialog carries
  const [moveTo, setMoveTo] = useState<number | null>(null);
  const [picked, setPicked] = useState<Row | null>(null);
  const [winners, setWinners] = useState<(string | null)[]>([]);
  const [awardSide, setAwardSide] = useState<number | null>(null);

  const stagesOf = (row: Row | null): Row[] => [...(row?.stages || [])].sort((a, b) => a.position - b.position);
  const stages = stagesOf(event);
  const stage: Row | null = stages[tab] || null;
  const complete = series.length > 0 && series.every(isScored);

  // The two series settings, each where it applies: the round robin's own, and the fixture's
  const entrantSeries = seriesPerEntrant(stage);
  const fixtureSeries = seriesPerFixture(event);

  // What the generate dialog promises: where the seeds come from, and the field per division
  const seedSource = titleOf(SEED_SOURCES, entrants.find((row) => row.seed_source)?.seed_source || "mmr");
  const fields = fieldsOf(entrants, event?.divisions, stage?.format);
  const showByes = fields.some((row) => row.byes != null);

  // Who the next stage takes: the top of each division's table, or the whole table
  const advancing = advancingOf(standings, stage?.advance_count);

  // Closing the event freezes the table of its last stage, so the finish sits on that tab
  const lastStage = !!stage && tab === stages.length - 1;
  const awards = awardsOf(standings);
  const awardsByDivision = awards.some((one) => one.division);

  // A Swiss stage draws one round at a time; the engine refuses while a drawn series has no
  // result, and once the stage has drawn every round it plays
  const drawsRounds = drawsByRound(stage);
  const draw = nextRoundOf(stage, series, event?.divisions);
  const drawNote = !drawsRounds ? "" : draw.done ? "This stage has drawn every round it plays." : draw.blocked || "";

  // A chain stage is a KOTH night: it takes one challenger at a time and an admin closes it
  const isChain = stage?.format === "koth";
  const pendingCount = pendingOf(series, event?.divisions).length;
  const divisionName = (divisionId: number) => event?.divisions?.find((band: Row) => band.id === divisionId)?.name || "";
  const challengerItems = challengersOf(entrants, series);
  // The picker needs a plain string for a row that PlayerName draws itself; a row with no
  // name at all still reads as something
  const challengerTitle = (row: Row) => entrantName(row) || "Unnamed";

  const loadStage = async (ofEvent: Row | null = event, ofStage: Row | null = stage) => {
    setSeries([]);
    setRounds([]);
    setStandings([]);
    if (!ofEvent || !ofStage) return;
    try {
      const [drawn, table] = await Promise.all([store.fetchStage(ofEvent.id, ofStage.id), store.fetchStandings(ofEvent.id, ofStage.id).catch(() => [])]);
      const rows: Row[] = drawn.series || [];
      setSeries(rows);
      setRounds(drawn.rounds || []);
      setStandings(table);
      // A reload swaps every series row, so the open dialog follows the one it was showing
      const shown = picked ? rows.find((row) => row.id === picked.id) || null : null;
      setPicked(shown);
      if (shown && lobbyOpen) setOrder(seatsOf(shown));
    } catch (e) {
      setError(`The stage did not load: ${(e as Error).message}`);
    }
  };

  const pickTab = (index: number) => {
    setTab(index);
    loadStage(event, stages[index] || null);
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [row, leagues] = await Promise.all([store.fetchEvent(Number(id)), store.fetchLeagues()]);
        setEvent(row);
        setLeague(leagues.find((one: Row) => one.id === row.league_id) || null);
        const rows: Row[] = await store.fetchEntrants(row.id).catch(() => []);
        setEntrants(rows);
        // only a team event fields rosters, so nothing else pays for the read
        if (row.entrant_kind === "team") {
          const teams = await teamStore.fetchTeamsBySeason(row.id).catch(() => []);
          setRosters(rostersOf(rows, teams, row.id));
        }
        await loadStage(row, stagesOf(row)[0] || null);
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

  const openChallenger = () => {
    setChallenger(null);
    setDialogError(null);
    setChallengerOpen(true);
  };
  const addChallenger = async () => {
    if (!(await run(() => store.addChallenger(event!.id, stage!.id, challenger as number)))) setChallengerOpen(false);
  };
  const closeNight = async () => {
    if (!(await run(() => store.closeNight(event!.id)))) {
      setConfirmClose(false);
      await readEvent();
    }
  };

  // One series in the dialog: its games open on the score it already carries. A free for
  // all lobby carries places instead of a score, so it opens the placement dialog.
  const openSeries = (row: Row) => {
    setPicked(row);
    setDialogError(null);
    setAwardSide(null);
    if (isLobby(row)) {
      setOrder(seatsOf(row));
      setLobbyOpen(true);
      return;
    }
    const [a, b] = [row.player1_score ?? 0, row.player2_score ?? 0];
    setWinners([...Array(a).fill("A"), ...Array(b).fill("B")]);
    setResultOpen(true);
  };

  // The places are the order of the rows, so a drag and a typed place do the same move
  const moveSeat = (from: number | null, to: number | null) => {
    if (from == null || to == null || to < 0 || to >= order.length || from === to) return;
    const rows = [...order];
    rows.splice(to, 0, ...rows.splice(from, 1));
    setOrder(rows);
  };

  const lobbyScored = isScored(picked);
  const emptySeats = order.filter((seat) => !seat.entrant_id).length;
  // A lobby seats two entrants or more, so the third seat is the first one free to leave
  const canMove = order.filter((seat) => seat.entrant_id).length > 2;
  const seatName = (seat: Row) => seat.user?.name || `seat ${seat.side_no}`;

  const savePlaces = async () => {
    const places = order.map((seat, index) => ({ side_no: seat.side_no, place: index + 1 }));
    if (!(await run(() => store.setPlaces(picked!.id, places)))) setLobbyOpen(false);
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
    const left = order.map((seat) => seat.entrant_id).filter((entrantId) => entrantId && entrantId !== moving!.entrant_id);
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
    if (!(await run(() => store.awardSeries(picked!.id, kind, awardSide)))) setResultOpen(false);
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

  const entrantRow = (row: Row) =>
    row.user ? <PlayerName player={row.user} race={row.race} plain mmr={row.mmr || false} /> : <span>{entrantName(row)}</span>;

  return (
    <>
      <StatusAlert modelValue={error} onClose={() => setError(null)} />
      {loading ? <Progress value={null} /> : null}

      {event ? (
        <>
          <EventHeader event={event} league={league} />
          <Button nativeButton={false} size="sm" variant="outline" className="mt-3 text-primary-text" render={<Link href={`/events/${event.id}`} />}>
            <Icon name="mdi-eye-outline" />
            Public page
          </Button>

          {stages.length > 1 ? (
            <Tabs value={tab} onValueChange={(value) => pickTab(value as number)} className="mt-4">
              <TabsList variant="line" className="max-w-full justify-start overflow-x-auto">
                {stages.map((one, index) => (
                  <TabsTrigger key={one.id} value={index} className="flex-none px-3">
                    {one.name || `Stage ${one.position}`}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          ) : null}

          {stage ? (
            <>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <Badge className={toneClass(null)}>{titleOf(FORMATS, stage.format)}</Badge>
                <Badge className={toneClass(null)}>Best of {stage.best_of}</Badge>
                {entrantSeries ? <Badge className={toneClass(null)}>{entrantSeries} series each entrant a round</Badge> : null}
                {fixtureSeries ? <Badge className={toneClass(null)}>{fixtureSeries} series per fixture</Badge> : null}
                {stage.auto_advance ? (
                  <Badge className={toneClass("info")}>
                    <Icon name="mdi-fast-forward" />
                    Advance is automatic
                  </Badge>
                ) : null}
                <span className="flex-1" />
                {/* a KOTH night grows one challenger at a time and ends when the admin closes it */}
                {isChain ? (
                  <>
                    {series.length ? (
                      <Button variant="outline" className="text-primary-text" disabled={saving} onClick={openChallenger}>
                        <Icon name="mdi-account-plus" />
                        Add challenger
                      </Button>
                    ) : null}
                    <Button variant="outline" className="text-error" disabled={saving} onClick={() => setConfirmClose(true)}>
                      <Icon name="mdi-crown-outline" />
                      Close the night
                    </Button>
                  </>
                ) : null}
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
                {complete ? (
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
              </div>
              {drawNote ? <p className="mt-1 text-xs text-muted-foreground">{drawNote}</p> : null}

              <div className="mt-4">
                <StageView stage={stage} series={series} rounds={rounds} divisions={event.divisions} standings={standings} rosters={rosters} onOpenSeries={openSeries} />
              </div>
            </>
          ) : null}
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
              <TableHead>Division</TableHead>
              <TableHead className="text-right">Entrants</TableHead>
              {showByes ? <TableHead className="text-right">Byes</TableHead> : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {fields.map((row) => (
              <TableRow key={row.key}>
                <TableCell>{row.name}</TableCell>
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

      {/* One more challenger at the end of his own chain */}
      <Ask
        open={challengerOpen}
        onOpenChange={setChallengerOpen}
        title="Add challenger"
        width={480}
        actions={
          <>
            <Button nativeButton={false} variant="ghost" render={<Link href={`/events/${event?.id}/entrants`} />}>Entrants</Button>
            <span className="flex-1" />
            <Button variant="ghost" onClick={() => setChallengerOpen(false)}>Cancel</Button>
            <Button disabled={!challenger || saving} onClick={addChallenger}>{busyIcon(saving)}Add challenger</Button>
          </>
        }
      >
        <StatusAlert modelValue={dialogError} onClose={() => setDialogError(null)} />
        <Pick
          labelAfter
          label="Entrant"
          items={challengerItems.map((row) => ({ value: row.id as number, title: challengerTitle(row), row }))}
          value={challenger}
          onChange={setChallenger}
          row={(item) => (
            <span className="flex flex-col">
              {entrantRow(item.row)}
              <span className="text-xs text-muted-foreground">{divisionName(item.row.division_id)}</span>
            </span>
          )}
        />
        {!challengerItems.length ? <p className="mt-3 text-muted-foreground">Every entrant already plays in a chain. Enter the player on the entrants page first.</p> : null}
      </Ask>

      {/* Closing deletes the series nobody played, so it counts them first */}
      <Ask
        open={confirmClose}
        onOpenChange={setConfirmClose}
        title="Close the night"
        tone="error"
        actions={
          <>
            <Button variant="ghost" onClick={() => setConfirmClose(false)}>Cancel</Button>
            <Button variant="destructive" disabled={saving} onClick={closeNight}>{busyIcon(saving)}Close the night</Button>
          </>
        }
      >
        <p>
          {pendingCount} {pendingCount === 1 ? "series goes" : "series go"}: nobody played {pendingCount === 1 ? "it" : "them"}. Every series left carries a result and the night reads
          finished.
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

      {/* One free for all lobby: where every seat finished, and who sits in it */}
      <Ask
        open={lobbyOpen && !!picked}
        onOpenChange={setLobbyOpen}
        title="Enter the places"
        width={560}
        actions={
          <>
            <Button variant="ghost" disabled={saving} onClick={() => setLobbyOpen(false)}>Close</Button>
            <Button disabled={!!emptySeats || saving} onClick={savePlaces}>{busyIcon(saving, "mdi-content-save")}Save places</Button>
          </>
        }
      >
        <StatusAlert modelValue={dialogError} onClose={() => setDialogError(null)} />
        <p className="mb-4 text-muted-foreground">The order is the result: drag a seat, or type its place. The winner is 1.</p>
        {/* One seat a row: the place first, then who sits in it, then the move out of the lobby */}
        <div>
          {order.map((seat, index) => (
            <div
              key={seat.side_no}
              className={cn("flex items-center gap-2.5 border-t py-1 first:border-t-0", dragFrom === index && "opacity-50")}
              draggable
              onDragStart={() => setDragFrom(index)}
              onDragEnd={() => setDragFrom(null)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => moveSeat(dragFrom, index)}
            >
              <Icon name="mdi-drag-horizontal-variant" size={18} className="cursor-grab text-muted-foreground" />
              <Input
                // The box follows its seat: it reads the place again whenever it is not being typed into
                ref={(el) => {
                  if (el && document.activeElement !== el) el.value = String(index + 1);
                }}
                type="number"
                min="1"
                max={order.length}
                className="tnum max-w-[76px]"
                aria-label={`Place of ${seatName(seat)}`}
                onChange={(e) => moveSeat(index, Number(e.target.value) - 1)}
                onBlur={(e) => (e.target.value = String(index + 1))}
              />
              {seat.user ? <PlayerName player={seat.user} plain /> : <span className="text-muted-foreground">Empty seat</span>}
              <span className="flex-1" />
              {!lobbyScored && seat.entrant_id && canMove ? (
                <Button variant="ghost" size="sm" disabled={saving} onClick={() => openMove(seat)}>
                  Move
                </Button>
              ) : null}
            </div>
          ))}
        </div>
        {emptySeats ? (
          <p className="mt-3 text-xs text-muted-foreground">This lobby seats nobody yet in {emptySeats} of its places. It fills when the round before it is played.</p>
        ) : !lobbyScored && !canMove ? (
          <p className="mt-3 text-xs text-muted-foreground">A lobby seats two entrants or more, so nobody leaves this one.</p>
        ) : null}
      </Ask>

      {/* An entrant leaves one lobby for another, before either of them is played */}
      <Ask
        open={moveOpen}
        onOpenChange={setMoveOpen}
        title="Move to another lobby"
        width={480}
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
        width={560}
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
        width={480}
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
