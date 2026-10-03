"use client";
import { useId, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Icon } from "@/components/ui/Icon";
import { Separator } from "@/components/ui/separator";
import { TapTooltip } from "@/components/ui/TapTooltip";
import { toneClass } from "@/components/ui/tone";
import { PlayerName } from "@/components/PlayerName";
import { RaceIcon } from "@/components/RaceIcon";
import { noStatsWarning } from "@/helpers/games-rule.mjs";
import { bracketLabel, foldedStored, hasSeries, heirOf, leftSeats, movedQueue, placeInQueue, seatKey, seatLeft, seatRow, skippedSeat, startButton, storeFolded, throneWord } from "@/helpers/koth-board.mjs";
import { raceWrapper } from "@/helpers/races.js";
import { cn } from "@/lib/utils";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>;

/** The controls the run page hangs on the card. The public page passes none and draws the
 *  same card. */
export type BracketAdmin = {
  picks: Record<number, number>; // the race row each seat plays next, by seat key
  picked: number[]; // the seat keys the admin clicked for the next pair, at most two
  busy: boolean;
  onPickSeat: (seat: Row) => void;
  onPickRace: (seat: Row, entrantId: number) => void;
  onClearPick: () => void;
  onStart: (bracket: Row, pair: Row[]) => void;
  onWin: (bracket: Row, side: 1 | 2) => void;
  onCancelSeries: (bracket: Row) => void;
  onStepDown: (bracket: Row) => void;
  onCrown: (bracket: Row, entrantId: number) => void; // an empty throne goes to one race row
  onAskCrown: (bracket: Row, seat: Row) => void; // a seat dropped on an empty throne, which a confirm crowns
  onMove: (bracket: Row, from: number, to: number) => void;
  onMoveBracket: (bracket: Row, seat: Row, entrantId: number, divisionId: number) => void; // one race row to another bracket
  onRemove: (entrantIds: number[]) => void; // one race row, or every race the player holds here
  onRestore: (entrantIds: number[]) => void; // one race row, or every race the player left on
  onErase: (name: string, rows: Row[]) => void; // takes rows that left off the record of the night, after a confirm
  onFix: (played: Row) => void; // opens the dialog that turns a result around or removes the series
  onAddResult: (bracket: Row) => void; // a series already played, entered as winner beat loser
};

export const raceName = (race?: string | null) => (race ? raceWrapper.getRaceObject(race)?.name || race : "");

