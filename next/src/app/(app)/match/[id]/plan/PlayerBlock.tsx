"use client";
import { DateTime } from "luxon";
import { Icon } from "@/components/ui/Icon";
import { TapTooltip } from "@/components/ui/TapTooltip";
import { toneClass } from "@/components/ui/tone";
import { PlayerName } from "@/components/PlayerName";
import { RaceIcon } from "@/components/RaceIcon";
import { W3CIcon } from "@/components/W3CIcon";
import { record } from "@/helpers/figures.mjs";
import { raceWrapper } from "@/helpers/races.js";
import { cn } from "@/lib/utils";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>;

const WARNING_TEXT: Record<string, string> = {
  under_min_games: "Fewer W3C ladder games than the event asks for",
  no_w3c_stats: "No W3C stats for the signup race",
};

/** The games rule of the event, as the board read already applied it. */
export const gamesMark = (player: Row) =>
  player.games_warning
    ? { colour: player.games_warning === "no_w3c_stats" ? ("error" as const) : ("warning" as const), text: `${WARNING_TEXT[player.games_warning]} (${player.games} games)` }
    : null;

const raceName = (race?: string | null) => raceWrapper.getRaceObject(race)?.name ?? race ?? "";

/** A player who already holds a match this round: a check on the player and the match, as an `info` chip. */
export function MatchChip({ children }: { children: React.ReactNode }) {
  return (
    <span className={cn("inline-flex w-fit items-center gap-1 rounded-full border border-info/40 px-1.5 text-xs leading-5 font-medium", toneClass("info"))}>
      <Icon name="mdi-account-check" size={14} />
      {children}
    </span>
  );
}

/** Whether the player entered any availability, as a calendar mark with the day it last changed. */
export function AvailabilityMark({ player }: { player: Row }) {
  const entered = !!player.availability_entered;
  const changed = player.availability_changed_at ? DateTime.fromISO(player.availability_changed_at).toFormat("d LLL") : null;
  const text = entered
    ? `${player.name} entered availability${changed ? `, last changed ${changed}` : ""}`
    : `${player.name} entered no availability, so every hour counts as free`;
  return (
    <TapTooltip content={text}>
      <Icon name={entered ? "mdi-calendar-check" : "mdi-calendar-remove"} size={16} className={entered ? "text-success" : "text-muted-foreground"} />
      <span className="sr-only">{text}</span>
    </TapTooltip>
  );
}

/** One side of a possible matchup: the player line with the W3Champions link and the availability
 *  mark, the ladder record against this opponent's race, and the races faced this season in order,
 *  a ring on each one that is this opponent's race. A note says what the player already holds. The
 *  name opens the player's stats; a click anywhere else falls through to the row. */
export function PlayerBlock({
  player,
  opponent,
  faced,
  note,
  onPlayer,
}: {
  player: Row;
  opponent: Row;
  faced: { key: number; race: string | null; same: boolean }[];
  note?: string | null;
  onPlayer?: () => void;
}) {
  const pair = player.vs_race?.[opponent.race] ?? null;
  const ladder = record(pair?.[0], pair?.[1]);
  return (
    // two lines: the player with his marks and any match he holds, then his record against this
    // opponent's race and the races he faced
    <div className="flex min-w-0 flex-col gap-0.5">
      <span className="inline-flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
        {/* the name line keeps its clicks: the name, the W3Champions link and the marks */}
        <span className="inline-flex items-center gap-1.5" onClick={(event) => event.stopPropagation()}>
          <PlayerName player={player} race={player.race} mmr={player.mmr ?? null} warning={gamesMark(player)} w3c onClick={onPlayer} />
          <AvailabilityMark player={player} />
        </span>
        {note ? <MatchChip>{note}</MatchChip> : null}
      </span>
      <span className="inline-flex flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1" title={`${player.name}'s W3C ladder games against ${raceName(opponent.race)}, in the event window`}>
          <W3CIcon size={12} />
          vs
          {opponent.race ? <RaceIcon raceIdentifier={opponent.race} size={13} /> : null}
          <span className="tnum text-foreground">{ladder ?? "—"}</span>
        </span>
        <span aria-hidden="true">·</span>
        <span className="inline-flex items-center gap-1">
          Faced
          {faced.length ? (
            faced.map((one) =>
              one.race ? (
                <span
                  key={one.key}
                  title={one.same ? `${raceName(one.race)}, the race of this opponent` : raceName(one.race)}
                  className={cn("inline-flex rounded-full", one.same && "ring-2 ring-warning ring-offset-1 ring-offset-background")}
                >
                  <RaceIcon raceIdentifier={one.race} size={13} />
                </span>
              ) : (
                <span key={one.key} title="An opponent with no race on record">
                  ?
                </span>
              ),
            )
          ) : (
            <span title="Nobody yet this season">—</span>
          )}
        </span>
      </span>
    </div>
  );
}

export default PlayerBlock;
