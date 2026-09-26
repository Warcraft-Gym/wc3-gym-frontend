"use client";
import { useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Icon } from "@/components/ui/Icon";
import { Separator } from "@/components/ui/separator";
import { TapTooltip } from "@/components/ui/TapTooltip";
import { toneClass } from "@/components/ui/tone";
import { PlayerName } from "@/components/PlayerName";
import { RaceIcon } from "@/components/RaceIcon";
import { noStatsWarning } from "@/helpers/games-rule.mjs";
import { bracketLabel, leftSeats, placeInQueue, seatKey, seatRow, skippedSeat, startButton, throneWord } from "@/helpers/koth-board.mjs";
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
  onRemove: (seat: Row) => void;
  onRestore: (entrantIds: number[]) => void; // every race row the player left on
  onChangeWinner: (played: Row) => void;
  onAddReplay: (played: Row) => void;
  onAddPlayer: () => void;
};

const raceName = (race?: string | null) => (race ? raceWrapper.getRaceObject(race)?.name || race : "");

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

/** The races one player holds in this bracket, under his name. An admin picks the one that
 *  goes into the next series; a reader sees the ratings alone. */
function RaceRows({ seat, admin }: { seat: Row; admin?: BracketAdmin }) {
  const rows: Row[] = seat.rows ?? [];
  if (rows.length < 2) return null;
  const playing = seatRow(seat, admin?.picks ?? {});
  return (
    <div className="mt-1 flex flex-col">
      {rows.map((row: Row) => {
        const on = row.entrant_id === playing?.entrant_id;
        const body = (
          <>
            {admin ? <Icon name={on ? "mdi-check-circle" : "mdi-circle-outline"} size={14} className={on ? "text-primary-text" : "text-muted-foreground"} /> : null}
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
        return admin ? (
          <button
            key={row.entrant_id}
            type="button"
            aria-pressed={on}
            className="flex items-center gap-2 border-t py-1 pl-6 pr-1 text-xs hover:bg-muted"
            onClick={() => admin.onPickRace(seat, row.entrant_id)}
          >
            {body}
          </button>
        ) : (
          <div key={row.entrant_id} className="flex items-center gap-2 border-t py-1 pl-6 pr-1 text-xs">
            {body}
          </div>
        );
      })}
    </div>
  );
}

/** The throne: the standing king, the king from the last event while nobody has won tonight,
 *  or nobody at all. */
export function KingBlock({ bracket, admin }: { bracket: Row; admin?: BracketAdmin }) {
  const king: Row | null = bracket.king;
  const defender: Row | null = bracket.defender;
  const row = king ? seatRow(king, admin?.picks ?? {}) : null;
  return (
    <div className="flex min-h-[64px] items-start gap-3 p-4">
      <Icon name={king ? "mdi-crown" : "mdi-crown-outline"} size={26} className={king ? "text-primary-text" : "text-muted-foreground"} />
      {king ? (
        <div className="min-w-0 flex-1">
          <BoardPlayer
            row={{ user_id: king.user_id, name: king.name, country: king.country, mmr: row?.mmr ?? null }}
            race={row?.race ?? null}
            warn={!!seatMark(king, row)}
          />
          <div className="text-xs text-muted-foreground">Holds the throne</div>
          <RaceRows seat={king} admin={admin} />
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
        <Button variant="ghost" size="sm" className="shrink-0 text-primary-text" disabled={admin.busy} onClick={() => admin.onStepDown(bracket)}>
          <Icon name="mdi-exit-to-app" />
          Step down
        </Button>
      ) : null}
    </div>
  );
}

/** The series the bracket plays right now, or the one filled button that starts the next one. */
export function OpenSeries({ bracket, admin }: { bracket: Row; admin?: BracketAdmin }) {
  const live: Row | null = bracket.open_series;
  if (live) {
    // both sides keep the mark slot while either wears the mark, so the flags line up where the second wraps
    const slot = live.side1.mmr == null || live.side2.mmr == null;
    return (
      <div className="mx-4 mb-3 rounded-lg border p-3">
        <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <Icon name="mdi-play-circle-outline" size={16} />
          Now playing
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <BoardPlayer row={live.side1} slot={slot} />
          <span className="text-xs text-muted-foreground">vs</span>
          <BoardPlayer row={live.side2} slot={slot} />
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
  admin,
  you,
  dragged,
  onDragged,
}: {
  seat: Row;
  place: number;
  bracket: Row;
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
      onDragOver={(event) => admin && event.preventDefault()}
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
        {/* a long name truncates here, so the step buttons and Remove stay inside the card */}
        <span className="min-w-0 flex-1 overflow-hidden [&_.name]:truncate [&_.player-name]:max-w-full">
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
        {admin ? (
          <span className="ml-auto flex shrink-0 items-center">
            <Button variant="ghost" size="icon-xs" disabled={admin.busy || at === 0} aria-label={`Move ${seat.name} up`} onClick={() => admin.onMove(bracket, at, at - 1)}>
              <Icon name="mdi-chevron-up" />
            </Button>
            <Button variant="ghost" size="icon-xs" disabled={admin.busy || at === queue.length - 1} aria-label={`Move ${seat.name} down`} onClick={() => admin.onMove(bracket, at, at + 1)}>
              <Icon name="mdi-chevron-down" />
            </Button>
            <Button variant="ghost" size="icon-xs" className="text-error" disabled={admin.busy} aria-label={`Remove ${seat.name}`} onClick={() => admin.onRemove(seat)}>
              <Icon name="mdi-close" />
            </Button>
          </span>
        ) : null}
      </div>
      {/* the chip takes a line of its own, at the indent of the race rows, so no control leaves the card */}
      {seat.busy ? (
        <div className="pb-1 pl-6">
          <Badge variant="outline">
            <Icon name="mdi-play" />
            playing in another bracket
          </Badge>
        </div>
      ) : null}
      <RaceRows seat={seat} admin={admin} />
    </li>
  );
}

/** The players who left tonight, one row per player. An admin puts one back at the end of the
 *  line, on every race he held here. */
export function LeftRows({ bracket, admin }: { bracket: Row; admin?: BracketAdmin }) {
  const seats: Row[] = leftSeats(bracket);
  if (!seats.length) return null;
  return (
    <div className="px-4 pb-2">
      <div className="py-1 text-xs font-medium text-muted-foreground">Left tonight</div>
      {/* the name fades, the mark keeps its strength: a player who left is still a player with no stats */}
      {seats.map((seat: Row) => (
        <div key={seatKey(seat)} className="flex items-center gap-2 border-t py-1 [&_.name]:opacity-(--v-medium-emphasis-opacity)">
          <BoardPlayer row={seat} warn={(seat.rows ?? []).every((one: Row) => one.mmr == null)} />
          {admin ? (
            <Button
              variant="ghost"
              size="sm"
              className="ml-auto shrink-0"
              disabled={admin.busy}
              onClick={() => admin.onRestore(seat.rows.map((row: Row) => row.entrant_id))}
            >
              <Icon name="mdi-arrow-u-left-top" />
              Put back
            </Button>
          ) : null}
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
          <>
            {played.replay ? null : (
              <TapTooltip content="Add replay">
                <Button variant="ghost" size="icon-xs" disabled={admin.busy} aria-label="Add replay" onClick={() => admin.onAddReplay(played)}>
                  <Icon name="mdi-upload" />
                </Button>
              </TapTooltip>
            )}
            <TapTooltip content="Change the winner">
              <Button variant="ghost" size="icon-xs" disabled={admin.busy} aria-label="Change the winner" onClick={() => admin.onChangeWinner(played)}>
                <Icon name="mdi-swap-horizontal" />
              </Button>
            </TapTooltip>
          </>
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
  if (bracket.historical) return <HistoricalBracket bracket={bracket} />;
  // a stream reads from further away, so every small label of the card grows one step too
  return (
    <Card className={cn("card h-full gap-0 py-0", clean && "text-[1.0625rem] [&_.text-xs]:text-sm")}>
      <CardHeader className={cn("flex items-center gap-2 bg-primary p-3", clean && "p-4")}>
        <CardTitle className={cn("flex-1 text-on-primary", clean && "text-[1.375rem]")}>{name}</CardTitle>
        <span className="tnum text-xs text-on-primary/80">{band}</span>
      </CardHeader>

      <KingBlock bracket={bracket} admin={admin} />
      <Separator />

      {/* the throne keeps its air: whatever comes first under the line stands 12 px off it */}
      <div className="pt-3">
        <OpenSeries bracket={bracket} admin={admin} />
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

      <LeftRows bracket={bracket} admin={admin} />

      {admin ? (
        <div className="px-4 pb-3">
          <Button variant="outline" size="sm" className="text-primary-text" disabled={admin.busy} onClick={() => admin.onAddPlayer()}>
            <Icon name="mdi-account-plus" />
            Add player
          </Button>
        </div>
      ) : null}

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

/** Historical pairings keep their source order and never imply a missing result. */
function HistoricalBracket({ bracket }: { bracket: Row }) {
  const history: Row[] = bracket.history ?? [];
  return (
    <Card className="card h-full gap-0 py-0">
      <CardHeader className="bg-primary p-3">
        <CardTitle className="text-on-primary">{bracket.name}</CardTitle>
      </CardHeader>
      <div className="flex flex-wrap items-center gap-2 border-b p-3">
        <Icon name="mdi-crown-outline" className="text-primary-text" />
        {bracket.historical_king ? (
          <><span className="text-sm text-muted-foreground">Reported king</span><BoardPlayer row={bracket.historical_king} plain warn={false} /></>
        ) : <span className="text-sm text-muted-foreground">King not recorded</span>}
      </div>
      <p className="px-3 pt-3 text-xs text-muted-foreground">{history.length} BO1 series · Source order</p>
      <ol className="px-3 pb-3">
        {history.map((row: Row) => (
          <li key={row.series_id} data-history-series={row.series_id} className="flex flex-wrap items-center gap-x-2 gap-y-1 border-b py-3 last:border-0">
            <span className="tnum text-xs text-muted-foreground">{row.sequence}.</span>
            <BoardPlayer row={row.side1} plain warn={false} />
            <span className="text-xs text-muted-foreground">vs.</span>
            <BoardPlayer row={row.side2} plain warn={false} />
            <span className="basis-full pl-5 text-xs text-muted-foreground">
              {row.winner_side ? `Winner: ${row.winner_side === 1 ? row.side1.name : row.side2.name}` : "Result not recorded"}
            </span>
          </li>
        ))}
      </ol>
    </Card>
  );
}

export default BracketCard;
