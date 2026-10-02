"use client";
import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { PlayerName } from "@/components/PlayerName";
import { newMatchFor, searchPlayers } from "@/helpers/planner.mjs";
import { teamLabel } from "@/helpers/teams.mjs";
import { cn } from "@/lib/utils";
import { AvailabilityMark, gamesMark } from "./PlayerBlock";
import { PlayerSearch } from "./WhoPlays";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>;

/** What a new match for this player would be, in the words of the list. */
export function needText(player: Row, need: Row, nameOf: (id: number) => string) {
  if (need.kind === "replace") {
    const drop = nameOf(need.dropId);
    if (need.replacedBy) {
      const by = nameOf(need.replacedBy.player1_id === player.user_id ? need.replacedBy.player2_id : need.replacedBy.player1_id);
      return { text: `Series vs ${drop} · a draft already replaces it with ${by} → picking again changes that draft`, className: "text-muted-foreground" };
    }
    return { text: `Series vs ${drop} · not played → a new match replaces it`, className: "text-muted-foreground" };
  }
  const className = "text-muted-foreground";
  if (need.leaving) {
    const opponent = nameOf(need.leaving.player1_id === player.user_id ? need.leaving.player2_id : need.leaving.player1_id);
    return { text: `A draft replaces them in the series vs ${opponent} → a new match is a new pairing in the draft`, className };
  }
  if (need.played) {
    const own = need.played.player1_id === player.user_id;
    const opponent = nameOf(own ? need.played.player2_id : need.played.player1_id);
    const score = own ? `${need.played.player1_score}–${need.played.player2_score}` : `${need.played.player2_score}–${need.played.player1_score}`;
    return { text: `Series vs ${opponent} · played ${score} → a new match is an extra pairing`, className };
  }
  if (need.drafted) {
    const opponent = nameOf(need.drafted.player1_id === player.user_id ? need.drafted.player2_id : need.drafted.player1_id);
    return { text: `In the draft vs ${opponent} → a new match is a second pairing`, className };
  }
  return { text: `No series this round → a new pairing in the draft`, className };
}

/** Step 1 of a replacement: the players of one team who need a new match, ticked. A tick only picks;
 *  it never changes a round answer. Every player of the other team who plays is a candidate. */
export function WhoNeedsMatch({
  teams,
  teamId,
  players,
  selected,
  published,
  drafts,
  candidates,
  nameOf,
  onPlayer,
  onTeam,
  onToggle,
}: {
  teams: { team: Row; teamId: number }[];
  teamId: number;
  players: Row[];
  selected: number[];
  published: Row[];
  drafts: Row[];
  candidates: number;
  nameOf: (id: number) => string;
  onPlayer: (player: Row) => void;
  onTeam: (teamId: number) => void;
  onToggle: (playerId: number, on: boolean) => void;
}) {
  const [search, setSearch] = useState("");
  const other = teams.find((one) => one.teamId !== teamId)?.team;
  const list = players.filter((player) => player.team_id === teamId).sort((a, b) => (b.mmr ?? -1) - (a.mmr ?? -1));
  const shown = searchPlayers(list, search);
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm font-medium">Team</span>
        <ToggleGroup variant="outline" spacing={0} aria-label="Team of the players who need a match" value={[String(teamId)]} onValueChange={(value) => (value[0] ? onTeam(Number(value[0])) : undefined)}>
          {teams.map(({ team, teamId: id }) => (
            <ToggleGroupItem key={id} value={String(id)}>
              {teamLabel(team) || `Team ${id}`}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <PlayerSearch id="needs-match-search" value={search} onChange={setSearch} />
      </div>
      {!shown.length ? <p className="text-sm text-muted-foreground">No player matches</p> : null}
      <ul className="divide-y">
        {shown.map((player) => {
          const on = selected.includes(player.user_id);
          const line = needText(player, newMatchFor(player.user_id, published, drafts), nameOf);
          const lineId = `needs-match-${player.user_id}`;
          return (
            <li key={player.user_id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2">
              <Checkbox checked={on} aria-label={`${player.name} needs a new match`} aria-describedby={lineId} onCheckedChange={(next) => onToggle(player.user_id, !!next)} />
              <span className="inline-flex min-w-0 flex-wrap items-center gap-1.5">
                <PlayerName player={player} race={player.race} mmr={player.mmr ?? null} warning={gamesMark(player)} w3c onClick={() => onPlayer(player)} />
                <AvailabilityMark player={player} />
              </span>
              <span className="ml-auto tnum text-sm text-muted-foreground">{player.played} series played</span>
              <span id={lineId} className={cn("basis-full pl-7 text-sm", line.className)}>
                {line.text}
              </span>
            </li>
          );
        })}
      </ul>
      <p className="text-sm text-muted-foreground">
        Candidates: every {teamLabel(other) || "other team"} player who plays this round, {candidates} player{candidates === 1 ? "" : "s"}. A tick changes no round answer.
      </p>
    </div>
  );
}

export default WhoNeedsMatch;
