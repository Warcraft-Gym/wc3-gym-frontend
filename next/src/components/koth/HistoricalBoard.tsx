"use client";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Icon } from "@/components/ui/Icon";
import { TapTooltip } from "@/components/ui/TapTooltip";
import { orderedBrackets } from "@/helpers/koth-board.mjs";
import { cn } from "@/lib/utils";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>;

const INFERRED = "Inferred from the play order";

/** An archived name is the written name alone: no account, flag, race, rating mark or link yet. */
const Name = ({ side, bold }: { side: Row; bold?: boolean }) => <span className={cn("min-w-0 truncate", bold && "font-bold")}>{side.name}</span>;

/** One BO1 in the form the live card gives a played series: the winner beat the loser, no score.
 *  A winner the play order infers wears a grey crown that says so; a recorded one needs no mark. */
function HistoryRow({ row }: { row: Row }) {
  const winner: number | null = row.winner_side ?? row.inferred_winner_side ?? null;
  const inferred = !row.winner_side && !!row.inferred_winner_side;
  const [first, second] = winner === 2 ? [row.side2, row.side1] : [row.side1, row.side2];
  // the draw square and "vs" already say a result is unknown, so the only word is the forfeit
  const why = !winner && row.forfeit ? "Forfeit" : null;
  const label = winner ? `${first.name} beat ${second.name}${inferred ? `, ${INFERRED.toLowerCase()}` : ""}` : `${first.name} vs ${second.name}, ${why ?? "no result"}`;
  return (
    <div role="group" aria-label={label} className="flex flex-wrap items-center gap-x-2 gap-y-1 border-t py-1">
      <span className={cn("h-2.5 w-2.5 shrink-0 rounded-[2px]", winner ? "bg-win" : "bg-draw")} aria-hidden="true" />
      <Name side={first} />
      <span className="text-xs text-muted-foreground">{winner ? "beat" : "vs"}</span>
      <Name side={second} />
      <span className="ml-auto flex shrink-0 items-center gap-1">
        {why ? <span className="text-xs text-muted-foreground">{why}</span> : null}
        {inferred ? (
          <TapTooltip content={INFERRED}>
            <Icon name="mdi-crown" size={16} className="text-muted-foreground" />
            <span className="sr-only">{INFERRED}</span>
          </TapTooltip>
        ) : null}
        {row.review_note ? (
          <TapTooltip content={row.review_note}>
            <Icon name="mdi-information-outline" size={16} className="text-muted-foreground" />
            <span className="sr-only">{row.review_note}</span>
          </TapTooltip>
        ) : null}
      </span>
    </div>
  );
}

/** One bracket of an archived night, drawn as the live card draws a closed one: the throne,
 *  then what it played. */
function HistoricalBracket({ bracket }: { bracket: Row }) {
  const king: Row | null = bracket.historical_king;
  const history: Row[] = bracket.history ?? [];
  return (
    <Card className="card h-full gap-0 py-0">
      <CardHeader className="bg-primary p-3">
        <CardTitle className="text-on-primary">{bracket.name}</CardTitle>
      </CardHeader>
      <div className="flex min-h-[64px] items-start gap-3 p-4">
        <Icon name={king ? "mdi-crown" : "mdi-crown-outline"} size={26} className={king ? "text-primary-text" : "text-muted-foreground"} />
        <div className="min-w-0 flex-1">
          {king ? <Name side={king} bold /> : null}
          <div className="text-xs text-muted-foreground">{king ? "Held the throne at the end" : "No king recorded"}</div>
        </div>
      </div>
      {history.length ? (
        <div className="px-4 pb-3">
          <div className="flex items-baseline gap-2 pb-1">
            <span className="text-xs font-medium text-muted-foreground">Played</span>
            <span className="tnum text-xs text-muted-foreground">{history.length} series</span>
          </div>
          {history.map((row: Row) => <HistoryRow key={row.series_id} row={row} />)}
        </div>
      ) : null}
    </Card>
  );
}

/** A complete archived night, shared by the public event and the run page. */
export function HistoricalBoard({ board }: { board: Row }) {
  const brackets: Row[] = orderedBrackets(board);
  return (
    <section className="mt-4 space-y-3" aria-label="KOTH results">
      {board.videos?.length ? (
        <div className="flex flex-wrap gap-2" aria-label="Event videos">
          {board.videos.map((video: Row) => (
            <Badge key={video.id} variant="outline" render={<a href={video.url} target="_blank" rel="noopener noreferrer" />}>
              <Icon name="mdi-youtube" />
              {video.title || "Event video"}
            </Badge>
          ))}
        </div>
      ) : null}
      <div className="grid gap-4 min-[960px]:grid-cols-3">
        {brackets.map((bracket: Row) => <HistoricalBracket key={bracket.division_id} bracket={bracket} />)}
      </div>
    </section>
  );
}
