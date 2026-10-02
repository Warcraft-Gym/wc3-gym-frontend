"use client";
import { useState } from "react";
import { DateTime } from "luxon";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/Icon";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { PlayerName } from "@/components/PlayerName";
import { TeamName } from "@/components/TeamName";
import { checkInStatus, setByText } from "@/helpers/check-in.mjs";
import { searchPlayers } from "@/helpers/planner.mjs";
import { cn } from "@/lib/utils";
import { MatchChip, gamesMark } from "./PlayerBlock";

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
  shown,
  included,
  pairedAs,
  viewerId,
  busy,
  onSwitch,
  onPlayer,
}: {
  team: Row;
  own: boolean;
  players: Row[];
  shown: Row[];
  included: (player: Row) => boolean;
  pairedAs: (playerId: number) => string | null;
  viewerId: number | null;
  busy: boolean;
  onSwitch: (player: Row, on: boolean) => void;
  onPlayer: (player: Row) => void;
}) {
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
      {!shown.length ? <p className="py-3 text-sm text-muted-foreground">No player matches</p> : null}
      <ul className="divide-y">
        {shown.map((player) => {
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
                <PlayerName player={player} race={player.race} mmr={player.mmr ?? null} warning={gamesMark(player)} w3c onClick={() => onPlayer(player)} />
              </span>
              {paired ? <MatchChip>{paired}</MatchChip> : null}
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
    </div>
  );
}

/** A search field over one or two player lists: name or battle tag. */
export function PlayerSearch({ id, value, onChange }: { id: string; value: string; onChange: (value: string) => void }) {
  return (
    <div className="relative w-full max-w-sm">
      <Icon name="mdi-magnify" className="pointer-events-none absolute top-1/2 left-2 -translate-y-1/2 text-muted-foreground" />
      <Input id={id} type="search" value={value} onChange={(event) => onChange(event.target.value)} placeholder="Name or battle tag" aria-label="Find a player" className="pl-8" />
    </div>
  );
}

/** Step 1: who plays this round, one list per team, the viewer's own team first, with a search over both. */
export function WhoPlays({
  teams,
  ownTeamId,
  players,
  included,
  pairedAs,
  viewerId,
  busy,
  onSwitch,
  onPlayer,
}: {
  teams: { team: Row; teamId: number }[];
  ownTeamId: number | null;
  players: Row[];
  included: (player: Row) => boolean;
  pairedAs: (playerId: number) => string | null;
  viewerId: number | null;
  busy: boolean;
  onSwitch: (player: Row, on: boolean) => void;
  onPlayer: (player: Row) => void;
}) {
  const [search, setSearch] = useState("");
  const ordered = [...teams].sort((a, b) => Number(b.teamId === ownTeamId) - Number(a.teamId === ownTeamId));
  return (
    <div className="flex flex-col gap-4">
      <PlayerSearch id="who-plays-search" value={search} onChange={setSearch} />
      <div className="grid gap-6 min-[960px]:grid-cols-2">
        {ordered.map(({ team, teamId }) => {
          const list = players.filter((player) => player.team_id === teamId).sort((a, b) => (b.mmr ?? -1) - (a.mmr ?? -1));
          return (
            <TeamList
              key={teamId}
              team={team}
              own={teamId === ownTeamId}
              players={list}
              shown={searchPlayers(list, search)}
              included={included}
              pairedAs={pairedAs}
              viewerId={viewerId}
              busy={busy}
              onSwitch={onSwitch}
              onPlayer={onPlayer}
            />
          );
        })}
      </div>
    </div>
  );
}

export default WhoPlays;
