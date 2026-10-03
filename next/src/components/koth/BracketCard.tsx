"use client";
import { useId, useState } from "react";
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
import { bracketLabel, hasSeries, leftSeats, placeInQueue, seatKey, seatLeft, seatRow, skippedSeat, startButton, throneWord } from "@/helpers/koth-board.mjs";
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
  onMove: (bracket: Row, from: number, to: number) => void;
  onMoveBracket: (bracket: Row, seat: Row, entrantId: number, divisionId: number) => void; // one race row to another bracket
  onRemove: (entrantIds: number[]) => void; // one race row, or every race the player holds here
  onRestore: (entrantIds: number[]) => void; // one race row, or every race the player left on
  onErase: (name: string, rows: Row[]) => void; // takes rows that left off the record of the night, after a confirm
  onFix: (played: Row) => void; // opens the dialog that turns a result around or removes the series
};

export const raceName = (race?: string | null) => (race ? raceWrapper.getRaceObject(race)?.name || race : "");

/** "Move to": the other brackets of the night, by name, for one race row. */
function MoveTo({ bracket, brackets, seat, row, admin, who }: { bracket: Row; brackets: Row[]; seat: Row; row: Row | null; admin: BracketAdmin; who: string }) {
  const others = brackets.filter((one: Row) => one.division_id !== bracket.division_id);
  if (!row || !others.length) return null;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="outline" size="xs" className="shrink-0" disabled={admin.busy} aria-label={`Move to, ${who}`} />}>
        Move to
      </DropdownMenuTrigger>
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
  // only a line in a column of player lines keeps the empty mark slot, so its flags read as one column
  return (
    <PlayerName
      player={{ id: row.user_id ?? null, name: row.name, country: row.country }}
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
          <span className="min-w-0 flex-1 truncate">{raceName(row.race)} · left tonight</span>
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
export function KingBlock({ bracket, brackets, admin }: { bracket: Row; brackets: Row[]; admin?: BracketAdmin }) {
  const king: Row | null = bracket.king;
  const defender: Row | null = bracket.defender;
  const row = king ? seatRow(king, admin?.picks ?? {}) : null;
  return (
    <div className="min-h-[64px] p-4">
      <div className="flex items-start gap-3">
        <Icon name={king ? "mdi-crown" : "mdi-crown-outline"} size={26} className={king ? "text-primary-text" : "text-muted-foreground"} />
        {king ? (
          <div className="min-w-0 flex-1">
            <BoardPlayer
              row={{ user_id: king.user_id, name: king.name, country: king.country, mmr: row?.mmr ?? null }}
              race={row?.race ?? null}
              warn={!!seatMark(king, row)}
            />
            <div className="text-xs text-muted-foreground">Holds the throne</div>
          </div>
        ) : defender ? (
          <div className="min-w-0 flex-1">
            <BoardPlayer row={defender} />
            <div className="text-xs text-muted-foreground">King from last event, defending</div>
          </div>
        ) : (
          <div className="flex-1 text-muted-foreground">No king yet</div>
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
      <Button className="w-full" disabled={admin.busy} onClick={() => admin.onStart(bracket, start.pair)}>
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
}: {
  seat: Row;
  place: number;
  bracket: Row;
  brackets: Row[];
  admin?: BracketAdmin;
  you?: number | null;
  dragged?: number | null;
  onDragged?: (key: number | null) => void;
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
      className={cn("border-t", picked && "bg-primary/10", dragged === key && "opacity-40")}
      draggable={!!admin && !admin.busy}
      onDragStart={() => onDragged?.(key)}
      // only a row of this card takes the drop, so a drag from another card shows no drop
      onDragOver={(event) => admin && dragged != null && event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault();
        // a drop while a write runs would start a second one, so the row waits for the answer
        if (admin && !admin.busy && dragged != null && dragged !== key) admin.onMove(bracket, queue.findIndex((one: Row) => seatKey(one) === dragged), at);
        onDragged?.(null);
      }}
      onDragEnd={() => onDragged?.(null)}
    >
      <div className="flex items-center gap-2 py-1 pl-1 pr-1">
        {admin ? <Icon name="mdi-drag-horizontal-variant" size={16} className="shrink-0 cursor-grab text-muted-foreground" /> : null}
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
                warning={mark}
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
          <span className="ml-auto flex shrink-0 items-center">
            <Button variant="ghost" size="icon-xs" disabled={admin.busy || at === 0} aria-label={`Move ${seat.name} up`} onClick={() => admin.onMove(bracket, at, at - 1)}>
              <Icon name="mdi-chevron-up" />
            </Button>
            <Button variant="ghost" size="icon-xs" disabled={admin.busy || at === queue.length - 1} aria-label={`Move ${seat.name} down`} onClick={() => admin.onMove(bracket, at, at + 1)}>
              <Icon name="mdi-chevron-down" />
            </Button>
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
      {/* the chip and a one-race seat's Move to sit on a line of their own, so the name keeps its room */}
      {seat.busy || (admin && single) ? (
        <div className="flex flex-wrap items-center gap-2 pb-1 pl-6">
          {seat.busy ? (
            <Badge variant="outline">
              <Icon name="mdi-play" />
              playing in another bracket
            </Badge>
          ) : null}
          {admin && single ? <MoveTo bracket={bracket} brackets={brackets} seat={seat} row={row} admin={admin} who={seat.name} /> : null}
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
  if (!seats.length) return null;
  return (
    <div className="px-4 pb-2">
      <div className="py-1 text-xs font-medium text-muted-foreground">Left tonight</div>
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
  );
}

/** One series the bracket played tonight: the winner beat the loser, and the crown says what
 *  the throne did. A best of one carries no score worth printing. */
export function PlayedRow({ played, admin, clean }: { played: Row; admin?: BracketAdmin; clean?: boolean }) {
  const throne = throneWord(played);
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 border-t py-1">
      <span className="h-2.5 w-2.5 shrink-0 rounded-[2px] bg-win" aria-hidden="true" />
      <BoardPlayer row={played.winner} />
      <span className="text-xs text-muted-foreground">beat</span>
      <BoardPlayer row={played.loser} />
      {/* the loser left the night, so no game was played */}
      {played.forfeit ? <span className="text-xs text-muted-foreground">Forfeit</span> : null}
      <span className="ml-auto flex shrink-0 items-center gap-1">
        {throne ? (
          <TapTooltip content={throne}>
            <Icon name="mdi-crown" size={16} className="text-primary-text" />
            <span className="sr-only">{throne}</span>
          </TapTooltip>
        ) : null}
        {/* nobody clicks a link on a stream, so the clean view drops the chip */}
        {played.replay && !clean ? (
          <Badge variant="outline" render={<Link href={`/series/${played.series_id}`} />}>
            <Icon name="mdi-filmstrip" />
            Replay
          </Badge>
        ) : null}
        {admin ? (
          <Button variant="outline" size="xs" disabled={admin.busy} aria-label={`Fix ${played.winner?.name} beat ${played.loser?.name}`} onClick={() => admin.onFix(played)}>
            <Icon name="mdi-pencil" />
            Fix
          </Button>
        ) : null}
      </span>
    </div>
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
  // one card is dragged at a time, so the drag belongs to the card and not to the page
  const [dragged, setDragged] = useState<number | null>(null);
  // a stream reads from further away, so every small label of the card grows one step too
  return (
    <Card className={cn("card h-full gap-0 py-0", clean && "text-[1.0625rem] [&_.text-xs]:text-sm")}>
      <CardHeader className={cn("flex items-center gap-2 banner bg-banner p-3", clean && "p-4")}>
        <CardTitle className={cn("flex-1 text-primary", clean && "text-[1.375rem]")}>{name}</CardTitle>
        <span className="tnum text-xs text-on-banner/80">{band}</span>
      </CardHeader>

      <KingBlock bracket={bracket} brackets={brackets} admin={admin} />
      <Separator />

      {/* the throne keeps its air: whatever comes first under the line stands 12 px off it */}
      <div className="pt-3">
        <OpenSeries bracket={bracket} admin={admin} you={you} />
        <div className="flex items-baseline gap-2 px-4 pb-1">
          <span className="text-xs font-medium text-muted-foreground">Queue</span>
          <span className="tnum text-xs text-muted-foreground">{queue.length} waiting</span>
        </div>
      </div>
      {queue.length ? (
        <ul className="mb-2 flex flex-col px-3">
          {queue.map((seat: Row, index: number) => (
            <QueueRow
              key={seatKey(seat)}
              seat={seat}
              place={index + 1}
              bracket={bracket}
              brackets={brackets}
              admin={admin}
              you={you}
              dragged={dragged}
              onDragged={setDragged}
            />
          ))}
        </ul>
      ) : (
        <p className="mb-2 px-4 text-sm text-muted-foreground">Nobody signed up yet</p>
      )}

      <LeftRows bracket={bracket} brackets={brackets} admin={admin} />

      {played.length ? (
        <div className="px-4 pb-3">
          <div className="flex items-baseline gap-2 pb-1">
            <span className="text-xs font-medium text-muted-foreground">Played tonight</span>
            <span className="tnum text-xs text-muted-foreground">{played.length} series</span>
          </div>
          {played.map((row: Row) => (
            <PlayedRow key={row.series_id} played={row} admin={admin} clean={clean} />
          ))}
        </div>
      ) : null}
    </Card>
  );
}

export default BracketCard;
