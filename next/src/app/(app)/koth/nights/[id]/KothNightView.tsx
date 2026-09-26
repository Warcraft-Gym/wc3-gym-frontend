"use client";
import { useEffect, useRef, useState } from "react";
import { DateTime } from "luxon";
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
import { RaceSelect } from "@/components/RaceSelect";
import { StatusAlert } from "@/components/StatusAlert";
import { HistoricalBoard } from "@/components/koth/HistoricalBoard";
import { BoardPlayer, BracketCard, seatMark, type BracketAdmin } from "@/components/koth/BracketCard";
import { backendUrl, fetchWrapper } from "@/helpers";
import { dateRange } from "@/helpers/event-labels.mjs";
import { domainOf, bandOf } from "@/helpers/divisions.mjs";
import { boundsOf, bracketLabel, cutsOf, movedQueue, openSeriesRows, orderedBrackets, queueIds, ratedPlayers, seatKey, seatRow } from "@/helpers/koth-board.mjs";
import { uploadReplay } from "@/helpers/replay-upload";
import { battleTagError } from "@/helpers/signup.mjs";
import { useEventStore } from "@/stores";
import { cn } from "@/lib/utils";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>;

// The night read is edge cached for 15 s, so twice a minute is the most the poll can learn
const POLL_MS = 30000;
// One bronze step per bracket, light to dark, as the entrants page colours its divisions
const RAMP = ["heat-1", "heat-2", "heat-3", "heat-4", "heat-5"];

// The night fields the Night card writes, as the form holds them
type NightForm = { name: string; start_date: string; start_time: string; stream_url: string; page_url: string; signups_open: boolean; published: boolean };
const formOf = (event: Row): NightForm => ({
  name: event.name ?? "",
  start_date: event.start_date ?? "",
  start_time: event.starts_at ? DateTime.fromISO(event.starts_at, { zone: "utc" }).toLocal().toFormat("HH:mm") : "",
  stream_url: event.stream_url ?? "",
  page_url: event.page_url ?? "",
  signups_open: !!event.signups_open,
  published: !!event.published,
});
// The start time is typed in the admin's own zone and stored in UTC
const nightBody = (form: NightForm) => ({
  name: form.name.trim(),
  start_date: form.start_date || null,
  starts_at: form.start_date && form.start_time ? DateTime.fromISO(`${form.start_date}T${form.start_time}`).toUTC().toISO() : null,
  stream_url: form.stream_url.trim() || null,
  page_url: form.page_url.trim() || null,
  signups_open: form.signups_open,
  published: form.published,
});

/** The run page of one KOTH night: the admin starts every series by hand, enters its winner,
 *  edits the line while people come and go, places the signups W3Champions gave no rating
 *  for, sets the night's details and its bracket bounds, and closes the night. Every board
 *  write answers the whole board, so the page never reads itself again after one. */
