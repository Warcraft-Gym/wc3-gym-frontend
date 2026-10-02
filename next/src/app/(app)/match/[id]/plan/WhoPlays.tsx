"use client";
import { DateTime } from "luxon";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { PlayerName } from "@/components/PlayerName";
import { TeamName } from "@/components/TeamName";
import { checkInStatus, setByText } from "@/helpers/check-in.mjs";
import { cn } from "@/lib/utils";
import { gamesMark } from "./PlayerBlock";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>;

/** What a row says under the name: the round answer and who gave it, or the other team's word. */
function answerNote(player: Row, included: boolean, viewerId: number | null) {
  if (player.answersRead) {
    if (!player.answer) return null;
    const status: { short: string; derived: boolean; hint?: string } = checkInStatus(player.answer);
    const text = status.derived ? `Out · ${status.hint}` : `${status.short} · ${setByText(player.answer, viewerId)}`;
    return { text, className: status.short === "Out" ? "text-error" : "text-success" };
  }
  if (!player.plays && !included) return { text: "Out this round", className: "text-error" };
  if (!player.plays) return { text: "Their side says out · kept in your list", className: "text-muted-foreground" };
  if (!included) return { text: "Left out of your list", className: "text-muted-foreground" };
  return null;
}

function availabilityLine(player: Row) {
  if (!player.availability_entered) return { text: "No availability entered · counts as free all week", className: "text-warning" };
  const changed = player.availability_changed_at ? DateTime.fromISO(player.availability_changed_at).toFormat("d LLL") : null;
  return { text: `Availability entered${changed ? ` · changed ${changed}` : ""}`, className: "text-muted-foreground" };
}

function TeamList({
  team,
  own,
  players,
  included,
  pairedAs,
  viewerId,
  busy,
  onSwitch,
}: {
  team: Row;
  own: boolean;
  players: Row[];
  included: (player: Row) => boolean;
  pairedAs: (playerId: number) => string | null;
  viewerId: number | null;
  busy: boolean;
  onSwitch: (player: Row, on: boolean) => void;
}) {
  const writes = players.some((player) => player.answersRead);
  const count = players.filter(included).length;
  return (
    <div className="min-w-0">
      <div className="flex items-baseline gap-2 border-b pb-2">
        <TeamName team={team} plain />
        {own ? <Badge variant="outline">your team</Badge> : null}
        <span className="grow" />
        <span className="tnum text-sm text-muted-foreground">
          {count} of {players.length} play
        </span>
      </div>
      <ul className="divide-y">
        {players.map((player) => {
          const on = included(player);
          const note = answerNote(player, on, viewerId);
          const avail = availabilityLine(player);
          const paired = pairedAs(player.user_id);
          return (
            <li key={player.user_id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2">
              <Switch
                checked={on}
                disabled={busy}
                aria-label={player.answersRead ? `${player.name} plays round` : `${player.name} is in your list`}
                onCheckedChange={(next) => onSwitch(player, next)}
              />
              <span className={cn("min-w-0", !on && "opacity-60")}>
                <PlayerName player={player} race={player.race} mmr={player.mmr ?? null} warning={gamesMark(player)} w3c />
              </span>
              {paired ? <span className="text-xs font-medium text-info">{paired}</span> : null}
              <span className="ml-auto tnum text-sm text-muted-foreground">
                {player.played} series played
              </span>
              <span className="flex basis-full flex-col pl-12 text-sm">
                {note ? <span className={note.className}>{note.text}</span> : null}
                <span className={avail.className}>{avail.text}</span>
              </span>
            </li>
          );
        })}
      </ul>
      <p className="mt-2 text-sm text-muted-foreground">
        {writes
          ? "Switch off = not available this round. It is saved at once, and the player sees it on their Home page."
          : "Their captain sets their answers. Switching here only leaves a player out of your list."}
      </p>
    </div>
  );
}

/** Step 1: who plays this round, one list per team, the viewer's own team first. */
export function WhoPlays({
  teams,
  ownTeamId,
  players,
  included,
  pairedAs,
  viewerId,
  busy,
  onSwitch,
}: {
  teams: { team: Row; teamId: number }[];
  ownTeamId: number | null;
  players: Row[];
  included: (player: Row) => boolean;
  pairedAs: (playerId: number) => string | null;
  viewerId: number | null;
  busy: boolean;
  onSwitch: (player: Row, on: boolean) => void;
}) {
  const ordered = [...teams].sort((a, b) => Number(b.teamId === ownTeamId) - Number(a.teamId === ownTeamId));
  return (
    <div className="grid gap-6 min-[960px]:grid-cols-2">
      {ordered.map(({ team, teamId }) => (
        <TeamList
          key={teamId}
          team={team}
          own={teamId === ownTeamId}
          players={players.filter((player) => player.team_id === teamId).sort((a, b) => (b.mmr ?? -1) - (a.mmr ?? -1))}
          included={included}
          pairedAs={pairedAs}
          viewerId={viewerId}
          busy={busy}
          onSwitch={onSwitch}
        />
      ))}
    </div>
  );
}

export default WhoPlays;
