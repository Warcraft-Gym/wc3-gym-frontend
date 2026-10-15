"use client";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CupTeamName } from "@/components/CupTeamName";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Icon } from "@/components/ui/Icon";
import { toneClass } from "@/components/ui/tone";
import { PlayerName } from "@/components/PlayerName";
import { TeamSignupDialog } from "@/components/TeamSignupDialog";
import { missing, myTeam, teamState } from "@/helpers/cup-teams.mjs";
import { useEventStore } from "@/stores";
import { cn } from "@/lib/utils";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>;
type Mine = { entrant: Row; captain: boolean; invited: boolean } | null;

/** The caller's side of a team cup on its page: the invitation to answer, the team they play
 *  for with what it still waits for, or the way to sign a team up. The captain invites and
 *  withdraws, a player leaves, any player checks the team in. Every player is held to the
 *  cup's eligibility, so a refusal names the player and the rule. */
export function TeamCupPanel({
  event,
  entrants,
  userId,
  invites,
  onChanged,
  onError,
}: {
  event: Row;
  entrants: Row[];
  userId: number | null;
  invites: Row[];
  onChanged: () => Promise<void> | void;
  onError: (message: string | null) => void;
}) {
  const store = useEventStore();
  const size: number = event.team_size;
  const mine = myTeam(entrants, userId) as Mine;
  const invite = invites.find((one) => one.event_id === event.id) ?? null;
  const [busy, setBusy] = useState<string | null>(null);
  const [ask, setAsk] = useState<"signup" | "invite" | "withdraw" | "leave" | null>(null);

  const work = async (key: string, task: () => Promise<unknown>) => {
    setBusy(key);
    onError(null);
    try {
      await task();
      setAsk(null);
      await onChanged();
    } catch (e) {
      onError((e as Error).message || "That did not go through");
    } finally {
      setBusy(null);
    }
  };

  const open = (what: "signup" | "invite") => setAsk(what);
  // every player already in a team of this cup, or invited by one, is left out of the pick
  const taken: number[] = entrants.flatMap((row) => [...(row.roster || []).map((one: Row) => one.user?.id), ...(row.invited || []).map((one: Row) => one.id)]);

  const entrant = mine?.entrant;
  const short = entrant ? missing(entrant, size) : size;
  const freePlaces = entrant ? size - (entrant.roster?.length || 0) - (entrant.invited?.length || 0) : 0;

  return (
    <>
      {invite && !mine?.entrant?.roster?.some((one: Row) => one.user?.id === userId) ? (
        <Card className="card mt-4 border-primary/60">
          <CardContent className="flex flex-wrap items-center gap-3 p-4">
            <Icon name="mdi-account-group" size={24} className="text-primary-text" />
            <div className="min-w-0 flex-[1_1_260px]">
              <div className="font-heading text-base font-bold">
                {invite.captain?.name || "A captain"} invited you to {invite.team?.name}
              </div>
              <div className="text-sm text-muted-foreground">Accept to play this cup in their {size}v{size} team.</div>
            </div>
            <Button variant="outline" disabled={!!busy} onClick={() => work("decline", () => store.declineInvite(event.id, invite.team.id))}>
              Decline
            </Button>
            <Button disabled={!!busy} onClick={() => work("accept", () => store.acceptInvite(event.id, invite.team.id))}>
              {busy === "accept" ? <Icon name="mdi-loading mdi-spin" /> : <Icon name="mdi-check" />}
              Accept
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {entrant && !mine?.invited ? (
        <Card className="card mt-4">
          <CardHeader className="flex flex-row flex-wrap items-center gap-2">
            <CardTitle className="flex flex-1 items-center gap-2">Your team: <CupTeamName team={entrant.team} /></CardTitle>
            <Badge className={toneClass(short ? "warning" : "success")}>{teamState(entrant, size)}</Badge>
            {entrant.waitlisted_at ? <Badge className={toneClass("warning")}>On the waitlist</Badge> : null}
            {entrant.checked_in_at ? (
              <Badge className={toneClass("success")}>
                <Icon name="mdi-check" />
                Checked in
              </Badge>
            ) : event.checkin_enabled && !short && !entrant.waitlisted_at ? (
              <Button size="sm" disabled={!!busy} onClick={() => work("checkin", () => store.checkIn(event.id, entrant.id))}>
                <Icon name="mdi-check" />
                Check the team in
              </Button>
            ) : null}
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <ul className="flex flex-col">
              {(entrant.roster || []).map((one: Row) => (
                <li key={one.user.id} className="flex min-h-10 items-center gap-2 border-t border-border first:border-t-0">
                  <PlayerName player={one.user} />
                  {one.captain ? <Badge variant="outline">Captain</Badge> : null}
                  {one.mmr != null ? <span className="tnum ml-auto text-sm text-muted-foreground">{one.mmr} MMR</span> : null}
                </li>
              ))}
              {(entrant.invited || []).map((one: Row) => (
                <li key={one.id} className="flex min-h-10 items-center gap-2 border-t border-border text-muted-foreground">
                  <PlayerName player={one} />
                  <span className="text-sm">invited</span>
                  {mine?.captain ? (
                    <Button variant="ghost" size="sm" className="ml-auto" disabled={!!busy} onClick={() => work(`back-${one.id}`, () => store.takeBackInvite(event.id, entrant.team.id, one.id))}>
                      Take back
                    </Button>
                  ) : null}
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap gap-2">
              {mine?.captain && freePlaces > 0 && event.signups_open ? (
                <Button variant="outline" onClick={() => open("invite")}>
                  <Icon name="mdi-account-plus" />
                  Invite a player
                </Button>
              ) : null}
              {mine?.captain ? (
                <Button variant="ghost" className="text-error" onClick={() => setAsk("withdraw")}>
                  Withdraw the team
                </Button>
              ) : (
                <Button variant="ghost" className="text-error" onClick={() => setAsk("leave")}>
                  Leave the team
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : null}

      {!mine && !invite && userId != null && event.signups_open ? (
        <div className="mt-4">
          <Button onClick={() => open("signup")}>
            <Icon name="mdi-account-group" />
            Sign up a team
          </Button>
        </div>
      ) : null}

      <TeamSignupDialog
        event={event}
        mode={ask === "invite" ? "invite" : "signup"}
        teamId={entrant?.team?.id ?? null}
        taken={taken}
        userId={userId}
        open={ask === "signup" || ask === "invite"}
        onOpenChange={(value) => !value && setAsk(null)}
        onDone={onChanged}
      />

      <Dialog open={ask === "withdraw" || ask === "leave"} onOpenChange={(value) => !value && setAsk(null)}>
        <DialogContent size="confirm" className="gap-0 p-0">
          <DialogTitle className="bg-error px-4 py-3 text-on-error">{ask === "withdraw" ? "Withdraw the team" : "Leave the team"}</DialogTitle>
          <p className={cn("p-4")}>
            {ask === "withdraw"
              ? "The team leaves the cup, and its open invitations go with it."
              : "You leave the team; the captain can invite someone else in your place."}
          </p>
          <div className="flex justify-end gap-2 p-4 pt-0">
            <Button variant="ghost" onClick={() => setAsk(null)}>
              Back
            </Button>
            <Button
              variant="destructive"
              disabled={!!busy}
              onClick={() =>
                ask === "withdraw"
                  ? work("withdraw", () => store.withdrawTeam(event.id, entrant!.team.id))
                  : work("leave", () => store.leaveTeam(event.id, entrant!.team.id))
              }
            >
              {ask === "withdraw" ? "Withdraw" : "Leave"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default TeamCupPanel;
