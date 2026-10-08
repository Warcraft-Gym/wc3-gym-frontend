"use client";
import { useState } from "react";
import Link from "next/link";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Field } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import { Input } from "@/components/ui/input";
import { Combobox } from "@/components/ui/Combobox";
import { Pick } from "@/components/ui/Pick";
import { PlayerName } from "@/components/PlayerName";
import { raceWrapper } from "@/helpers/races.js";
import { toneClass } from "@/components/ui/tone";
import { SimpleDatePicker } from "@/components/SimpleDatePicker";
import { SimpleTimePicker } from "@/components/SimpleTimePicker";
import { dayIso } from "@/helpers/date-input.mjs";
import { eveningOf } from "@/helpers/events-page.mjs";
import { playedEntrants } from "@/helpers/stage-view.mjs";
import { storedUtc } from "@/helpers/timezone.mjs";
import type { EventOrganizer } from "@/hooks/event-runner";
import { useEventStore, usePlayerStore } from "@/stores";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>;

const RACE_ITEMS = raceWrapper.races.map((race) => ({ value: race.id, title: race.name }));
const raceName = (race: string | null | undefined) => (race ? raceWrapper.getRaceObject(race)?.name || race : "");

type Evening = { live: number; checkedIn: number; noShows: Row[]; min: number | null; belowMin: boolean; afterNoShows: number };

/** One small confirming dialog of the console. */
function Confirm({ open, onOpenChange, title, danger, busy, confirm, onConfirm, children }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  danger?: boolean;
  busy: boolean;
  confirm: string;
  onConfirm: () => void;
  children: React.ReactNode;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} size="sm" className="gap-0 p-0">
        <DialogTitle className={danger ? "bg-error px-4 py-3 text-on-error" : "banner bg-banner px-4 py-3 text-primary"}>{title}</DialogTitle>
        <div className="p-4">{children}</div>
        <div className="flex justify-end gap-2 p-4 pt-0">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Back
          </Button>
          <Button variant={danger ? "destructive" : "default"} disabled={busy} onClick={onConfirm}>
            {busy ? <Icon name="mdi-loading mdi-spin" /> : null}
            {confirm}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** The evening of a cup on the run page, in two parts. `evening` sits over the draw: how many
 *  are in and checked in, the minimum it is played with, moving the start and calling it off.
 *  `people` is the participants tab: every player who is in, each checked in or taken out on
 *  its own row, a player added by hand, the no-shows to take out before the draw, and who else
 *  runs it. Seeding and the divisions stay on the entrants page. */
