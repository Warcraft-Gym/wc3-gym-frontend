"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, dialogCompact, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Field } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { toneClass } from "@/components/ui/tone";
import { DivisionBracketing } from "@/components/DivisionBracketing";
import { PageHeader } from "@/components/PageHeader";
import { StreamLinks } from "@/components/koth/StreamLinks";
import { RaceSelect } from "@/components/RaceSelect";
import { StatusAlert } from "@/components/StatusAlert";
import { HistoricalBoard } from "@/components/koth/HistoricalBoard";
import { BoardPlayer, BracketCard, raceName, seatMark, type BracketAdmin } from "@/components/koth/BracketCard";
import { backendUrl, fetchWrapper } from "@/helpers";
import { dateRange } from "@/helpers/event-labels.mjs";
import { domainOf, bandOf } from "@/helpers/divisions.mjs";
import { boundsOf, bracketLabel, cutsOf, movedQueue, nightStatus, openSeriesRows, orderedBrackets, queueIds, ratedPlayers, seatKey, seatRow, wearsTheCrown } from "@/helpers/koth-board.mjs";
import { nightBody, nightForm } from "@/helpers/koth.mjs";
import { battleTagError } from "@/helpers/signup.mjs";
import { useEventStore } from "@/stores";
import { cn } from "@/lib/utils";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>;

// One bronze step per bracket, light to dark, as the entrants page colours its divisions
const RAMP = ["heat-1", "heat-2", "heat-3", "heat-4", "heat-5"];

// The night fields the details dialog writes, as the form holds them
type NightForm = { name: string; start_date: string; start_time: string; stream_url: string; page_url: string; signups_open: boolean; published: boolean };

// The header's status badge, by what nightStatus answers
const STATUS: Record<string, { label: string; tone: string | null; icon: string }> = {
  closed: { label: "Closed", tone: "draw", icon: "mdi-check" },
  not_started: { label: "Not started", tone: null, icon: "mdi-clock-outline" },
  running: { label: "Running", tone: "primary", icon: "mdi-play" },
};

/** The run page of one KOTH night: the admin starts every series by hand, enters its winner,
 *  edits the line while people come and go, places the signups W3Champions gave no rating
 *  for, sets the night's details and its bracket bounds, and closes the night. Every board
 *  write answers the whole board, so the page never reads itself again after one. */
