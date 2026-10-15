"use client";
import { useState } from "react";
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
import { CupTeamName } from "@/components/CupTeamName";
import { raceWrapper } from "@/helpers/races.js";
import { toneClass } from "@/components/ui/tone";
import { SimpleDatePicker } from "@/components/SimpleDatePicker";
import { SimpleTimePicker } from "@/components/SimpleTimePicker";
import { eveningOf, moveStartBody, moveStartForm, waitlistOf } from "@/helpers/events-page.mjs";
import { playedEntrants } from "@/helpers/stage-view.mjs";
import { missing, teamState } from "@/helpers/cup-teams.mjs";
import type { EventOrganizer } from "@/hooks/event-runner";
import { useEventStore, usePlayerStore } from "@/stores";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>;

const RACE_ITEMS = raceWrapper.races.map((race) => ({ value: race.id, title: race.name }));
const raceName = (race: string | null | undefined) => (race ? raceWrapper.getRaceObject(race)?.name || race : "");

type Evening = { live: number; checkedIn: number; noShows: Row[]; min: number | null; belowMin: boolean };

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
 *  runs it. A cup's divisions are cut above it, and its seeds sit beside the draw. */
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
  // the players still in, in seed order once seeded and else in signup order; the waitlist stands apart
  const players = entrants
    .filter((row) => !row.withdrawn_at && !row.waitlisted_at)
    .slice()
    .sort((a, b) => (a.seed ?? 1e9) - (b.seed ?? 1e9) || a.id - b.id);
  const editable = !drawn && !event.closed_at;
  const closed = !!event.closed_at;
  const [busy, setBusy] = useState<string | null>(null);
  const [ask, setAsk] = useState<"cancel" | "move" | "remove" | "withdraw" | "add" | "team" | "incomplete" | "swapin" | null>(null);
  // the waitlist: a late signup comes in before the draw, or after it in the place of one who has not played
  const [waiting, setWaiting] = useState<Row | null>(null);
  const [outId, setOutId] = useState<number | null>(null);
  // a team cup lists teams; its swap takes one player of a team out
  const teams = !!event.team_size;
  const [memberOut, setMemberOut] = useState<{ entrant: Row; user: Row } | null>(null);
  const [teamName, setTeamName] = useState("");
  const [teamPicks, setTeamPicks] = useState<string[]>([]);
  const [removing, setRemoving] = useState<Row | null>(null);
  // the player a swap takes out; the add dialog then picks who comes in
  const [swapping, setSwapping] = useState<Row | null>(null);
  // a player who has played keeps their place, so only the others can be swapped
  const played = playedEntrants(series) as Set<number>;
  const [roster, setRoster] = useState<Row[]>([]);
  const [pickedId, setPickedId] = useState<string>("");
  const [pickedRace, setPickedRace] = useState<string | null>(null);
  const [day, setDay] = useState<Date | null>(null);
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
  const waitlist = waitlistOf(entrants) as Row[];
  const admit = (row: Row) =>
    work(`admit-${row.id}`, async () => {
      await store.admitEntrant(event.id, row.id);
      onEntrants(await store.fetchEntrants(event.id, true));
    });
  const swapIn = () =>
    work("swapin", async () => {
      await store.replaceEntrant(event.id, outId!, { user_id: waiting!.user.id, race: waiting!.race });
      onEntrants(await store.fetchEntrants(event.id, true));
      await onSeries?.();
      setWaiting(null);
      setOutId(null);
    });
  // after the draw a player leaves by withdrawing: the row stays and every match still open is forfeited
  const withdrawOne = () =>
    work("withdraw", async () => {
      await store.withdrawEntrant(event.id, removing!.id);
      onEntrants(await store.fetchEntrants(event.id, true));
      await onSeries?.();
      setRemoving(null);
    });
  const removeOne = () =>
    work("remove", async () => {
      await store.removeEntrant(event.id, removing!.id);
      onEntrants(entrants.filter((old) => old.id !== removing!.id));
      setRemoving(null);
    });
  const openAdd = async (out: Row | null = null, member: { entrant: Row; user: Row } | null = null) => {
    setSwapping(out);
    setMemberOut(member);
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
      if (memberOut) await store.replaceTeamMember(event.id, memberOut.entrant.team.id, memberOut.user.id, Number(pickedId));
      else if (swapping) await store.replaceEntrant(event.id, swapping.id, { user_id: Number(pickedId), race: pickedRace });
      else await store.addEntrant(event.id, { user_id: Number(pickedId), race: pickedRace });
      onEntrants(await store.fetchEntrants(event.id, true));
      // a swap rewrites the bracket boxes of the player it takes out
      if (swapping || memberOut) await onSeries?.();
      setSwapping(null);
      setMemberOut(null);
    });
  const outName = memberOut?.user?.name || swapping?.user?.name || "this player";
  const openTeam = async () => {
    setTeamName("");
    setTeamPicks(Array(event.team_size || 0).fill(""));
    await openAdd();
    setAsk("team");
  };
  const addTeam = () =>
    work("team", async () => {
      const [captain, ...others] = teamPicks.map(Number);
      await store.addTeam(event.id, teamName.trim(), captain, others);
      onEntrants(await store.fetchEntrants(event.id, true));
    });
  // a team short of players cannot be drawn: a cup that takes check-in leaves it out, as it cannot
  // check in, and any other cup takes it out first
  const incomplete = teams && !event.checkin_enabled ? players.filter((row) => missing(row, event.team_size) > 0) : [];
  const removeIncomplete = () =>
    work("incomplete", async () => {
      for (const row of incomplete) await store.removeEntrant(event.id, row.id);
      onEntrants(await store.fetchEntrants(event.id, true));
    });
  // every player not in yet, the name to read and the battle tag under it; a team cup counts
  // its players and the players its teams invited
  const entered = new Set([
    ...players.map((row) => row.user?.id),
    ...players.flatMap((row) => [...(row.roster || []).map((one: Row) => one.user?.id), ...(row.invited || []).map((one: Row) => one.id)]),
  ]);
  const playerItems = roster
    .filter((player) => !entered.has(player.id))
    .map((player) => ({ value: String(player.id), title: player.name, tag: player.battleTag || "" }));

  // the draw takes the players who checked in; a runner who skipped the check-in checks everyone in
  const checkEveryoneIn = () => work("everyone", async () => onEntrants(await store.checkInEveryone(event.id)));
  const cancel = () => work("cancel", async () => onEvent(await store.cancelEvent(event.id)));
  // the dialog opens on the cup's stored start, so a changed day alone keeps the start time
  const openMove = () => {
    const form = moveStartForm(event);
    setDay(form.date);
    setTime(form.time);
    setAsk("move");
  };
  const moveStart = () => work("move", async () => onEvent(await store.updateEvent(event.id, moveStartBody(event, day, time))));
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
          {evening.live} {teams ? (evening.live === 1 ? "team" : "teams") : evening.live === 1 ? "player" : "players"} in
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
              <Button variant="outline" onClick={openMove}>
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
          <CardTitle>{teams ? "Teams" : "Players"}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="flex-1 text-sm text-muted-foreground">
                {evening.live} {teams ? (evening.live === 1 ? "team" : "teams") : evening.live === 1 ? "player" : "players"} in
                {event.checkin_enabled ? `, ${evening.checkedIn} checked in` : ""}
              </span>
              {editable ? (
                <Button variant="outline" size="sm" onClick={() => (teams ? openTeam() : openAdd())}>
                  <Icon name="mdi-account-plus" />
                  {teams ? "Add team" : "Add player"}
                </Button>
              ) : null}
            </div>
            <ul className="flex flex-col">
              {players.map((row) => (
                <li key={row.id} className="flex min-h-11 flex-wrap items-center gap-x-3 gap-y-1 border-t border-border py-1">
                  {row.seed != null ? <span className="tnum w-5 text-right text-xs text-muted-foreground">{row.seed}</span> : null}
                  <span className="min-w-0 flex-1">
                    {row.user ? <PlayerName player={row.user} race={row.race || undefined} mmr={row.mmr ?? undefined} /> : row.team ? <CupTeamName team={row.team} /> : "Entrant"}
                  </span>
                  {teams ? <Badge variant="outline">{teamState(row, event.team_size)}</Badge> : null}
                  {event.checkin_enabled ? (
                    row.checked_in_at ? (
                      <Badge className={toneClass("success")}>
                        <Icon name="mdi-check" />
                        Checked in
                      </Badge>
                    ) : editable && !(teams && missing(row, event.team_size) > 0) ? (
                      // a team short of players cannot play, so it is not checked in
                      <Button size="sm" variant="outline" disabled={busy === `in-${row.id}`} onClick={() => checkIn(row)}>
                        {busy === `in-${row.id}` ? <Icon name="mdi-loading mdi-spin" /> : <Icon name="mdi-check" />}
                        Check in
                      </Button>
                    ) : (
                      <Badge variant="outline">Not checked in</Badge>
                    )
                  ) : null}
                  {/* after the draw a player who has not played can still be swapped for another */}
                  {!teams && drawn && !closed && !played.has(row.id) ? (
                    <Button size="sm" variant="outline" aria-label={`Swap ${row.user?.name || "this entrant"}`} onClick={() => openAdd(row)}>
                      <Icon name="mdi-swap-horizontal" />
                      Swap
                    </Button>
                  ) : null}
                  {drawn && !closed ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-error"
                      aria-label={`Withdraw ${row.user?.name || row.team?.name || "this entrant"}`}
                      onClick={() => {
                        setRemoving(row);
                        setAsk("withdraw");
                      }}
                    >
                      <Icon name="mdi-flag-remove-outline" />
                      Withdraw
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
                  {/* a team's players, each swapped for another until the team has played */}
                  {teams ? (
                    <div className="flex w-full flex-wrap items-center gap-x-4 gap-y-1 pl-8 text-sm">
                      {(row.roster || []).map((one: Row) => (
                        <span key={one.user.id} className="inline-flex items-center gap-1">
                          <PlayerName player={one.user} />
                          {one.captain ? <span className="text-xs text-muted-foreground">captain</span> : null}
                          {!closed && !played.has(row.id) ? (
                            <Button size="sm" variant="ghost" aria-label={`Swap ${one.user.name}`} onClick={() => openAdd(null, { entrant: row, user: one.user })}>
                              <Icon name="mdi-swap-horizontal" />
                            </Button>
                          ) : null}
                        </span>
                      ))}
                      {(row.invited || []).map((one: Row) => (
                        <span key={one.id} className="text-muted-foreground">
                          {one.name} (invited)
                        </span>
                      ))}
                    </div>
                  ) : null}
                </li>
              ))}
              {!players.length ? <li className="border-t border-border py-2 text-sm text-muted-foreground">Nobody has signed up yet.</li> : null}
            </ul>
          </div>

          {waitlist.length ? (
            <div className="flex flex-col gap-1">
              <h3 className="text-sm font-bold text-muted-foreground uppercase">Waitlist</h3>
              <p className="text-sm text-muted-foreground">
                {drawn
                  ? teams
                    ? "The bracket is drawn, so a waiting team comes in only if you undo the draw."
                    : "The bracket is drawn: swap a waiting player in for one who has not played, a no-show for example."
                  : "Signed up after the cup was full. Add them to the cup, past the maximum if you like."}
              </p>
              <ul className="flex flex-col">
                {waitlist.map((row, index) => (
                  <li key={row.id} className="flex min-h-11 flex-wrap items-center gap-3 border-t border-border py-1">
                    <span className="tnum w-5 text-right text-xs text-muted-foreground">{index + 1}</span>
                    <span className="min-w-0 flex-1">{row.user ? <PlayerName player={row.user} race={row.race || undefined} mmr={row.mmr ?? undefined} /> : row.team ? <CupTeamName team={row.team} /> : "A team"}</span>
                    {!closed && !drawn ? (
                      <Button size="sm" variant="outline" disabled={busy === `admit-${row.id}`} onClick={() => admit(row)}>
                        <Icon name={busy === `admit-${row.id}` ? "mdi-loading mdi-spin" : "mdi-account-arrow-right"} />
                        Add to the cup
                      </Button>
                    ) : null}
                    {!closed && drawn && !teams && row.user ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setWaiting(row);
                          setOutId(null);
                          setAsk("swapin");
                        }}
                      >
                        <Icon name="mdi-swap-horizontal" />
                        Swap in
                      </Button>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {event.checkin_enabled && !drawn && !closed && evening.noShows.length ? (
            <p className="text-sm text-muted-foreground">
              The draw takes the {teams ? "teams" : "players"} who checked in, so it leaves out{" "}
              {evening.noShows.map((row) => row.team?.name || row.name || row.user?.name).filter(Boolean).join(", ") || `${evening.noShows.length} who did not`}. They stay signed up; check one in to draw them.
            </p>
          ) : null}
          {!drawn && !closed ? (
            <div className="flex flex-wrap gap-2">
              {editable && event.checkin_enabled && evening.noShows.length ? (
                <Button variant="outline" disabled={!!busy} onClick={checkEveryoneIn}>
                  {busy === "everyone" ? <Icon name="mdi-loading mdi-spin" /> : <Icon name="mdi-account-check" />}
                  Check everyone in
                </Button>
              ) : null}
              {incomplete.length ? (
                <Button variant="outline" disabled={!!busy} onClick={() => setAsk("incomplete")}>
                  <Icon name="mdi-account-group-outline" />
                  Remove {incomplete.length} incomplete {incomplete.length === 1 ? "team" : "teams"}
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

      <Confirm open={ask === "incomplete"} onOpenChange={(open) => setAsk(open ? "incomplete" : null)} title="Remove the incomplete teams" busy={busy === "incomplete"} confirm="Remove them" onConfirm={removeIncomplete}>
        <p>{incomplete.map((row) => row.team?.name).join(", ")} still miss players, so they leave the cup and the bracket is drawn without them.</p>
      </Confirm>

      <Confirm open={ask === "team"} onOpenChange={(open) => setAsk(open ? "team" : null)} title="Add a team" busy={busy === "team"} confirm="Add" onConfirm={() => teamName.trim() && teamPicks.every(Boolean) && addTeam()}>
        <div className="flex flex-col gap-3">
          <Field label="Team name" htmlFor="console-team-name">
            <Input id="console-team-name" maxLength={50} value={teamName} onChange={(e) => setTeamName(e.target.value)} />
          </Field>
          {teamPicks.map((value, index) => (
            <Field key={index} label={index ? `Player ${index + 1}` : "Captain"} htmlFor={`console-team-${index}`}>
              <Combobox
                id={`console-team-${index}`}
                label="Pick a player"
                items={playerItems.filter((item) => !teamPicks.some((id, at) => at !== index && id === item.value))}
                value={value || null}
                onChange={(next) => setTeamPicks(teamPicks.map((one, at) => (at === index ? next ?? "" : one)))}
              />
            </Field>
          ))}
          <p className="text-sm text-muted-foreground">Every player is in at once, and each is checked against the cup&apos;s rules.</p>
        </div>
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
        open={ask === "swapin"}
        onOpenChange={(open) => {
          setAsk(open ? "swapin" : null);
          if (!open) setWaiting(null);
        }}
        title={`Swap ${waiting?.user?.name || "the player"} in`}
        busy={busy === "swapin"}
        confirm="Swap in"
        onConfirm={() => outId != null && swapIn()}
      >
        <p className="mb-3">
          {waiting?.user?.name || "The player"} takes the place, the seed and the matches of the player you pick, who leaves the cup. Only a player who has
          not played a match can be swapped out.
        </p>
        <Pick
          label="In place of"
          items={players.filter((row) => !played.has(row.id)).map((row) => ({ value: row.id as number, title: (row.user?.name as string) || "Entrant" }))}
          value={outId}
          onChange={setOutId}
        />
      </Confirm>

      <Confirm
        open={ask === "withdraw"}
        onOpenChange={(open) => {
          setAsk(open ? "withdraw" : null);
          if (!open) setRemoving(null);
        }}
        title={`Withdraw ${removing?.user?.name || removing?.team?.name || "the entrant"}`}
        danger
        busy={busy === "withdraw"}
        confirm="Withdraw"
        onConfirm={withdrawOne}
      >
        <p>
          {removing?.user?.name || removing?.team?.name || "This entrant"} leaves the cup and forfeits every match still open, now and later in the bracket, so the
          opponents go through. Results already played stay.
        </p>
      </Confirm>

      <Confirm
        open={ask === "add"}
        onOpenChange={(open) => {
          setAsk(open ? "add" : null);
          if (!open) {
            setSwapping(null);
            setMemberOut(null);
          }
        }}
        title={swapping || memberOut ? `Swap ${outName}` : "Add a player"}
        busy={busy === "add"}
        confirm={swapping || memberOut ? "Swap" : "Add"}
        onConfirm={() => pickedId && (pickedRace || memberOut) && addOne()}
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
          {memberOut ? null : <Pick label="Race" items={RACE_ITEMS} value={pickedRace} onChange={setPickedRace} />}
          <p className="text-sm text-muted-foreground">
            {swapping || memberOut
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
          <SimpleDatePicker id="cup-move-day" modelValue={day} label="Day" onUpdateModelValue={setDay} />
          <SimpleTimePicker id="cup-move-time" modelValue={time} label="Start time" onUpdateModelValue={setTime} />
        </div>
      </Confirm>
    </>
  );
}

export default CupConsole;
