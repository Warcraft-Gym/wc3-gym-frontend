"use client";
import { PlayerName } from "@/components/PlayerName";
import { Icon } from "@/components/ui/Icon";
import { TeamName } from "@/components/TeamName";
import { useHideResults } from "@/components/hide-results";
import { sideRoster } from "@/helpers/fixture.mjs";
import { teamLabel } from "@/helpers/teams.mjs";
import { isByeSide, isLobby, lobbySeats, seriesState, shownPlayer, shownTeam, standsOn, winnerSide } from "@/helpers/stage-view.mjs";
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
// A side of the draw holds no MMR and a narrow box, so a name longer than the room ends in an
// ellipsis instead of running past the score
const UNRATED = "[&_.player-name]:min-w-0 [&_.name]:truncate";

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
  seeds, // the seed of each entrant, by entrant id; a box without them names no seed
  rated = true, // false where the draw leaves the MMR out, so the names keep the room
  report = null, // "report" or "edit" when the viewer reports this series from the draw
  onVeto, // a side of a cup series vetoes from the draw, from a button beside the report one
  stateless = false, // the draw: no state word, a played box reads as done by its look
  onReport,
  focus = null, // the entrant whose way through the bracket is lit
  onFocus, // a pointer over a side follows that entrant
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
  seeds?: Record<string, number>;
  rated?: boolean;
  report?: "report" | "edit" | null;
  onVeto?: ((series: Row) => void) | null;
  stateless?: boolean;
  onReport?: (series: Row) => void;
  focus?: number | null;
  onFocus?: (entrant: number | null) => void;
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
  // a box of the draw that carries a result reads as done: a quiet success frame and tint, a
  // check in its corner, and the beaten side dimmed, so no word has to say it
  const done = stateless && ["played", "walkover", "forfeit"].includes(state);
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
        <div
          key={side}
          className={cn(SIDE, !rated && UNRATED, index && "border-t", sideClass(side) === "won" && "font-bold", done && sideClass(side) === "lost" && "text-muted-foreground", focus != null && standsOn(series, side) === focus && "bg-primary/15")}
          onMouseEnter={onFocus ? () => onFocus(standsOn(series, side)) : undefined}
        >
          <span className={cn(MARK, markClass(sideClass(side)))} />
          {seeds && standsOn(series, side) != null && seeds[standsOn(series, side)] != null ? (
            <span className="tnum w-4 shrink-0 text-right text-xs font-normal text-muted-foreground">{seeds[standsOn(series, side)]}</span>
          ) : null}
          {team(side) ? (
            <div className="flex min-w-0 flex-col gap-px">
              <TeamName team={team(side)} plain={!readonly} />
              {roster(side).length ? (
                <span className="flex flex-wrap gap-x-2.5 gap-y-0.5 text-[0.8125rem] font-normal">
                  {roster(side).map((seat) => (
                    <PlayerName key={seat.player.id} player={seat.player} race={seat.race || undefined} mmr={rated ? seat.mmr : false} plain={!readonly} />
                  ))}
                </span>
              ) : series.pick_rule ? (
                <span className="flex text-[0.8125rem] font-normal text-muted-foreground">Roster not named</span>
              ) : null}
            </div>
          ) : player(side) ? (
            <PlayerName player={player(side)} race={race(side)} mmr={rated ? mmr(side) : false} plain={!readonly} />
          ) : (
            <span className="text-[0.8125rem] text-muted-foreground">{empty(side)}</span>
          )}
          <span className="tnum ml-auto font-bold">{score(side)}</span>
        </div>
      ));

  // the viewer reports this series in place, from a button in the box's corner
  const reporting = !!(report && onReport);
  const vetoing = !!onVeto;
  const corner = "inline-flex h-6 items-center gap-1 rounded px-2 text-xs font-bold focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-1";
  const vetoButton = vetoing ? (
    <button
      type="button"
      onClick={() => onVeto?.(series)}
      aria-label={`Map veto of ${who}`}
      className={cn(corner, "border border-primary bg-surface text-primary-text hover:bg-primary/15")}
    >
      <Icon name="mdi-map-outline" />
      Veto
    </button>
  ) : null;
  const reportButton = reporting ? (
    <button
      type="button"
      onClick={() => onReport?.(series)}
      aria-label={`${report === "edit" ? "Edit the result of" : "Report the result of"} ${who}`}
      className={cn(corner, "bg-primary text-on-primary hover:bg-primary-darken-1")}
    >
      <Icon name={report === "edit" ? "mdi-pencil" : "mdi-clipboard-check-outline"} />
      {report === "edit" ? "Edit result" : "Report"}
    </button>
  ) : null;

  const body = (
    <>
      {rows}
      {stateless ? (
        // the draw names no state: the corner holds the buttons, the label rides on the left
        <div className={cn("flex min-h-5 items-center gap-1.5 px-2 pt-0.5 pb-1 text-xs leading-tight text-muted-foreground", (reporting || vetoing) && "min-h-7")}>
          {done ? <Icon name="mdi-check-circle" size={14} className="text-success" title={stateWord} /> : null}
          <span className="min-w-0 truncate">{label}</span>
        </div>
      ) : (
        <div className={cn("flex justify-between gap-2 px-2 pt-0.5 pb-1 text-xs leading-tight text-muted-foreground", (reporting || vetoing) && "min-h-7 items-center pr-24")}>
          {/* the report button takes the corner, so the label rides beside the state */}
          <span>{reporting && label ? `${stateWord} · ${label}` : stateWord}</span>
          {label && !reporting ? <span>{label}</span> : null}
        </div>
      )}
    </>
  );

  const shell = cn(
    "block w-full overflow-hidden rounded text-left",
    flat ? cn("rounded-none border-0", done ? "bg-success/5" : "bg-transparent") : done ? "border border-success/60 bg-success/5" : "border bg-surface",
    !readonly && onOpen && "hover:border-primary focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-1",
    className,
  );

  // a box with nothing to open is no button: the draw of the event page opens no series page
  const box = readonly || !onOpen ? (
    <div role="group" aria-label={name} className={shell}>
      {body}
    </div>
  ) : (
    <button type="button" aria-label={name} className={shell} onClick={() => onOpen?.(series)}>
      {body}
    </button>
  );
  // a button holds no button, so the report button sits beside the box, over its corner
  return reportButton || vetoButton ? (
    <div className="relative">
      {box}
      <div className="absolute right-1 bottom-1 flex gap-1">
        {vetoButton}
        {reportButton}
      </div>
    </div>
  ) : (
    box
  );
}

export default SeriesBox;