export function KothNightView({ id }: { id: string }) {
  const nightId = Number(id);
  const store = useEventStore();
  const router = useRouter();

  const [board, setBoard] = useState<Row | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [picks, setPicks] = useState<Record<number, number>>({}); // the race row each seat plays next
  const [picked, setPicked] = useState<number[]>([]); // the seats clicked for the next pair

  const [stepDown, setStepDown] = useState<Row | null>(null);
  const [passTo, setPassTo] = useState<number | null>(null); // null leaves the throne empty
  const [closing, setClosing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [event, setEvent] = useState<Row | null>(null); // read once, for the details dialog and the signups badge
  const [form, setForm] = useState<NightForm | null>(null);
  const [details, setDetails] = useState(false); // the Night Details dialog
  const [readAt, setReadAt] = useState(0); // when the board last answered, which the status reads against the start
  const [cuts, setCuts] = useState<number[]>([]); // the strip's cuts, ascending
  const [addTo, setAddTo] = useState(false); // W3Champions picks the bracket, so the dialog is one form
  const [addTag, setAddTag] = useState("");
  const [addRace, setAddRace] = useState<string | null>(null);
  const [addError, setAddError] = useState<string | null>(null);
  const [moveKing, setMoveKing] = useState<{ bracket: Row; seat: Row; entrantId: number; divisionId: number } | null>(null);
  const [dropUnplaced, setDropUnplaced] = useState<Row | null>(null); // the unplaced signup the confirm names
  const [erase, setErase] = useState<{ name: string; rows: Row[] } | null>(null); // the rows that left, which the delete confirm names

  const storedCuts = useRef(""); // the bounds the last board answered, so a drag survives a write

  const brackets: Row[] = orderedBrackets(board);
  const unplaced: Row[] = board?.unplaced ?? [];

  // A bracket that plays a series takes no pair, so a pick left on its line clears with the answer
  const takeBoard = (answer: Row) => {
    setBoard(answer);
    setReadAt(Date.now());
    // the strip follows the board only when its bounds moved, so a cut being dragged survives a write
    const stored = JSON.stringify(cutsOf(answer));
    if (stored !== storedCuts.current) {
      storedCuts.current = stored;
      setCuts(cutsOf(answer));
    }
    const running = orderedBrackets(answer)
      .filter((bracket: Row) => bracket.open_series)
      .flatMap((bracket: Row) => (bracket.queue ?? []).map(seatKey));
    setPicked((was) => was.filter((key) => !running.includes(key)));
  };

  useEffect(() => {
    let alive = true;
    const read = async () => {
      try {
        const answer = await store.fetchBoard(nightId);
        if (alive) {
          takeBoard(answer);
          setError(null);
        }
      } catch (e) {
        // a night nobody published answers 404, which the page says on its own
        if (alive && (e as Row).status !== 404) setError(`The night did not load: ${(e as Error).message}`);
      }
    };
    read().then(() => alive && setLoading(false));
    store
      .fetchEvent(nightId)
      .then((row: Row) => {
        if (!alive) return;
        setEvent(row);
        setForm(nightForm(row));
      })
      .catch((e: Error) => alive && setError(`The night's settings did not load: ${e.message}`));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nightId]);

  // Every admin write answers the new board; a route that answers its own row reads it back fresh
  // The event's entrants, series, crowns and videos follow it through their foreign keys
  const deleteNight = async () => {
    setBusy(true);
    setError(null);
    try {
      await store.deleteEvent(nightId);
      router.replace("/koth");
    } catch (e) {
      setError((e as Error).message);
      setDeleting(false);
      setBusy(false);
    }
  };

  const run = async (call: () => Promise<any>, after?: () => void) => {
    setBusy(true);
    setError(null);
    try {
      const answer = await call();
      takeBoard(answer?.brackets ? answer : await store.fetchBoard(nightId, true));
      after?.();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  // One write per race row; several read the board fresh at the end, even after a failed one
  const runEach = (entrantIds: number[], write: (entrantId: number) => Promise<any>) =>
    entrantIds.length === 1
      ? run(() => write(entrantIds[0]))
      : run(async () => {
          let failure: unknown = null;
          try {
            for (const entrantId of entrantIds) await write(entrantId);
          } catch (e) {
            failure = e;
          }
          const fresh = await store.fetchBoard(nightId, true);
          if (!failure) return fresh;
          takeBoard(fresh);
          throw failure;
        });

  // Moving the crowned race empties the throne, so it asks first; another race of the king moves like any row
  const moveBracket = (bracket: Row, seat: Row, entrantId: number, divisionId: number) => {
    if (wearsTheCrown(bracket, entrantId)) setMoveKing({ bracket, seat, entrantId, divisionId });
    else run(() => store.moveKothEntrant(nightId, entrantId, divisionId));
  };

  // The played row names the side the winner played, so the flip writes the other side
  const changeWinner = async (played: Row) => {
    if (played.winner_side === 1 || played.winner_side === 2) {
      return await store.setKothWinner(nightId, played.series_id, played.winner_side === 1 ? 2 : 1);
    }
    // a board answered before the side landed in the read still needs the series row
    const series = await fetchWrapper.get(`${backendUrl}/series/${played.series_id}`);
    const side = series.player1_id === played.loser.user_id ? 1 : 2;
    return await store.setKothWinner(nightId, played.series_id, side);
  };

  const admin: BracketAdmin = {
    picks,
    picked,
    busy,
    // a third click starts a new pair, so the admin never has to clear one first
    onPickSeat: (seat) => {
      const key = seatKey(seat) as number;
      setPicked((was) => (was.includes(key) ? was.filter((one) => one !== key) : was.length >= 2 ? [key] : [...was, key]));
    },
    onPickRace: (seat, entrantId) => setPicks((was) => ({ ...was, [seatKey(seat) as number]: entrantId })),
    onClearPick: () => setPicked([]),
    onStart: (bracket, pair) =>
      run(
        () => store.startKothSeries(nightId, seatRow(pair[0], picks)?.entrant_id, seatRow(pair[1], picks)?.entrant_id),
        () => setPicked([]),
      ),
    onWin: (bracket, side) => run(() => store.setKothWinner(nightId, bracket.open_series.series_id, side)),
    onCancelSeries: (bracket) => run(() => store.cancelKothSeries(nightId, bracket.open_series.series_id)),
    onStepDown: (bracket) => {
      setPassTo(null);
      setStepDown(bracket);
    },
    onMove: (bracket, from, to) =>
      run(() => store.setKothQueue(nightId, bracket.division_id, queueIds(movedQueue(bracket.queue ?? [], from, to)))),
    onMoveBracket: moveBracket,
    onRemove: (entrantIds) => runEach(entrantIds, (entrantId) => store.removeKothEntrant(nightId, entrantId)),
    onRestore: (entrantIds) => runEach(entrantIds, (entrantId) => store.restoreKothEntrant(nightId, entrantId)),
    onErase: (name, rows) => setErase({ name, rows }),
    onChangeWinner: (played) => run(() => changeWinner(played)),
  };

  const openAddPlayer = () => {
    setAddTag("");
    setAddRace(null);
    setAddError(null);
    setAddTo(true);
  };

  const addPlayer = async () => {
    // the shape is read here as well as on the signup door, so both print the one sentence
    const shape = battleTagError(addTag);
    setAddError(shape);
    if (shape) return;
    setBusy(true);
    try {
      await store.addEntrant(nightId, { battle_tag: addTag.trim(), race: addRace });
      takeBoard(await store.fetchBoard(nightId, true));
      setAddTo(false);
    } catch (e) {
      setAddError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const passOptions: Row[] = (stepDown?.queue ?? []).filter((seat: Row) => (seat.rows ?? []).length);
  const passName = passOptions.find((seat: Row) => seatKey(seat) === passTo)?.name;
  const openRows: Row[] = openSeriesRows(board);
  const moveFrom = moveKing ? bracketLabel(brackets, moveKing.bracket).name : "";
  const eraseRaces: string[] = (erase?.rows ?? []).map((row: Row) => raceName(row.race)).filter(Boolean);
  const eraseWho = eraseRaces.length ? new Intl.ListFormat("en", { type: "conjunction" }).format(eraseRaces) : "The signup";

  const saveBounds = () => run(() => store.setKothBounds(nightId, boundsOf(board, cuts)));

  // The strip: every rated race row, one dot each, cut where the brackets open
  const rated: Row[] = ratedPlayers(board);
  const stripPlayers = rated.map((row) => ({ id: row.entrant_id, who: row.user_id ?? row.entrant_id, label: row.name, mmr: row.mmr, band: bandOf(row.mmr, cuts) as number }));
  const stripNames = brackets.map((bracket: Row) => bracketLabel(brackets, bracket).name);
  const stripColors = brackets.map((unused, index) => RAMP[Math.round((index * (RAMP.length - 1)) / Math.max(1, brackets.length - 1))]);
  // the stored cuts sit inside the axis even where no player is rated near them, and a drag never moves the axis
  const savedCuts: number[] = cutsOf(board);
  const stripDomain: number[] = domainOf([...rated.map((row) => row.mmr), ...savedCuts.flatMap((cut) => [cut - 150, cut + 150])]);
  const boundsMoved = JSON.stringify(cuts) !== JSON.stringify(savedCuts);

  const status = STATUS[nightStatus(board, readAt)];

  const setField = (patch: Partial<NightForm>) => setForm((was) => (was ? { ...was, ...patch } : was));
  // the dialog shows only its own error, and a close discards the edits
  const openDetails = () => {
    setError(null);
    setDetails(true);
  };
  const closeDetails = () => {
    setDetails(false);
    if (event) setForm(nightForm(event));
  };
  const saveNight = () =>
    run(async () => {
      const saved = await store.updateEvent(nightId, nightBody(form as NightForm));
      setEvent(saved);
      setForm(nightForm(saved));
      setDetails(false);
      return null;
    });

  return (
    <>
      <PageHeader title={board?.name || "KOTH Night"} lead={board ? dateRange(board) : undefined}>
        <Badge className={toneClass(status.tone)}>
          <Icon name={status.icon} />
          {status.label}
        </Badge>
        <Badge className={toneClass(null)}>
          <Icon name="mdi-account-multiple" />
          {board?.entrant_count ?? 0} signed up
        </Badge>
        {event && !board?.closed ? (
          <Badge className={toneClass(event.signups_open ? "success" : null)}>
            <Icon name={event.signups_open ? "mdi-lock-open-variant-outline" : "mdi-lock-outline"} />
            {event.signups_open ? "Signups open" : "Signups closed"}
          </Badge>
        ) : null}
        {event && !event.published ? (
          <Badge className={toneClass(null)}>
            <Icon name="mdi-eye-off-outline" />
            Not published
          </Badge>
        ) : null}
        <span className="ml-auto flex flex-wrap gap-2">
          {board && !board.historical ? <StreamLinks eventId={board.night_id} /> : null}
          {board && !board.closed ? (
            <Button variant="outline" size="sm" className="text-primary-text" disabled={busy} onClick={openAddPlayer}>
              <Icon name="mdi-account-plus" />
              Add player
            </Button>
          ) : null}
          {form ? (
            <Button variant="outline" size="sm" className="text-primary-text" disabled={busy} onClick={openDetails}>
              <Icon name="mdi-pencil" />
              Edit details
            </Button>
          ) : null}
          {board && !board.closed ? (
            <Button variant="outline" size="sm" className="text-error" disabled={busy} onClick={() => setClosing(true)}>
              <Icon name="mdi-exit-to-app" />
              Close the night
            </Button>
          ) : null}
        </span>
      </PageHeader>

      <StatusAlert modelValue={error} onClose={() => setError(null)} />
      {loading ? <Progress value={null} /> : null}

      {board ? (
        <Card className="card mb-4">
          <CardHeader>
            <CardTitle>{board.historical ? "Brackets" : "Bracket Bounds"}</CardTitle>
          </CardHeader>
          <CardContent>
            {/* an archived night keeps the words its source wrote for each bracket */}
            {board.historical ? (
              <ul className="mb-0 flex flex-col gap-1">
                {brackets.map((bracket: Row) => (
                  <li key={bracket.division_id}>{bracket.name}</li>
                ))}
              </ul>
            ) : (
              <>
                <DivisionBracketing
                  players={stripPlayers}
                  cuts={cuts}
                  names={stripNames}
                  colors={stripColors}
                  domain={stripDomain}
                  stored={savedCuts}
                  disabled={!!board.closed}
                  onUpdateCuts={setCuts}
                />
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <Button disabled={busy || !!board.closed || !boundsMoved} onClick={saveBounds}>
                    <Icon name="mdi-content-save" />
                    Save the bounds
                  </Button>
                  {!board.closed ? (
                    <p className="m-0 text-xs text-muted-foreground">
                      A save moves players by the rating they were placed with. Players in a series or placed by hand stay.
                    </p>
                  ) : null}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      ) : null}

      {/* the board read answers 404 for a night nobody published; a failed read says so in the alert above */}
      {!loading && !board && !error ? <p className="py-12 text-center text-muted-foreground">This night is not published</p> : null}

      {/* The signups W3Champions gave no rating for wait over the brackets until one is picked */}
      {unplaced.length ? (
        <Card className="card mb-4 gap-0 py-0">
          <CardHeader className="flex items-center gap-2 banner bg-banner p-3">
            <CardTitle className="flex-1 text-primary">Unplaced</CardTitle>
            <span className="tnum text-xs text-on-banner/80">
              {unplaced.length} {unplaced.length === 1 ? "player" : "players"}
            </span>
          </CardHeader>
          {unplaced.map((row: Row) => (
            <div key={row.entrant_id} className="flex flex-wrap items-center gap-2 border-t p-2">
              <BoardPlayer row={row} plain />
              <span className="ml-auto flex flex-wrap items-center gap-2">
                {brackets.map((bracket: Row) => (
                  <Button
                    key={bracket.division_id}
                    variant="outline"
                    size="sm"
                    className="text-primary-text"
                    disabled={busy || !!board?.closed}
                    onClick={() => run(() => store.placeEntrant(nightId, row.entrant_id, { division_id: bracket.division_id, manual_placement: true }))}
                  >
                    {bracketLabel(brackets, bracket).name}
                  </Button>
                ))}
                <Button variant="ghost" size="icon-xs" className="text-error" disabled={busy || !!board?.closed} aria-label={`Remove ${row.name}`} onClick={() => setDropUnplaced(row)}>
                  <Icon name="mdi-close" />
                </Button>
              </span>
            </div>
          ))}
        </Card>
      ) : null}

      {board?.historical ? <HistoricalBoard board={board} /> : (
        <div className="grid gap-4 min-[960px]:grid-cols-3">
          {brackets.map((bracket: Row) => (
            <BracketCard key={bracket.division_id} bracket={bracket} brackets={brackets} admin={board?.closed ? undefined : admin} />
          ))}
        </div>
      )}

      {/* The king leaves the throne empty for the next series, or hands the crown to one player */}
      <Dialog open={!!stepDown} onOpenChange={(open) => !open && setStepDown(null)}>
        <DialogContent showCloseButton={false} className={cn("gap-0 p-0 md:max-w-[520px]", dialogCompact)}>
          <DialogTitle className="banner bg-banner px-4 py-3 text-primary">Step down</DialogTitle>
          {stepDown ? (
            <>
              <p className="mb-0 px-4 pt-3 text-sm text-muted-foreground">
                {bracketLabel(brackets, stepDown).name} · {stepDown.king?.name} holds the throne
              </p>
              <div className="flex flex-col gap-2 p-4">
                <label className="flex cursor-pointer items-start gap-2 rounded-lg border p-3">
                  <input type="radio" name="step-down" className="mt-1 size-[18px] accent-[rgb(var(--v-theme-primary))]" checked={passTo === null} onChange={() => setPassTo(null)} />
                  <span>
                    <span className="font-medium">Leave the throne empty</span>
                    <span className="block text-xs text-muted-foreground">The next series of this bracket crowns its winner.</span>
                  </span>
                </label>
                <div className="rounded-lg border p-3">
                  <div className="mb-2 font-medium">Pass the crown to</div>
                  {passOptions.length ? (
                    <div className="flex flex-col gap-1">
                      {passOptions.map((seat: Row) => (
                        <label key={seatKey(seat)} className="flex cursor-pointer items-center gap-2">
                          <input type="radio" name="step-down" className="size-[18px] accent-[rgb(var(--v-theme-primary))]" checked={passTo === seatKey(seat)} onChange={() => setPassTo(seatKey(seat))} />
                          <BoardPlayer
                            row={{ ...seat, mmr: seatRow(seat, picks)?.mmr ?? null }}
                            race={seatRow(seat, picks)?.race ?? null}
                            warn={!!seatMark(seat, seatRow(seat, picks))}
                            plain
                            slot
                          />
                        </label>
                      ))}
                    </div>
                  ) : (
                    <p className="mb-0 text-xs text-muted-foreground">Nobody is waiting in this bracket.</p>
                  )}
                </div>
              </div>
              <div className="flex justify-end gap-2 p-4 pt-0">
                <Button variant="ghost" onClick={() => setStepDown(null)}>
                  Cancel
                </Button>
                <Button
                  disabled={busy}
                  onClick={() => {
                    const bracket = stepDown;
                    const entrant = passTo === null ? null : seatRow(passOptions.find((seat: Row) => seatKey(seat) === passTo), picks)?.entrant_id ?? null;
                    run(() => store.setKothCrown(nightId, bracket.division_id, entrant), () => setStepDown(null));
                  }}
                >
                  <Icon name={passTo === null ? "mdi-crown-outline" : "mdi-crown"} />
                  {passTo === null ? "Leave the throne empty" : `Pass the crown to ${passName}`}
                </Button>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* The night's name, start, links and switches; the delete of the whole night sits here, away from the routine actions */}
      <Dialog open={details} onOpenChange={(open) => !open && closeDetails()}>
        <DialogContent showCloseButton={false} className="gap-0 p-0 md:max-w-[640px]">
          <DialogTitle className="banner bg-banner px-4 py-3 text-primary">Night Details</DialogTitle>
          {form ? (
            <div className="flex flex-col gap-4 p-4">
              <StatusAlert modelValue={error} onClose={() => setError(null)} className="mb-0" />
              <div className="grid gap-3 min-[600px]:grid-cols-2">
                <Field label="Name" htmlFor="koth-night-name">
                  <Input id="koth-night-name" value={form.name} onChange={(e) => setField({ name: e.target.value })} />
                </Field>
                <Field label="Date" htmlFor="koth-night-date">
                  <Input id="koth-night-date" type="date" value={form.start_date} onChange={(e) => setField({ start_date: e.target.value })} />
                </Field>
                <Field label="Start time" htmlFor="koth-night-time">
                  <Input id="koth-night-time" type="time" value={form.start_time} onChange={(e) => setField({ start_time: e.target.value })} />
                </Field>
                <Field label="Stream link" htmlFor="koth-night-stream">
                  <Input id="koth-night-stream" type="url" value={form.stream_url} onChange={(e) => setField({ stream_url: e.target.value })} />
                </Field>
                <Field label="Page link" htmlFor="koth-night-page">
                  <Input id="koth-night-page" type="url" value={form.page_url} onChange={(e) => setField({ page_url: e.target.value })} />
                </Field>
              </div>
              <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
                <Label className="flex items-center gap-2">
                  <Switch checked={form.signups_open} onCheckedChange={(signups_open) => setField({ signups_open })} />
                  Signups open
                </Label>
                <Label className="flex items-center gap-2">
                  <Switch checked={form.published} onCheckedChange={(published) => setField({ published })} />
                  Published
                </Label>
              </div>
            </div>
          ) : null}
          <div className="flex flex-wrap items-center justify-end gap-2 p-4 pt-0">
            <Button
              variant="ghost"
              className="mr-auto text-error"
              disabled={busy}
              onClick={() => {
                closeDetails();
                setDeleting(true);
              }}
            >
              <Icon name="mdi-delete-outline" />
              Delete night
            </Button>
            <Button variant="ghost" onClick={closeDetails}>
              Cancel
            </Button>
            <Button disabled={busy || !form?.name.trim()} onClick={saveNight}>
              <Icon name="mdi-content-save" />
              Save
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={deleting} onOpenChange={setDeleting}>
        <DialogContent showCloseButton={false} className={cn("gap-0 p-0 md:max-w-[520px]", dialogCompact)}>
          <DialogTitle className="bg-error px-4 py-3 text-on-error">Delete {board?.name || "night"}</DialogTitle>
          <p className="m-0 p-4 text-sm">Deletes the night with its signups, series and crowns. This cannot be undone.</p>
          <div className="flex justify-end gap-2 p-4 pt-0">
            <Button variant="ghost" onClick={() => setDeleting(false)}>
              Cancel
            </Button>
            <Button variant="destructive" disabled={busy} onClick={deleteNight}>
              <Icon name="mdi-delete-outline" />
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* The close deletes every series nobody scored, and each standing king defends next time */}
      <Dialog open={closing} onOpenChange={setClosing}>
        <DialogContent showCloseButton={false} className={cn("gap-0 p-0 md:max-w-[520px]", dialogCompact)}>
          <DialogTitle className="banner bg-banner px-4 py-3 text-primary">Close the night</DialogTitle>
          <div className="p-4">
            <ul className="mb-0 flex flex-col gap-1">
              {brackets.map((bracket: Row) => (
                <li key={bracket.division_id} className="flex items-baseline justify-between gap-2 text-sm">
                  <span className="font-medium">
                    {bracketLabel(brackets, bracket).name} · {bracket.king ? `king ${bracket.king.name}` : "no king"}
                  </span>
                  <span className="tnum text-muted-foreground">{(bracket.played ?? []).length} series played</span>
                </li>
              ))}
            </ul>
            {openRows.length ? (
              <div className={cn("mt-4 flex items-start gap-2 rounded-lg p-3 text-sm", toneClass("warning"))}>
                <Icon name="mdi-alert-outline" className="text-warning" />
                <div>
                  <p className="mb-1">
                    {openRows.length === 1 ? "One series was started and never scored. Closing deletes it." : `${openRows.length} series were started and never scored. Closing deletes them.`}
                  </p>
                  {openRows.map((open: Row) => (
                    <div key={open.division_id} className="flex flex-wrap items-center gap-x-2 text-foreground">
                      <span>{open.name} ·</span>
                      {/* both sides keep the mark slot, so the two flags line up where the second wraps */}
                      <BoardPlayer row={open.side1} plain slot={open.side1.mmr == null || open.side2.mmr == null} />
                      <span className="text-xs">vs</span>
                      <BoardPlayer row={open.side2} plain slot={open.side1.mmr == null || open.side2.mmr == null} />
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
            <p className="mt-4 mb-0 text-xs text-muted-foreground">The standing kings start the next event as King from last event.</p>
          </div>
          <div className="flex justify-end gap-2 p-4 pt-0">
            <Button variant="ghost" onClick={() => setClosing(false)}>
              Cancel
            </Button>
            <Button disabled={busy} onClick={() => run(() => store.closeNight(nightId), () => setClosing(false))}>
              <Icon name="mdi-exit-to-app" />
              Close the night
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* A king who moves leaves the throne empty, so the move asks first */}
      <Dialog open={!!moveKing} onOpenChange={(open) => !open && setMoveKing(null)}>
        <DialogContent showCloseButton={false} className={cn("gap-0 p-0 md:max-w-[520px]", dialogCompact)}>
          <DialogTitle className="banner bg-banner px-4 py-3 text-primary">Move the king</DialogTitle>
          {moveKing ? (
            <p className="m-0 p-4 text-sm">
              {moveKing.seat.name} is king of {moveFrom}. Moving him leaves the throne empty. If no series follows, {moveFrom} has no champion tonight and no king from last event next time.
            </p>
          ) : null}
          <div className="flex justify-end gap-2 p-4 pt-0">
            <Button variant="ghost" onClick={() => setMoveKing(null)}>
              Cancel
            </Button>
            {/* the dialog closes first, so a refusal reads in the alert on the page */}
            <Button
              disabled={busy}
              onClick={() => {
                const move = moveKing;
                setMoveKing(null);
                if (move) run(() => store.moveKothEntrant(nightId, move.entrantId, move.divisionId));
              }}
            >
              <Icon name="mdi-swap-horizontal" />
              Move
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* An unplaced signup holds no place to go back to, so its remove asks first */}
      <Dialog open={!!dropUnplaced} onOpenChange={(open) => !open && setDropUnplaced(null)}>
        <DialogContent showCloseButton={false} className={cn("gap-0 p-0 md:max-w-[520px]", dialogCompact)}>
          <DialogTitle className="bg-error px-4 py-3 text-on-error">Remove {dropUnplaced?.name}?</DialogTitle>
          <p className="m-0 p-4 text-sm">An unplaced signup cannot be put back.</p>
          <div className="flex justify-end gap-2 p-4 pt-0">
            <Button variant="ghost" onClick={() => setDropUnplaced(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={busy}
              onClick={() => {
                const row = dropUnplaced;
                setDropUnplaced(null);
                if (row) run(() => store.eraseKothEntrant(nightId, row.entrant_id));
              }}
            >
              <Icon name="mdi-close" />
              Remove
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* A signup that left and played no series goes off the record of the night, so the delete asks first */}
      <Dialog open={!!erase} onOpenChange={(open) => !open && setErase(null)}>
        <DialogContent showCloseButton={false} className={cn("gap-0 p-0 md:max-w-[520px]", dialogCompact)}>
          <DialogTitle className="bg-error px-4 py-3 text-on-error">{`Delete ${erase?.name}'s signup?`}</DialogTitle>
          <p className="m-0 p-4 text-sm">
            {eraseWho} {eraseRaces.length > 1 ? "leave" : "leaves"} the record of this night. This cannot be undone.
          </p>
          <div className="flex justify-end gap-2 p-4 pt-0">
            <Button variant="ghost" onClick={() => setErase(null)}>
              Cancel
            </Button>
            {/* the dialog closes first, so a refusal reads in the alert on the page */}
            <Button
              variant="destructive"
              disabled={busy}
              onClick={() => {
                const rows: Row[] = erase?.rows ?? [];
                setErase(null);
                if (rows.length) runEach(rows.map((row) => row.entrant_id), (entrantId) => store.eraseKothEntrant(nightId, entrantId));
              }}
            >
              <Icon name="mdi-delete-outline" />
              Delete signup
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* A late arrival enters by battle tag; W3Champions picks his bracket, or he waits unplaced */}
      <Dialog open={addTo} onOpenChange={setAddTo}>
        <DialogContent showCloseButton={false} className={cn("gap-0 p-0 md:max-w-[480px]", dialogCompact)}>
          <DialogTitle className="banner bg-banner px-4 py-3 text-primary">Add player</DialogTitle>
          <div className="flex flex-col gap-3 p-4">
            <Field label="Battle tag" hint="The name and the numbers, like Mirren#4410." error={addError} htmlFor="koth-add-tag">
              <Input id="koth-add-tag" aria-invalid={!!addError} value={addTag} onChange={(event) => { setAddTag(event.target.value); setAddError(null); }} />
            </Field>
            <Field label="Race" htmlFor="koth-add-race">
              <RaceSelect id="koth-add-race" value={addRace} onChange={setAddRace} label="Race" />
            </Field>
          </div>
          <div className="flex justify-end gap-2 p-4 pt-0">
            <Button variant="ghost" onClick={() => setAddTo(false)}>
              Cancel
            </Button>
            <Button disabled={busy || !addTag.trim() || !addRace} onClick={addPlayer}>
              <Icon name="mdi-plus" />
              Add to the queue
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default KothNightView;