export function KothNightView({ id }: { id: string }) {
  const nightId = Number(id);
  const store = useEventStore();

  const [board, setBoard] = useState<Row | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [picks, setPicks] = useState<Record<number, number>>({}); // the race row each seat plays next
  const [picked, setPicked] = useState<number[]>([]); // the seats clicked for the next pair

  const [stepDown, setStepDown] = useState<Row | null>(null);
  const [passTo, setPassTo] = useState<number | null>(null); // null leaves the throne empty
  const [closing, setClosing] = useState(false);
  const [event, setEvent] = useState<Row | null>(null); // read once, for the Night card
  const [form, setForm] = useState<NightForm | null>(null);
  const [nightOpen, setNightOpen] = useState<boolean | null>(null); // null follows the night: folded while it runs
  const [cuts, setCuts] = useState<number[]>([]); // the strip's cuts, ascending
  const [addTo, setAddTo] = useState(false); // W3Champions picks the bracket, so the dialog is one form
  const [addTag, setAddTag] = useState("");
  const [addRace, setAddRace] = useState<string | null>(null);
  const [addError, setAddError] = useState<string | null>(null);

  const replayFor = useRef<number | null>(null);
  const replayInput = useRef<HTMLInputElement>(null);
  const writing = useRef(false); // the poll never overwrites a board a write is about to answer
  const storedCuts = useRef(""); // the bounds the last board answered, so a drag survives the poll

  const brackets: Row[] = orderedBrackets(board);
  const unplaced: Row[] = board?.unplaced ?? [];

  // A bracket that plays a series takes no pair, so a pick left on its line clears with the answer
  const takeBoard = (answer: Row) => {
    setBoard(answer);
    // the strip follows the board only when its bounds moved, so a cut being dragged survives the poll
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
    let archived = false;
    const read = async () => {
      try {
        const answer = await store.fetchBoard(nightId);
        // a write that started while this read was in flight holds the newer board
        if (alive && !writing.current) {
          takeBoard(answer);
          archived = !!answer.historical;
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
        setForm(formOf(row));
      })
      .catch((e: Error) => alive && setError(`The night's settings did not load: ${e.message}`));
    // the tab in the background asks for nothing, so a page left open all night costs nothing
    const timer = setInterval(() => {
      if (!archived && !document.hidden && !writing.current) read();
    }, POLL_MS);
    return () => {
      alive = false;
      clearInterval(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nightId]);

  // Every admin write answers the new board; a route that answers its own row reads it back fresh
  const run = async (call: () => Promise<any>, after?: () => void) => {
    setBusy(true);
    writing.current = true;
    setError(null);
    try {
      const answer = await call();
      takeBoard(answer?.brackets ? answer : await store.fetchBoard(nightId, true));
      after?.();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      writing.current = false;
      setBusy(false);
    }
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
    // one player holds one place in line, so removing him takes every race row he holds here
    onRemove: (seat) =>
      run(async () => {
        let answer = null;
        for (const row of seat.rows ?? []) answer = await store.removeKothEntrant(nightId, row.entrant_id);
        return answer;
      }),
    // one player holds one row under "Left tonight", so putting him back takes every race row
    onRestore: (entrantIds) =>
      run(async () => {
        let answer = null;
        for (const entrantId of entrantIds) answer = await store.restoreKothEntrant(nightId, entrantId);
        return answer;
      }),
    onChangeWinner: (played) => run(() => changeWinner(played)),
    onAddReplay: (played) => {
      replayFor.current = played.series_id;
      replayInput.current?.click();
    },
    onAddPlayer: () => {
      setAddTag("");
      setAddRace(null);
      setAddError(null);
      setAddTo(true);
    },
  };

  const takeReplay = async (file: File | null) => {
    const seriesId = replayFor.current;
    if (!file || !seriesId) return;
    await run(async () => {
      await uploadReplay(seriesId, 1, file);
      // a KOTH series already carries its result, so the replay is attached on its own
      await fetchWrapper.put(`${backendUrl}/player-series/${seriesId}/replays/1`);
      return null;
    });
    replayFor.current = null;
  };

  const addPlayer = async () => {
    // the shape is read here as well as on the signup door, so both print the one sentence
    const shape = battleTagError(addTag);
    setAddError(shape);
    if (shape) return;
    setBusy(true);
    writing.current = true;
    try {
      await store.addEntrant(nightId, { battle_tag: addTag.trim(), race: addRace });
      takeBoard(await store.fetchBoard(nightId, true));
      setAddTo(false);
    } catch (e) {
      setAddError((e as Error).message);
    } finally {
      writing.current = false;
      setBusy(false);
    }
  };

  const passOptions: Row[] = (stepDown?.queue ?? []).filter((seat: Row) => (seat.rows ?? []).length);
  const passName = passOptions.find((seat: Row) => seatKey(seat) === passTo)?.name;
  const openRows: Row[] = openSeriesRows(board);

  // The write cuts the rated rows nobody placed by hand again, so it waits for every series to end
  const boundsBlocked = openRows.length > 0;
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

  // The night runs while a series plays or signups stand open, so its settings fold away
  const running = !!board && !board.closed && (openRows.length > 0 || !!event?.signups_open);
  const nightShown = nightOpen ?? (!!board && !running);

  const setField = (patch: Partial<NightForm>) => setForm((was) => (was ? { ...was, ...patch } : was));
  const saveNight = () =>
    run(async () => {
      const saved = await store.updateEvent(nightId, nightBody(form as NightForm));
      setEvent(saved);
      setForm(formOf(saved));
      return null;
    });

  return (
    <>
      <PageHeader title={board?.name || "KOTH Night"} lead={board ? dateRange(board) : undefined}>
        <Badge className={toneClass(board?.closed ? "draw" : "info")}>
          <Icon name={board?.closed ? "mdi-check" : "mdi-play"} />
          {board?.closed ? "Closed" : "Running"}
        </Badge>
        <Badge className={toneClass(null)}>
          <Icon name="mdi-account-multiple" />
          {board?.entrant_count ?? 0} signed up
        </Badge>
        <span className="ml-auto flex flex-wrap gap-2">
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

      {form ? <NightCard form={form} open={nightShown} busy={busy} onOpen={() => setNightOpen(true)} onChange={setField} onSave={saveNight} /> : null}

      {board ? (
        <Card className="card mb-4">
          <CardHeader>
            <CardTitle>Brackets</CardTitle>
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
                  disabled={boundsBlocked || !!board.closed}
                  onUpdateCuts={setCuts}
                />
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <Button disabled={busy || boundsBlocked || !!board.closed || !boundsMoved} onClick={saveBounds}>
                    <Icon name="mdi-content-save" />
                    Save the bounds
                  </Button>
                  {!board.closed && boundsBlocked ? <span className="text-xs text-muted-foreground">Finish or cancel the open series first.</span> : null}
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
          <CardHeader className="flex items-center gap-2 bg-primary p-3">
            <CardTitle className="flex-1 text-on-primary">Unplaced</CardTitle>
            <span className="tnum text-xs text-on-primary/80">
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
                <Button variant="ghost" size="icon-xs" className="text-error" disabled={busy || !!board?.closed} aria-label={`Remove ${row.name}`} onClick={() => run(() => store.removeKothEntrant(nightId, row.entrant_id))}>
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

      {/* One file per played series; a KOTH series is a best of one, so it is always game 1 */}
      <input
        ref={replayInput}
        type="file"
        accept=".w3g"
        className="hidden"
        onChange={(event) => {
          takeReplay(event.target.files?.[0] ?? null);
          event.target.value = "";
        }}
      />

      {/* The king leaves the throne empty for the next series, or hands the crown to one player */}
      <Dialog open={!!stepDown} onOpenChange={(open) => !open && setStepDown(null)}>
        <DialogContent showCloseButton={false} className={cn("gap-0 p-0 md:max-w-[520px]", dialogCompact)}>
          <DialogTitle className="bg-primary px-4 py-3 text-on-primary">Step down</DialogTitle>
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

      {/* The close deletes every series nobody scored, and each standing king defends next time */}
      <Dialog open={closing} onOpenChange={setClosing}>
        <DialogContent showCloseButton={false} className={cn("gap-0 p-0 md:max-w-[520px]", dialogCompact)}>
          <DialogTitle className="bg-primary px-4 py-3 text-on-primary">Close the night</DialogTitle>
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

      {/* A late arrival enters by battle tag; W3Champions picks his bracket, or he waits unplaced */}
      <Dialog open={addTo} onOpenChange={setAddTo}>
        <DialogContent showCloseButton={false} className={cn("gap-0 p-0 md:max-w-[480px]", dialogCompact)}>
          <DialogTitle className="bg-primary px-4 py-3 text-on-primary">Add player</DialogTitle>
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

/** The night's own settings: its name, when it starts, its links and its two switches. It
 *  folds to one "Edit night" button while the night runs. */
function NightCard({
  form,
  open,
  busy,
  onOpen,
  onChange,
  onSave,
}: {
  form: NightForm;
  open: boolean;
  busy: boolean;
  onOpen: () => void;
  onChange: (patch: Partial<NightForm>) => void;
  onSave: () => void;
}) {
  return (
    <Card className="card mb-4">
      <CardHeader className="flex flex-wrap items-center gap-2">
        <CardTitle className="flex-1">Night</CardTitle>
        {!open ? (
          <Button variant="outline" size="sm" className="text-primary-text" aria-expanded={false} aria-controls="koth-night-form" onClick={onOpen}>
            <Icon name="mdi-pencil" />
            Edit night
          </Button>
        ) : null}
      </CardHeader>
      {open ? (
        <CardContent id="koth-night-form" className="flex flex-col gap-4">
          <div className="grid gap-3 min-[600px]:grid-cols-2 min-[960px]:grid-cols-3">
            <Field label="Name" htmlFor="koth-night-name">
              <Input id="koth-night-name" value={form.name} onChange={(e) => onChange({ name: e.target.value })} />
            </Field>
            <Field label="Date" htmlFor="koth-night-date">
              <Input id="koth-night-date" type="date" value={form.start_date} onChange={(e) => onChange({ start_date: e.target.value })} />
            </Field>
            <Field label="Start time" htmlFor="koth-night-time">
              <Input id="koth-night-time" type="time" value={form.start_time} onChange={(e) => onChange({ start_time: e.target.value })} />
            </Field>
            <Field label="Stream link" htmlFor="koth-night-stream">
              <Input id="koth-night-stream" type="url" value={form.stream_url} onChange={(e) => onChange({ stream_url: e.target.value })} />
            </Field>
            <Field label="Page link" htmlFor="koth-night-page">
              <Input id="koth-night-page" type="url" value={form.page_url} onChange={(e) => onChange({ page_url: e.target.value })} />
            </Field>
          </div>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
            <Label className="flex items-center gap-2">
              <Switch checked={form.signups_open} onCheckedChange={(signups_open) => onChange({ signups_open })} />
              Signups open
            </Label>
            <Label className="flex items-center gap-2">
              <Switch checked={form.published} onCheckedChange={(published) => onChange({ published })} />
              Published
            </Label>
            <span className="flex-1" />
            <Button disabled={busy || !form.name.trim()} onClick={onSave}>
              <Icon name="mdi-content-save" />
              Save
            </Button>
          </div>
        </CardContent>
      ) : null}
    </Card>
  );
}

export default KothNightView;