export function CupConsole({ part, event, entrants, drawn, series = [], organizers, onEvent, onEntrants, onSeries, onOrganizers, onError }: {
  part: "evening" | "people";
  event: Row;
  entrants: Row[];
  drawn: boolean;
  series?: Row[];
  onSeries?: () => Promise<void> | void;
  organizers: EventOrganizer[];
  onEvent: (event: Row) => void;
  onEntrants: (rows: Row[]) => void;
  onOrganizers: () => Promise<void> | void;
  onError: (message: string | null) => void;
}) {
  const store = useEventStore();
  const playerStore = usePlayerStore();
  const evening = eveningOf(event, entrants) as Evening;
  // the players still in, in seed order once seeded and else in signup order
  const players = entrants
    .filter((row) => !row.withdrawn_at)
    .slice()
    .sort((a, b) => (a.seed ?? 1e9) - (b.seed ?? 1e9) || a.id - b.id);
  const editable = !drawn && !event.closed_at;
  const closed = !!event.closed_at;
  const [busy, setBusy] = useState<string | null>(null);
  const [ask, setAsk] = useState<"noshows" | "cancel" | "move" | "remove" | "add" | null>(null);
  const [removing, setRemoving] = useState<Row | null>(null);
  // the player a swap takes out; the add dialog then picks who comes in
  const [swapping, setSwapping] = useState<Row | null>(null);
  // a player who has played keeps their place, so only the others can be swapped
  const played = playedEntrants(series) as Set<number>;
  const [roster, setRoster] = useState<Row[]>([]);
  const [pickedId, setPickedId] = useState<string>("");
  const [pickedRace, setPickedRace] = useState<string | null>(null);
  const [day, setDay] = useState<string | Date | null>(event.start_date ?? null);
  const [time, setTime] = useState("");
  const [coId, setCoId] = useState("");
  const [coName, setCoName] = useState("");

  const work = async (key: string, task: () => Promise<void>) => {
    setBusy(key);
    onError(null);
    try {
      await task();
      setAsk(null);
    } catch (e) {
      onError((e as Error).message || "The write failed");
    } finally {
      setBusy(null);
    }
  };

  const checkIn = (row: Row) =>
    work(`in-${row.id}`, async () => {
      const done = await store.checkIn(event.id, row.id);
      onEntrants(entrants.map((old) => (old.id === done.id ? { ...old, ...done } : old)));
    });
  const removeOne = () =>
    work("remove", async () => {
      await store.removeEntrant(event.id, removing!.id);
      onEntrants(entrants.filter((old) => old.id !== removing!.id));
      setRemoving(null);
    });
  const openAdd = async (out: Row | null = null) => {
    setSwapping(out);
    setPickedId("");
    setPickedRace(null);
    setAsk("add");
    if (!roster.length) {
      try {
        setRoster(await playerStore.fetchPlayers());
      } catch (e) {
        onError((e as Error).message || "The players did not load");
      }
    }
  };
  const addOne = () =>
    work("add", async () => {
      if (swapping) await store.replaceEntrant(event.id, swapping.id, { user_id: Number(pickedId), race: pickedRace });
      else await store.addEntrant(event.id, { user_id: Number(pickedId), race: pickedRace });
      onEntrants(await store.fetchEntrants(event.id, true));
      // a swap rewrites the bracket boxes of the player it takes out
      if (swapping) await onSeries?.();
      setSwapping(null);
    });
  const outName = swapping?.user?.name || "this player";
  // every player not in yet, the name to read and the battle tag under it
  const entered = new Set(players.map((row) => row.user?.id));
  const playerItems = roster
    .filter((player) => !entered.has(player.id))
    .map((player) => ({ value: String(player.id), title: player.name, tag: player.battleTag || "" }));

  const removeNoShows = () =>
    work("noshows", async () => {
      for (const row of evening.noShows) await store.removeEntrant(event.id, row.id);
      onEntrants(await store.fetchEntrants(event.id, true));
    });
  const cancel = () => work("cancel", async () => onEvent(await store.cancelEvent(event.id)));
  const moveStart = () =>
    work("move", async () => {
      const date = day ? dayIso(day) : null;
      onEvent(await store.updateEvent(event.id, { start_date: date, end_date: date, starts_at: day && time ? storedUtc(day, time) : null }));
    });
  const addCo = () =>
    work("co", async () => {
      await store.addEventOrganizer(event.id, coId.trim(), coName.trim());
      setCoId("");
      setCoName("");
      await onOrganizers();
    });
  const removeCo = (discordId: string) =>
    work(`co-${discordId}`, async () => {
      await store.removeEventOrganizer(event.id, discordId);
      await onOrganizers();
    });

  const evenPart = (
    <div className="mb-4 flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border px-3 py-2">
        {event.cancelled_at ? (
          <Badge className={toneClass("warning")}>
            <Icon name="mdi-cancel" />
            Cancelled
          </Badge>
        ) : null}
        <Badge className={toneClass(null)}>
          <Icon name="mdi-account-multiple" />
          {evening.live} {evening.live === 1 ? "player" : "players"} in
        </Badge>
        {event.checkin_enabled ? (
          <Badge className={toneClass(evening.checkedIn === evening.live && evening.live ? "success" : null)}>
            <Icon name="mdi-check" />
            {evening.checkedIn} checked in
          </Badge>
        ) : null}
        {evening.min !== null || event.entrant_cap ? (
          <span className="text-sm text-muted-foreground">
            {[evening.min !== null ? `at least ${evening.min}` : null, event.entrant_cap ? `at most ${event.entrant_cap}` : null].filter(Boolean).join(", ")}
          </span>
        ) : null}
        <span className="flex-1" />
        {!closed && !evening.belowMin ? (
          <Button variant="ghost" size="sm" className="text-error" onClick={() => setAsk("cancel")}>
            <Icon name="mdi-cancel" />
            Cancel the cup
          </Button>
        ) : null}
      </div>

      {evening.belowMin && !drawn && !closed ? (
        <Alert className="alert border-loss">
          <AlertDescription className="flex flex-col gap-3 text-foreground">
            <span className="font-bold">
              Only {evening.live} {evening.live === 1 ? "player is" : "players are"} in. This cup is played with at least {evening.min}.
            </span>
            <span className="text-sm text-muted-foreground">Wait for more sign-ups, move the start, or cancel the cup. The bracket cannot be drawn until enough players are in.</span>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => setAsk("move")}>
                <Icon name="mdi-clock-edit-outline" />
                Move the start
              </Button>
              <Button variant="outline" className="text-error" onClick={() => setAsk("cancel")}>
                <Icon name="mdi-cancel" />
                Cancel the cup
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      ) : null}
    </div>
  );

  const peoplePart = (
    <div className="flex flex-col gap-4">
      <Card className="card">
        <CardHeader>
          <CardTitle>Players</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="flex-1 text-sm text-muted-foreground">
                {evening.live} {evening.live === 1 ? "player" : "players"} in{event.checkin_enabled ? `, ${evening.checkedIn} checked in` : ""}
              </span>
              {editable ? (
                <Button variant="outline" size="sm" onClick={() => openAdd()}>
                  <Icon name="mdi-account-plus" />
                  Add player
                </Button>
              ) : null}
            </div>
            <ul className="flex flex-col">
              {players.map((row) => (
                <li key={row.id} className="flex min-h-11 flex-wrap items-center gap-x-3 gap-y-1 border-t border-border py-1">
                  {row.seed != null ? <span className="tnum w-5 text-right text-xs text-muted-foreground">{row.seed}</span> : null}
                  <span className="min-w-0 flex-1">
                    {row.user ? <PlayerName player={row.user} race={row.race || undefined} mmr={row.mmr ?? undefined} /> : row.team?.name || "Entrant"}
                  </span>
                  {event.checkin_enabled ? (
                    row.checked_in_at ? (
                      <Badge className={toneClass("success")}>
                        <Icon name="mdi-check" />
                        Checked in
                      </Badge>
                    ) : editable ? (
                      <Button size="sm" variant="outline" disabled={busy === `in-${row.id}`} onClick={() => checkIn(row)}>
                        {busy === `in-${row.id}` ? <Icon name="mdi-loading mdi-spin" /> : <Icon name="mdi-check" />}
                        Check in
                      </Button>
                    ) : (
                      <Badge variant="outline">Not checked in</Badge>
                    )
                  ) : null}
                  {/* after the draw a player who has not played can still be swapped for another */}
                  {drawn && !closed && !played.has(row.id) ? (
                    <Button size="sm" variant="outline" aria-label={`Swap ${row.user?.name || "this entrant"}`} onClick={() => openAdd(row)}>
                      <Icon name="mdi-swap-horizontal" />
                      Swap
                    </Button>
                  ) : null}
                  {editable ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-error"
                      aria-label={`Remove ${row.user?.name || "this entrant"}`}
                      onClick={() => {
                        setRemoving(row);
                        setAsk("remove");
                      }}
                    >
                      <Icon name="mdi-close" />
                      Remove
                    </Button>
                  ) : null}
                </li>
              ))}
              {!players.length ? <li className="border-t border-border py-2 text-sm text-muted-foreground">Nobody has signed up yet.</li> : null}
            </ul>
          </div>

          {!drawn && !closed ? (
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" nativeButton={false} render={<Link href={`/events/${event.id}/entrants`} />}>
                <Icon name="mdi-account-check" />
                Seed players
              </Button>
              {evening.noShows.length ? (
                <Button variant="outline" disabled={!!busy} onClick={() => setAsk("noshows")}>
                  <Icon name="mdi-account-remove" />
                  Remove {evening.noShows.length} {evening.noShows.length === 1 ? "no-show" : "no-shows"}
                </Button>
              ) : null}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card className="card">
        <CardHeader>
          <CardTitle>Organizers</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="mb-3 flex flex-col">
            {organizers.map((one) => (
              <li key={one.discord_id} className="flex min-h-11 items-center gap-3 border-t border-border">
                <span className="flex-1">{one.name || one.discord_id}</span>
                <Button variant="ghost" size="sm" aria-label={`Remove ${one.name || one.discord_id}`} disabled={busy === `co-${one.discord_id}`} onClick={() => removeCo(one.discord_id)}>
                  <Icon name="mdi-close" />
                </Button>
              </li>
            ))}
            {!organizers.length ? <li className="text-sm text-muted-foreground">Only the admins run this event.</li> : null}
          </ul>
          <div className="flex flex-wrap items-end gap-2">
            <Field label="Discord ID" htmlFor="co-id" className="flex-[1_1_200px]">
              <Input id="co-id" value={coId} placeholder="Their Discord ID" onChange={(e) => setCoId(e.target.value)} />
            </Field>
            <Field label="Name" htmlFor="co-name" className="flex-[1_1_160px]">
              <Input id="co-name" value={coName} placeholder="How to show them" onChange={(e) => setCoName(e.target.value)} />
            </Field>
            <Button variant="outline" disabled={!coId.trim() || busy === "co"} onClick={addCo}>
              <Icon name="mdi-account-plus" />
              Add co-organizer
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <>
      {part === "evening" ? evenPart : peoplePart}

      <Confirm open={ask === "noshows"} onOpenChange={(open) => setAsk(open ? "noshows" : null)} title="Remove the no-shows" busy={busy === "noshows"} confirm="Remove them" onConfirm={removeNoShows}>
        <p>
          {evening.noShows.map((row) => row.name || row.user?.name).filter(Boolean).join(", ") || "The players who did not check in"} will be taken out, so the bracket is drawn with the {evening.afterNoShows}{" "}
          who checked in.
        </p>
      </Confirm>

      <Confirm
        open={ask === "remove"}
        onOpenChange={(open) => {
          setAsk(open ? "remove" : null);
          if (!open) setRemoving(null);
        }}
        title="Remove the player"
        danger
        busy={busy === "remove"}
        confirm="Remove"
        onConfirm={removeOne}
      >
        <p>
          {removing?.user?.name || "This entrant"} {removing?.race ? `(${raceName(removing.race)}) ` : ""}is taken out of the cup. They can sign up again while sign-ups are open.
        </p>
      </Confirm>

      <Confirm
        open={ask === "add"}
        onOpenChange={(open) => {
          setAsk(open ? "add" : null);
          if (!open) setSwapping(null);
        }}
        title={swapping ? `Swap ${outName}` : "Add a player"}
        busy={busy === "add"}
        confirm={swapping ? "Swap" : "Add"}
        onConfirm={() => pickedId && pickedRace && addOne()}
      >
        <div className="flex flex-col gap-3">
          <Field label="Player" hint="Players already in are left out" htmlFor="console-add-player">
            <Combobox
              id="console-add-player"
              label="Pick a player"
              items={playerItems}
              value={pickedId || null}
              onChange={(value) => {
                setPickedId(value ?? "");
                const player = roster.find((one) => String(one.id) === value);
                setPickedRace(player?.race ?? null);
              }}
              row={(item) => (
                <span className="flex flex-col text-left">
                  <span>{item.title}</span>
                  <span className="text-xs text-muted-foreground">{item.tag}</span>
                </span>
              )}
            />
          </Field>
          <Pick label="Race" items={RACE_ITEMS} value={pickedRace} onChange={setPickedRace} />
          <p className="text-sm text-muted-foreground">
            {swapping
              ? `Who comes in for ${outName}: they take ${outName}'s seed and matches, and a map veto ${outName} began starts over. ${outName} leaves the cup.`
              : "The player is entered whether sign-ups are open or not."}
          </p>
        </div>
      </Confirm>

      <Confirm open={ask === "cancel"} onOpenChange={(open) => setAsk(open ? "cancel" : null)} title="Cancel the cup" danger busy={busy === "cancel"} confirm="Cancel the cup" onConfirm={cancel}>
        <p>The cup reads cancelled, takes no more sign-ups and pays no places. You can reopen it later.</p>
      </Confirm>

      <Confirm open={ask === "move"} onOpenChange={(open) => setAsk(open ? "move" : null)} title="Move the start" busy={busy === "move"} confirm="Move it" onConfirm={moveStart}>
        <div className="grid gap-3 min-[600px]:grid-cols-2">
          <SimpleDatePicker modelValue={day} label="Day" onUpdateModelValue={setDay} />
          <SimpleTimePicker modelValue={time} label="Start time" onUpdateModelValue={setTime} />
        </div>
      </Confirm>
    </>
  );
}

export default CupConsole;