/** "Move to": the other brackets of the night, by name, for one race row. */
function MoveTo({ bracket, brackets, seat, row, admin, who, compact }: { bracket: Row; brackets: Row[]; seat: Row; row: Row | null; admin: BracketAdmin; who: string; compact?: boolean }) {
  const others = brackets.filter((one: Row) => one.division_id !== bracket.division_id);
  if (!row || !others.length) return null;
  // a queue row is narrow, so its Move to is the icon alone and names itself in a tooltip
  const trigger = compact ? (
    <TapTooltip content="Move to another bracket">
      <DropdownMenuTrigger render={<Button variant="outline" size="icon-xs" className="shrink-0" disabled={admin.busy} aria-label={`Move to, ${who}`} />}>
        <Icon name="mdi-swap-horizontal" />
      </DropdownMenuTrigger>
    </TapTooltip>
  ) : (
    <DropdownMenuTrigger render={<Button variant="outline" size="xs" className="shrink-0" disabled={admin.busy} aria-label={`Move to, ${who}`} />}>
      Move to
    </DropdownMenuTrigger>
  );
  return (
    <DropdownMenu>
      {trigger}
      <DropdownMenuContent align="end">
        {others.map((one: Row) => (
          <DropdownMenuItem key={one.division_id} onClick={() => admin.onMoveBracket(bracket, seat, row.entrant_id, one.division_id)}>
            {bracketLabel(brackets, one).name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// The seat of this bracket one seat key names, so a pick survives a board that read itself again
const seatOf = (bracket: Row, key: number): Row | null =>
  [bracket.king, ...(bracket.queue ?? [])].find((seat: Row) => seat && seatKey(seat) === key) ?? null;

/** The mark a seat's name line wears: only when W3Champions rated no race the player holds in
 *  this bracket, because each race row of a two-race seat carries its own mark. */
export const seatMark = (seat: Row, playing: Row | null) => {
  const rows: Row[] = seat?.rows ?? [];
  if (rows.length > 1) return rows.every((row: Row) => row.mmr == null) ? noStatsWarning() : null;
  return playing?.mmr == null ? noStatsWarning(playing?.race ?? null) : null;
};

/** One player of the board as the app draws a player line: flag, name, race, one MMR. A player
 *  W3Champions holds no rating for wears the games mark instead of a number. */
export function BoardPlayer({ row, race, plain, slot, warn }: { row: Row; race?: string | null; plain?: boolean; slot?: boolean; warn?: boolean }) {
  const shown = race === undefined ? row.race : race;
  const marked = warn === undefined ? row.mmr == null : warn;
  const warning = marked ? noStatsWarning(shown) : null;
  // only a line in a column of player lines keeps the empty mark slot, so its flags read as one column;
  // the board names a battle tag only where two players share a name, and then the tag is the name
  return (
    <PlayerName
      player={{ id: row.user_id ?? null, name: row.battle_tag || row.name, country: row.country, battleTag: row.battle_tag }}
      race={shown || undefined}
      mmr={row.mmr ?? false}
      warning={warning ?? (slot ? null : undefined)}
      plain={plain}
    />
  );
}

/** The races one player holds in this bracket, under his name, and the races he left here
 *  tonight. An admin picks the race that plays next, moves or removes one race, and puts back
 *  one that left; a reader sees the ratings alone. */
function RaceRows({ seat, bracket, brackets, admin, removable }: { seat: Row; bracket: Row; brackets: Row[]; admin?: BracketAdmin; removable?: boolean }) {
  const labelId = useId();
  const rows: Row[] = seat.rows ?? [];
  const left: Row[] = seatLeft(bracket, seat);
  const several = rows.length > 1;
  if (!several && !left.length) return null;
  const playing = seatRow(seat, admin?.picks ?? {});
  const body = (row: Row) => (
    <>
      {/* the mark leads the race as it leads a name line, and the MMR slot of the row stays empty */}
      {row.mmr == null ? (
        <TapTooltip content={noStatsWarning(row.race).text}>
          <Icon name="mdi-alert" size={14} className="text-error" />
          <span className="sr-only">{noStatsWarning(row.race).text}</span>
        </TapTooltip>
      ) : null}
      <RaceIcon raceIdentifier={row.race} />
      <span className="flex-1 truncate text-left">{raceName(row.race)}</span>
      {row.mmr != null ? <span className="tnum text-muted-foreground">{row.mmr}</span> : null}
    </>
  );
  return (
    <div className="mt-1 flex flex-col">
      {several && admin ? (
        <>
          <div id={labelId} className="pl-6 text-xs text-muted-foreground">
            Plays next as
          </div>
          <div role="radiogroup" aria-labelledby={labelId} className="flex flex-col">
            {rows.map((row: Row) => {
              const on = row.entrant_id === playing?.entrant_id;
              const who = `${seat.name}'s ${raceName(row.race)}`;
              return (
                <div key={row.entrant_id} className="flex items-center gap-1 border-t py-0.5 pl-6 pr-1 text-xs">
                  <button
                    type="button"
                    role="radio"
                    aria-checked={on}
                    className="flex min-w-0 flex-1 items-center gap-2 rounded py-0.5 hover:bg-muted"
                    onClick={() => admin.onPickRace(seat, row.entrant_id)}
                  >
                    <Icon name={on ? "mdi-radiobox-marked" : "mdi-radiobox-blank"} size={14} className={on ? "text-primary-text" : "text-muted-foreground"} />
                    {body(row)}
                  </button>
                  <MoveTo bracket={bracket} brackets={brackets} seat={seat} row={row} admin={admin} who={who} />
                  {removable ? (
                    <Button variant="ghost" size="icon-xs" className="text-error" disabled={admin.busy} aria-label={`Remove ${who}`} onClick={() => admin.onRemove([row.entrant_id])}>
                      <Icon name="mdi-close" />
                    </Button>
                  ) : null}
                </div>
              );
            })}
          </div>
        </>
      ) : several ? (
        rows.map((row: Row) => (
          <div key={row.entrant_id} className="flex items-center gap-2 border-t py-1 pl-6 pr-1 text-xs">
            {body(row)}
          </div>
        ))
      ) : null}
      {/* a race he left while another stays here reads in his seat, so he shows once on the card */}
      {left.map((row: Row) => (
        <div key={row.entrant_id} className="flex items-center gap-2 border-t py-0.5 pl-6 pr-1 text-xs text-muted-foreground">
          <span aria-hidden="true" className="flex opacity-(--v-medium-emphasis-opacity)">
            <RaceIcon raceIdentifier={row.race} />
          </span>
          <span className="min-w-0 flex-1 truncate">{raceName(row.race)} · left</span>
          {admin ? (
            <Button
              variant="ghost"
              size="xs"
              className="shrink-0"
              disabled={admin.busy}
              aria-label={`Put back, ${seat.name}'s ${raceName(row.race)}`}
              onClick={() => admin.onRestore([row.entrant_id])}
            >
              <Icon name="mdi-arrow-u-left-top" />
              Put back
            </Button>
          ) : null}
          {admin ? <EraseButton name={seat.name} rows={[row]} label={`${seat.name}'s ${raceName(row.race)}`} brackets={brackets} admin={admin} size="icon-xs" /> : null}
        </div>
      ))}
    </div>
  );
}

/** The throne: the standing king, the king from the last event while nobody has won tonight,
 *  or nobody at all. */
export function KingBlock({
  bracket,
  brackets,
  admin,
  dropping,
  onDropKing,
  onEnter,
}: {
  bracket: Row;
  brackets: Row[];
  admin?: BracketAdmin;
  dropping?: Row | null; // the seat being dragged while the throne stands empty, so the throne takes the drop
  onDropKing?: () => void;
  onEnter?: () => void; // the drag left the line for the throne, so the line shows its own order again
}) {
  const king: Row | null = bracket.king;
  const defender: Row | null = bracket.defender;
  const row = king ? seatRow(king, admin?.picks ?? {}) : null;
  // an empty throne after a fix or a step down goes back to the newest winner in one tap
  // a drag in progress offers one thing to do, so the one-tap crown waits for it to end
  const heir: Row | null = admin && !dropping ? heirOf(bracket) : null;
  const crownHeir = heir ? (
    <Button variant="outline" size="sm" className="mt-2 text-primary-text" disabled={admin!.busy} onClick={() => admin!.onCrown(bracket, heir.entrant_id)}>
      <Icon name="mdi-crown" />
      Crown {heir.name}
    </Button>
  ) : null;
  return (
    <div
      className={cn("min-h-[64px] shrink-0 p-4", dropping && "bg-primary/10 outline-2 -outline-offset-4 outline-dashed outline-primary-text")}
      onDragEnter={() => dropping && onEnter?.()}
      onDragOver={(event) => dropping && event.preventDefault()}
      onDrop={(event) => {
        if (!dropping) return;
        event.preventDefault();
        onDropKing?.();
      }}
    >
      <div className="flex items-start gap-3">
        <Icon name={king ? "mdi-crown" : "mdi-crown-outline"} size={26} className={king ? "text-primary-text" : "text-muted-foreground"} />
        {king ? (
          // a long name truncates, so it never runs under Step down or past the card
          <div className="min-w-0 flex-1 overflow-hidden [&_.name]:truncate [&_.player-name]:max-w-full">
            <BoardPlayer
              row={{ user_id: king.user_id, name: king.name, country: king.country, mmr: row?.mmr ?? null }}
              race={row?.race ?? null}
              warn={!!seatMark(king, row)}
            />
            <div className="text-xs text-muted-foreground">Holds the throne</div>
          </div>
        ) : defender ? (
          <div className="min-w-0 flex-1 overflow-hidden [&_.name]:truncate [&_.player-name]:max-w-full">
            <BoardPlayer row={defender} />
            <div className="text-xs text-muted-foreground">King from last event, defending</div>
            {crownHeir}
          </div>
        ) : (
          <div className="flex-1">
            <div className={dropping ? "font-medium text-primary-text" : "text-muted-foreground"}>{dropping ? `Drop here to make ${dropping.name} the king` : "No king yet"}</div>
            {crownHeir ? (
              <>
                {crownHeir}
                <div className="mt-1 text-xs text-muted-foreground">Won the newest series</div>
              </>
            ) : null}
          </div>
        )}
        {admin && king ? (
          <div className="flex shrink-0 flex-col items-end gap-1">
            <Button variant="ghost" size="sm" className="text-primary-text" disabled={admin.busy} onClick={() => admin.onStepDown(bracket)}>
              <Icon name="mdi-exit-to-app" />
              Step down
            </Button>
            {/* a king on several races moves one race at a time, from its own row */}
            {(king.rows ?? []).length === 1 ? <MoveTo bracket={bracket} brackets={brackets} seat={king} row={row} admin={admin} who={king.name} /> : null}
          </div>
        ) : null}
      </div>
      {/* the race rows run under the name and past the controls, so a race name keeps its room */}
      {king ? (
        <div className="pl-[38px]">
          <RaceRows seat={king} bracket={bracket} brackets={brackets} admin={admin} />
        </div>
      ) : null}
    </div>
  );
}

/** The series the bracket plays right now, or the one filled button that starts the next one. */
export function OpenSeries({ bracket, admin, you }: { bracket: Row; admin?: BracketAdmin; you?: number | null }) {
  const live: Row | null = bracket.open_series;
  if (live) {
    // both sides keep the mark slot while either wears the mark, so the flags line up where the second wraps
    const slot = live.side1.mmr == null || live.side2.mmr == null;
    // a side and its chip wrap as one, and a long name truncates; the reader's side takes its own line, so his chip never sits by "vs"
    const side = (one: Row) => {
      const mine = you != null && one.user_id === you;
      return (
        <span className={cn("flex min-w-0 max-w-full flex-wrap items-center gap-2 [&_.name]:truncate [&_.player-name]:max-w-full", mine && "basis-full")}>
          <BoardPlayer row={one} slot={slot} />
          {mine ? (
            <Badge className={cn(toneClass("info"), "shrink-0")}>
              <Icon name="mdi-play" />
              You are playing now
            </Badge>
          ) : null}
        </span>
      );
    };
    return (
      <div className="mx-4 mb-3 rounded-lg border p-3">
        <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <Icon name="mdi-play-circle-outline" size={16} />
          Now playing
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {side(live.side1)}
          <span className="text-xs text-muted-foreground">vs</span>
          {side(live.side2)}
        </div>
        {admin ? (
          <>
            <div className="mt-3 flex flex-col gap-2 min-[420px]:flex-row">
              {[live.side1, live.side2].map((side: Row, index: number) => (
                <Button key={side.entrant_id} className="flex-1" disabled={admin.busy} onClick={() => admin.onWin(bracket, (index + 1) as 1 | 2)}>
                  <Icon name="mdi-crown" />
                  {side.name} won
                </Button>
              ))}
            </div>
            <Button variant="ghost" size="sm" className="mt-2 text-error" disabled={admin.busy} onClick={() => admin.onCancelSeries(bracket)}>
              <Icon name="mdi-close" />
              Cancel this series
            </Button>
          </>
        ) : null}
      </div>
    );
  }
  if (!admin) return null;
  const picked = admin.picked.map((key) => seatOf(bracket, key)).filter(Boolean) as Row[];
  const start = startButton(bracket, picked);
  const skipped = skippedSeat(bracket);
  if (!start) return null;
  return (
    <div className="mx-4 mb-3">
      {/* two long names wrap to a second line instead of running out of the button */}
      <Button className="h-auto min-h-9 w-full whitespace-normal py-1.5 text-center" disabled={admin.busy} onClick={() => admin.onStart(bracket, start.pair)}>
        <Icon name="mdi-play" />
        {start.label}
      </Button>
      {start.note ? <p className="mt-1 mb-0 text-xs text-muted-foreground">{start.note}</p> : null}
      {skipped && picked.length !== 2 ? (
        <p className="mt-1 mb-0 text-xs text-muted-foreground">Skipped {skipped.name}, playing in another bracket.</p>
      ) : null}
      {picked.length === 2 ? (
        <p className="mt-1 mb-0 text-xs text-muted-foreground">
          Two players picked.{" "}
          <button type="button" className="text-primary-text underline" onClick={admin.onClearPick}>
            Clear the pick
          </button>
        </p>
      ) : null}
    </div>
  );
}

/** One place in the line: one PLAYER, the races he holds in this bracket under his name, and
 *  a mark while he is playing in another bracket. */
export function QueueRow({
  seat,
  place,
  bracket,
  brackets,
  admin,
  you,
  dragged,
  onDragged,
  onOver,
}: {
  seat: Row;
  place: number;
  bracket: Row;
  brackets: Row[];
  admin?: BracketAdmin;
  you?: number | null;
  dragged?: number | null;
  onDragged?: (key: number | null) => void;
  onOver?: (before: boolean) => void; // the dragged row passes over this one, in its upper or lower half
}) {
  const key = seatKey(seat) as number;
  // a bracket that plays a series draws no start button, so a pick on its line would do nothing
  const live = !!bracket.open_series;
  const picked = !!admin && !live && admin.picked.includes(key);
  const row = seatRow(seat, admin?.picks ?? {});
  const single = (seat.rows ?? []).length < 2;
  const queue: Row[] = bracket.queue ?? [];
  const at = queue.findIndex((one: Row) => seatKey(one) === key);
  const line = { user_id: seat.user_id, name: seat.name, country: seat.country, mmr: single ? (row?.mmr ?? null) : null };
  const mark = seatMark(seat, row);
  return (
    <li
      // an admin's row is a raised tile with a grip, so it reads as a thing to pick up and move
      className={cn(
        admin ? "cursor-grab rounded-md border bg-surface-bright active:cursor-grabbing hover:border-primary/60" : "border-t",
        picked && "bg-primary/10",
        dragged === key && "border-dashed border-primary opacity-50",
      )}
      draggable={!!admin}
      onDragStart={(event) => {
        event.dataTransfer.effectAllowed = "move";
        onDragged?.(key);
      }}
      // only a row of this card takes the drag, so a drag from another card moves nothing here
      onDragOver={(event) => {
        if (!admin || dragged == null) return;
        event.preventDefault();
        if (dragged === key) return;
        const box = event.currentTarget.getBoundingClientRect();
        onOver?.(event.clientY < box.top + box.height / 2);
      }}
      onDragEnd={() => onDragged?.(null)}
    >
      <div className="flex items-center gap-2 py-1.5 pl-1 pr-1">
        {admin ? <Icon name="mdi-drag-vertical" size={18} className="shrink-0 text-muted-foreground" /> : null}
        <span className="tnum w-4 shrink-0 text-right text-xs text-muted-foreground">{place}</span>
        {/* the name and the reader's chip wrap as one, so a long name keeps its room and pushes the chip under it */}
        <span className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1">
          {/* a long name truncates here, so the step buttons and Remove stay inside the card */}
          <span className="min-w-0 max-w-full grow overflow-hidden [&_.name]:truncate [&_.player-name]:max-w-full">
            {admin ? (
              <PlayerName
                player={{ id: seat.user_id, name: seat.name, country: seat.country }}
                race={single ? row?.race || undefined : undefined}
                mmr={single ? (row?.mmr ?? false) : false}
                // a row with no mark keeps no empty slot for one, so a narrow card leaves the name its room
                warning={mark ?? undefined}
                plain={live}
                onClick={live ? undefined : () => admin.onPickSeat(seat)}
              >
                {picked ? <><Icon name="mdi-check" size={16} className="text-primary-text" /><span className="sr-only">picked</span></> : null}
              </PlayerName>
            ) : (
              <BoardPlayer row={line} race={single ? (row?.race ?? null) : null} slot warn={!!mark} />
            )}
          </span>
          {you != null && seat.user_id === you ? (
            <Badge className={cn(toneClass("info"), "shrink-0")}>
              <Icon name="mdi-account-multiple" />
              {placeInQueue(bracket, you)}
            </Badge>
          ) : null}
        </span>
        {admin ? (
          <span className="ml-auto flex shrink-0 items-center gap-0.5">
            {single ? <MoveTo bracket={bracket} brackets={brackets} seat={seat} row={row} admin={admin} who={seat.name} compact /> : null}
            {/* up and down stack in one narrow column, the way a phone or a keyboard moves a row */}
            <span className="flex flex-col">
              <Button variant="ghost" size="icon-xs" className="h-3.5 pointer-coarse:h-6" disabled={at === 0} aria-label={`Move ${seat.name} up`} onClick={() => admin.onMove(bracket, at, at - 1)}>
                <Icon name="mdi-chevron-up" />
              </Button>
              <Button variant="ghost" size="icon-xs" className="h-3.5 pointer-coarse:h-6" disabled={at === queue.length - 1} aria-label={`Move ${seat.name} down`} onClick={() => admin.onMove(bracket, at, at + 1)}>
                <Icon name="mdi-chevron-down" />
              </Button>
            </span>
            <Button
              variant="ghost"
              size="icon-xs"
              className="text-error"
              disabled={admin.busy}
              aria-label={`Remove ${seat.name}`}
              onClick={() => admin.onRemove((seat.rows ?? []).map((one: Row) => one.entrant_id))}
            >
              <Icon name="mdi-close" />
            </Button>
          </span>
        ) : null}
      </div>
      {/* the chip sits on a line of its own, so the name keeps its room */}
      {seat.busy ? (
        <div className="flex flex-wrap items-center gap-2 pb-1 pl-6">
          <Badge variant="outline">
            <Icon name="mdi-play" />
            playing in another bracket
          </Badge>
        </div>
      ) : null}
      <RaceRows seat={seat} bracket={bracket} brackets={brackets} admin={admin} removable />
    </li>
  );
}

/** The quiet second step after a leave: deletes the signup of rows that left, after a confirm.
 *  A row that is a side of a series tonight stays on the record, so it draws an empty slot that
 *  keeps every "Put back" of the list in one column. */
function EraseButton({ name, rows, label, brackets, admin, size }: { name: string; rows: Row[]; label: string; brackets: Row[]; admin: BracketAdmin; size: "icon-xs" | "icon-sm" }) {
  if (rows.some((row: Row) => hasSeries({ brackets }, row.entrant_id))) return <span aria-hidden="true" className={cn("shrink-0", size === "icon-xs" ? "size-6" : "size-7")} />;
  return (
    <TapTooltip content="Delete signup">
      <Button variant="ghost" size={size} className="shrink-0 text-muted-foreground hover:text-error" disabled={admin.busy} aria-label={`Delete signup, ${label}`} onClick={() => admin.onErase(name, rows)}>
        <Icon name="mdi-delete-outline" />
      </Button>
    </TapTooltip>
  );
}

/** The players who left tonight and hold no place on the card, one row per player with the
 *  races he left on. An admin puts one back at the end of the line, on every one of them, or
 *  deletes his signup when none of them played a series tonight. */
export function LeftRows({ bracket, brackets, admin }: { bracket: Row; brackets: Row[]; admin?: BracketAdmin }) {
  const seats: Row[] = leftSeats(bracket);
  const [folded, fold] = useFolded(`${bracketLabel(brackets, bracket).name}:left`);
  const rowsId = useId();
  if (!seats.length) return null;
  return (
    <div className={cn("flex min-h-0 flex-col px-4", folded ? "pb-1" : "pb-2")}>
      <FoldHeading folded={folded} onFold={fold} controls={rowsId} className="py-1">
        <span className="text-sm font-medium text-foreground">Players who left</span>
        <span className="tnum text-xs text-muted-foreground">{seats.length}</span>
      </FoldHeading>
      <div id={rowsId} hidden={folded} className="min-h-0 overflow-y-auto">
      {/* the name fades, the mark keeps its strength: a player who left is still a player with no stats */}
      {seats.map((seat: Row) => (
        <div key={seatKey(seat)} className="flex items-center gap-2 border-t py-1 [&_.name]:opacity-(--v-medium-emphasis-opacity)">
          <span className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2">
            <BoardPlayer row={{ ...seat, mmr: null }} race={null} warn={(seat.rows ?? []).every((one: Row) => one.mmr == null)} />
            <span className="text-xs text-muted-foreground">{seat.rows.map((one: Row) => raceName(one.race)).filter(Boolean).join(", ")}</span>
          </span>
          {admin ? (
            <Button
              variant="ghost"
              size="sm"
              className="ml-auto shrink-0"
              disabled={admin.busy}
              aria-label={`Put back, ${seat.name}`}
              onClick={() => admin.onRestore(seat.rows.map((row: Row) => row.entrant_id))}
            >
              <Icon name="mdi-arrow-u-left-top" />
              Put back
            </Button>
          ) : null}
          {admin ? <EraseButton name={seat.name} rows={seat.rows} label={seat.name} brackets={brackets} admin={admin} size="icon-sm" /> : null}
        </div>
      ))}
      </div>
    </div>
  );
}

// The mark of what a result did to the crown; a game between two others leaves no mark
const CROWN_ICON: Record<string, string> = { moved: "mdi-crown", held: "mdi-shield-crown-outline" };

/** Tonight's results as a table, newest first: the series number in play order, the winner with the
 *  win mark, the loser, and what the result did to the crown, with a key under it. The run page adds
 *  a Fix column; a stream drops the replay link, because nobody clicks on a stream. */
export function PlayedTable({ played, total, admin, clean }: { played: Row[]; total: number; admin?: BracketAdmin; clean?: boolean }) {
  // a name truncates inside its cell, so a long one never pushes the crown or Fix out of the card
  const cell = "flex min-w-0 items-center gap-1.5 overflow-hidden [&_.name]:truncate [&_.player-name]:min-w-0 [&_.player-name]:max-w-full";
  const keys = (["moved", "held"] as const).filter((throne) => played.some((row) => row.throne === throne));
  return (
    <>
      <table className="w-full table-fixed border-collapse text-sm">
        <colgroup>
          <col className="w-6" />
          <col />
          <col />
          <col className="w-6" />
          {admin ? <col className="w-7" /> : null}
        </colgroup>
        <thead>
          <tr className="text-left text-xs text-muted-foreground">
            <th scope="col" className="pb-1 pr-1 text-right font-normal">#</th>
            <th scope="col" className="pb-1 pl-2 font-normal">Winner</th>
            <th scope="col" className="pb-1 pl-2 font-normal">Loser</th>
            <th scope="col" className="pb-1 font-normal">
              <span className="sr-only">Crown</span>
            </th>
            {admin ? (
              <th scope="col" className="pb-1 font-normal">
                <span className="sr-only">Fix</span>
              </th>
            ) : null}
          </tr>
        </thead>
        <tbody>
          {played.map((row: Row, index: number) => {
            const throne = throneWord(row);
            return (
              <tr key={row.series_id} className="border-t border-border/70">
                <td className="tnum py-1.5 pr-1 text-right text-xs text-muted-foreground">{total - index}</td>
                <td className="py-1.5 pl-2">
                  <span className={cell}>
                    <span className="h-2 w-2 shrink-0 rounded-[2px] bg-win" aria-hidden="true" />
                    {/* the queue shows each race; a result names the player, so the name keeps the cell */}
                    <BoardPlayer row={{ ...row.winner, mmr: null }} race={null} warn={false} />
                  </span>
                </td>
                <td className="py-1.5 pl-2">
                  <span className={cn(cell, "[&_.name]:opacity-(--v-medium-emphasis-opacity)")}>
                    <BoardPlayer row={{ ...row.loser, mmr: null }} race={null} warn={false} />
                    {/* the loser left the night, so no game was played */}
                    {row.forfeit ? (
                      <TapTooltip content="Forfeit: left the event" className="shrink-0">
                        <Icon name="mdi-flag-outline" size={14} className="text-muted-foreground" />
                        <span className="sr-only">Forfeit</span>
                      </TapTooltip>
                    ) : null}
                    {row.replay && !clean ? (
                      <Link href={`/series/${row.series_id}`} className="shrink-0 text-primary-text" aria-label={`Replay of series ${total - index}`}>
                        <Icon name="mdi-filmstrip" size={16} />
                      </Link>
                    ) : null}
                  </span>
                </td>
                <td className="py-1.5 text-center">
                  {throne ? (
                    <TapTooltip content={throne}>
                      <Icon name={CROWN_ICON[row.throne]} size={16} className="text-primary-text" />
                      <span className="sr-only">{throne}</span>
                    </TapTooltip>
                  ) : null}
                </td>
                {admin ? (
                  <td className="py-1.5 text-right">
                    <TapTooltip content="Fix this result">
                      <Button variant="ghost" size="icon-xs" className="text-primary-text" disabled={admin.busy} aria-label={`Fix ${row.winner?.name} beat ${row.loser?.name}`} onClick={() => admin.onFix(row)}>
                        <Icon name="mdi-pencil" />
                      </Button>
                    </TapTooltip>
                  </td>
                ) : null}
              </tr>
            );
          })}
        </tbody>
      </table>
      {keys.length ? (
        <p className="mb-0 mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
          {keys.map((throne) => (
            <span key={throne} className="inline-flex items-center gap-1">
              <Icon name={CROWN_ICON[throne]} size={14} className="text-primary-text" />
              {throneWord({ throne })}
            </span>
          ))}
        </p>
      ) : null}
    </>
  );
}

const foldListeners = new Set<() => void>();
const onFold = (listener: () => void) => {
  foldListeners.add(listener);
  return () => {
    foldListeners.delete(listener);
  };
};

/** Whether the viewer folded this part of a card away, and the writer for it. The server draws
 *  every part open, so the first paint is the page a browser with storage blocked reads. */
function useFolded(part: string) {
  const folded = useSyncExternalStore(onFold, () => foldedStored(part), () => false);
  const setFolded = (on: boolean) => {
    storeFolded(part, on);
    foldListeners.forEach((listener) => listener());
  };
  return [folded, setFolded] as const;
}

/** The heading of the queue or the results: a tap folds the part away, and opens it again. */
function FoldHeading({ folded, onFold, controls, className, children }: { folded: boolean; onFold: (on: boolean) => void; controls: string; className?: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      className={cn("flex items-baseline gap-2 rounded-sm text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50", className)}
      aria-expanded={!folded}
      aria-controls={controls}
      onClick={() => onFold(!folded)}
    >
      {children}
      <Icon name={folded ? "mdi-chevron-right" : "mdi-chevron-down"} className="self-center text-muted-foreground" />
    </button>
  );
}

/** One bracket of the night, the same card on the run page and on the public page: the throne,
 *  the series it plays now, the line waiting and what it played tonight. */
export function BracketCard({
  bracket,
  brackets,
  admin,
  you,
  clean,
}: {
  bracket: Row;
  brackets: Row[];
  admin?: BracketAdmin;
  you?: number | null;
  clean?: boolean; // the stream view reads from further away, so the card face grows
}) {
  const { name, band } = bracketLabel(brackets, bracket);
  const queue: Row[] = bracket.queue ?? [];
  const played: Row[] = bracket.played ?? [];
  // one card is dragged at a time, so the drag belongs to the card and not to the page; `over` is
  // where the dragged row would land, and the line shows it there before the drop
  const [dragged, setDragged] = useState<number | null>(null);
  const [over, setOver] = useState<number | null>(null);
  const [allPlayed, setAllPlayed] = useState(false);
  // a long line pushes the results off a stream, so either part folds away, per bracket
  const [queueFolded, foldQueue] = useFolded(`${name}:queue`);
  const [resultsFolded, foldResults] = useFolded(`${name}:results`);
  const queueId = useId();
  const resultsId = useId();
  const from = queue.findIndex((seat: Row) => seatKey(seat) === dragged);
  const shown: Row[] = from >= 0 && over != null ? movedQueue(queue, from, over) : queue;
  const drag = (key: number | null) => {
    setDragged(key);
    setOver(null);
  };
  // The row lands before or after the row under the pointer, by the half the pointer is in. The rows
  // around it keep their order, so a tall row sliding under the pointer never flips the place back.
  const landAt = (index: number, before: boolean) => {
    const at = shown.findIndex((seat: Row) => seatKey(seat) === dragged);
    const others = index - (at >= 0 && at < index ? 1 : 0);
    setOver(before ? others : others + 1);
  };
  // a stream shows the newest three, and the run page and the night page open the rest on a tap
  const PLAYED_SHOWN = 3;
  const playedShown = allPlayed ? played : played.slice(0, PLAYED_SHOWN);
  // a stream reads from further away, so every small label of the card grows one step too; a stream
  // is one fixed screen, so three cards side by side fill it to its foot whatever is folded, and the
  // queue and the players who left scroll inside, never the results. ponytail: 10.5rem is the shell bar and the title over the cards; a title that
  // wraps pushes the foot one line off screen, measure the card top if that happens
  return (
    <Card className={cn("card h-full gap-0 py-0", clean && "text-[1.0625rem] [&_.text-xs]:text-sm min-[960px]:h-[calc(100dvh-10.5rem)]")}>
      <CardHeader className={cn("flex shrink-0 items-center gap-2 banner bg-banner p-3", clean && "p-4")}>
        <CardTitle className={cn("flex-1 text-primary", clean && "text-[1.375rem]")}>{name}</CardTitle>
        <span className="tnum text-xs text-on-banner/80">{band}</span>
      </CardHeader>

      {/* a seat dragged up past the Start button onto an empty throne asks before it crowns */}
      <KingBlock
        bracket={bracket}
        brackets={brackets}
        admin={admin}
        dropping={admin && !bracket.king && from >= 0 ? queue[from] : null}
        onEnter={() => setOver(null)}
        onDropKing={() => {
          if (admin && from >= 0) admin.onAskCrown(bracket, queue[from]);
          drag(null);
        }}
      />
      <Separator className="shrink-0" />

      {/* the throne keeps its air: whatever comes first under the line stands 12 px off it */}
      <div className={cn("shrink-0 pt-3", queueFolded && "pb-2")}>
        <OpenSeries bracket={bracket} admin={admin} you={you} />
        <FoldHeading folded={queueFolded} onFold={foldQueue} controls={queueId} className="mx-4 mb-1">
          <span className="text-sm font-medium text-foreground">Queue</span>
          <span className="tnum text-xs text-muted-foreground">{queue.length} waiting</span>
        </FoldHeading>
      </div>
      <div id={queueId} hidden={queueFolded} className="min-h-0 overflow-y-auto">
      {queue.length ? (
        <ul
          className={cn("mb-3 flex flex-col px-3", admin && "gap-1.5")}
          // a drop anywhere on the line lands the row where it shows; the order is drawn before it saves
          onDragOver={(event) => admin && dragged != null && event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            if (admin && from >= 0 && over != null && over !== from) admin.onMove(bracket, from, over);
            drag(null);
          }}
        >
          {shown.map((seat: Row, index: number) => (
            <QueueRow
              key={seatKey(seat)}
              seat={seat}
              place={index + 1}
              bracket={bracket}
              brackets={brackets}
              admin={admin}
              you={you}
              dragged={dragged}
              onDragged={drag}
              onOver={(before) => landAt(index, before)}
            />
          ))}
        </ul>
      ) : (
        <p className="mb-3 px-4 text-sm text-muted-foreground">Nobody signed up yet</p>
      )}

      {/* who left the line can still be put back, so the rows stay with the queue, above the rule */}
      </div>
      <LeftRows bracket={bracket} brackets={brackets} admin={admin} />

      {/* a gold rule ends the work and opens the record: tonight's results in a sunken band; an admin
          sees it with no result yet, so a night's history can be entered from the start */}
      {played.length || admin ? (
        <div className="shrink-0 border-t-2 border-primary-text bg-background/70 px-4 pb-3 pt-2.5">
          <div className="flex items-center gap-2 pb-1.5">
            <h3 className="m-0">
              <FoldHeading folded={resultsFolded} onFold={foldResults} controls={resultsId}>
                <span className="font-heading text-base font-bold text-primary-text">Results</span>
                <span className="tnum font-sans text-xs font-normal text-muted-foreground">{played.length} series</span>
              </FoldHeading>
            </h3>
            {admin ? (
              <Button variant="ghost" size="xs" className="ml-auto text-primary-text" disabled={admin.busy} onClick={() => admin.onAddResult(bracket)}>
                <Icon name="mdi-plus" />
                Add result
              </Button>
            ) : null}
          </div>
          <div id={resultsId} hidden={resultsFolded}>
            {played.length ? <PlayedTable played={playedShown} total={played.length} admin={admin} clean={clean} /> : <p className="m-0 text-sm text-muted-foreground">No results yet</p>}
            {played.length > PLAYED_SHOWN && !clean ? (
              <Button variant="ghost" size="xs" className="mt-1 text-primary-text" aria-expanded={allPlayed} onClick={() => setAllPlayed(!allPlayed)}>
                <Icon name={allPlayed ? "mdi-chevron-up" : "mdi-chevron-down"} />
                {allPlayed ? "Show fewer" : `Show all ${played.length} series`}
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}
    </Card>
  );
}

export default BracketCard;
