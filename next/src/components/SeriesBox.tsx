"use client";
import { PlayerName } from "@/components/PlayerName";
import { TeamName } from "@/components/TeamName";
import { useHideResults } from "@/components/hide-results";
import { sideRoster } from "@/helpers/fixture.mjs";
import { teamLabel } from "@/helpers/teams.mjs";
import { isByeSide, isLobby, lobbySeats, seriesState, shownPlayer, shownTeam, winnerSide } from "@/helpers/stage-view.mjs";
import { cn } from "@/lib/utils";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>;

const STATE_WORD: Record<string, string> = {
  pending: "Waiting for both sides",
  open: "To play",
  played: "Played",
  walkover: "Walkover",
  forfeit: "Forfeit",
};

// The result is a mark beside the name, never coloured text
export const MARK = "shrink-0 w-[3px] self-stretch rounded-[2px]";
export const SIDE = "flex items-center gap-1.5 px-2 py-[3px] min-h-[26px]";

/** One series of a stage: a side per row with its race, the score, and the state as a word.
 *  A team side reads as the team name over the roster it fields. A free for all lobby reads
 *  one row a seat with its place. The winning side wears the win token; a click opens the series. */
export function SeriesBox({
  series,
  label = "", // the grand final and the third place name themselves
  round = "", // the column the box sits in, so a screen reader hears it per box
  flat, // inside a list, the card around it draws the border
  readonly, // the series page opens nothing, so its names link
  rosters = {}, // the players of each team entrant, by entrant id
  fed, // a lobby seated by the round before it, not by the seeds
  onOpen,
  className,
}: {
  series: Row;
  label?: string;
  round?: string;
  flat?: boolean;
  readonly?: boolean;
  rosters?: Record<string, Row[]>;
  fed?: boolean;
  onOpen?: (series: Row) => void;
  className?: string;
}) {
  // The spoiler switch of the page around this box; a page with no switch shows every result
  const hidden = useHideResults();

  const state = seriesState(series);
  // A lobby seats more than two, so its seats replace the two side rows. A fixture series
  // writes the same rows for its side rosters, and those read under the team name instead.
  const seats: Row[] = isLobby(series) ? lobbySeats(series, hidden, fed) : [];
  // A lobby fills from the round before it, so it never waits for "both sides"
  const stateWord = seats.length && state === "pending" ? "Waiting for the round before" : STATE_WORD[state];
  const winner = hidden ? null : winnerSide(series);

  const player = (side: number) => shownPlayer(series, side, hidden);
  const team = (side: number) => shownTeam(series, side, hidden);
  const race = (side: number) => series[`player${side}_race`] || undefined;
  // The stage row carries the rating of the race it names; a row without the field lets the line read its own
  const mmr = (side: number) => series[`player${side}_mmr`];
  const score = (side: number) => (hidden ? "" : series[`player${side}_score`] ?? "");
  // A side with no feeder and no entrant can never fill: the other side passes through
  const empty = (side: number) => (isByeSide(series, side) ? "Bye" : "To be decided");
  // Who a team side fields: the players the series names, else the one player it drafted,
  // else every member the team is rostered with. A series that names its own pick rule
  // fields the players it names alone, so a side nobody has named yet reads empty.
  const roster = (side: number): Row[] => {
    if (!team(side)) return [];
    const named = sideRoster(series, side);
    if (named.length) return named.map((one: Row) => ({ player: one, race: one.signup_race }));
    const drafted = player(side);
    if (drafted) return [{ player: drafted, race: race(side), mmr: mmr(side) }];
    if (series.pick_rule) return [];
    return rosters[series[`entrant${side}_id`]] || [];
  };

  // What a screen reader hears for the box: where it sits, who plays, and the state
  const sideName = (side: number) => (team(side) ? teamLabel(team(side)) : player(side)?.name) || empty(side);
  const where = [round, label].filter(Boolean).join(", ");
  const who = seats.length ? `${seats.length} seats` : `${sideName(1)} vs ${sideName(2)}`;
  const name = `${where ? `${where}: ` : ""}${who}, ${stateWord}`;

  const sideClass = (side: number) => (winner === side ? "won" : winner !== null ? "lost" : "");
  const markClass = (result: string) => (result === "won" ? "bg-win" : result === "lost" ? "bg-loss" : "bg-draw");

  const rows = seats.length
    ? seats.map((seat, index) => (
        <div key={seat.key} className={cn(SIDE, index && "border-t", seat.result === "won" && "font-bold")}>
          <span className={cn(MARK, markClass(seat.result))} />
          {seat.user ? (
            <PlayerName player={seat.user} plain={!readonly} />
          ) : (
            <span className="text-[0.8125rem] text-muted-foreground">{fed ? "To be decided" : "Empty seat"}</span>
          )}
          <span className="tnum ml-auto font-bold">{seat.place ?? ""}</span>
        </div>
      ))
    : [1, 2].map((side, index) => (
        <div key={side} className={cn(SIDE, index && "border-t", sideClass(side) === "won" && "font-bold")}>
          <span className={cn(MARK, markClass(sideClass(side)))} />
          {team(side) ? (
            <div className="flex min-w-0 flex-col gap-px">
              <TeamName team={team(side)} plain={!readonly} />
              {roster(side).length ? (
                <span className="flex flex-wrap gap-x-2.5 gap-y-0.5 text-[0.8125rem] font-normal">
                  {roster(side).map((seat) => (
                    <PlayerName key={seat.player.id} player={seat.player} race={seat.race || undefined} mmr={seat.mmr} plain={!readonly} />
                  ))}
                </span>
              ) : series.pick_rule ? (
                <span className="flex text-[0.8125rem] font-normal text-muted-foreground">Roster not named</span>
              ) : null}
            </div>
          ) : player(side) ? (
            <PlayerName player={player(side)} race={race(side)} mmr={mmr(side)} plain={!readonly} />
          ) : (
            <span className="text-[0.8125rem] text-muted-foreground">{empty(side)}</span>
          )}
          <span className="tnum ml-auto font-bold">{score(side)}</span>
        </div>
      ));

  const body = (
    <>
      {rows}
      <div className="flex justify-between gap-2 px-2 pt-0.5 pb-1 text-xs leading-tight text-muted-foreground">
        <span>{stateWord}</span>
        {label ? <span>{label}</span> : null}
      </div>
    </>
  );

  const shell = cn(
    "block w-full overflow-hidden rounded text-left",
    flat ? "rounded-none border-0 bg-transparent" : "border bg-surface",
    !readonly && "hover:border-primary focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-1",
    className,
  );

  if (readonly)
    return (
      <div role="group" aria-label={name} className={shell}>
        {body}
      </div>
    );
  return (
    <button type="button" aria-label={name} className={shell} onClick={() => onOpen?.(series)}>
      {body}
    </button>
  );
}

export default SeriesBox;
