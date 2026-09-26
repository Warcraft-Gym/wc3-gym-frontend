"use client";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Icon } from "@/components/ui/Icon";
import { TapTooltip } from "@/components/ui/TapTooltip";
import { MARK, SIDE } from "@/components/SeriesBox";
import { orderedBrackets } from "@/helpers/koth-board.mjs";
import { cn } from "@/lib/utils";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>;

const INFERRED = "Inferred from the play order";

/** The marks a reader needs once for the whole night, as the stage legend draws them. */
function Legend() {
  const bar = (tone: string, label: string) => (
    <span className="inline-flex items-center gap-1.5">
      <i className={cn("h-3.5 w-[3px] rounded-[2px]", tone)} />
      {label}
    </span>
  );
  const crown = (name: string, tone: string, label: string) => (
    <span className="inline-flex items-center gap-1">
      <Icon name={name} size={14} className={tone} />
      {label}
    </span>
  );
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
      {bar("bg-win", "Won")}
      {bar("bg-loss", "Lost")}
      {bar("bg-draw", "No result")}
      {crown("mdi-crown", "text-primary-text", "Recorded winner")}
      {crown("mdi-crown-outline", "text-muted-foreground", "Inferred winner")}
    </div>
  );
}

/** One BO1 as a bracket box: a result bar per side, and the winner in bold under a crown. */
function HistorySeries({ row }: { row: Row }) {
  const inferred = !row.winner_side && !!row.inferred_winner_side;
  const winner: number | null = row.winner_side ?? row.inferred_winner_side ?? null;
  const side = (n: number): Row => (n === 1 ? row.side1 : row.side2);
  const tone = (n: number) => (winner === null ? "bg-draw" : winner === n ? "bg-win" : "bg-loss");
  const outcome = winner
    ? `${side(winner).name} won${inferred ? `, ${INFERRED.toLowerCase()}` : ""}`
    : row.forfeit ? "forfeit" : "no result";
  return (
    <li className="flex items-start gap-2">
      <span className="tnum w-5 shrink-0 pt-1 text-right text-xs text-muted-foreground">{row.sequence}</span>
      <div role="group" aria-label={`${row.side1.name} vs ${row.side2.name}, ${outcome}`} className="min-w-0 flex-1 overflow-hidden rounded border bg-surface">
        {[1, 2].map((n) => (
          <div key={n} className={cn(SIDE, n === 2 && "border-t", winner === n && "font-bold")}>
            <span className={cn(MARK, tone(n))} />
            {/* an archived name has no account, flag or race yet, so it is the written name alone */}
            <span className="min-w-0 truncate">{side(n).name}</span>
            <span className="ml-auto flex shrink-0 items-center">
              {winner === n ? (
                <TapTooltip content={inferred ? INFERRED : "Recorded result"}>
                  <Icon name={inferred ? "mdi-crown-outline" : "mdi-crown"} size={14} className={inferred ? "text-muted-foreground" : "text-primary-text"} />
                </TapTooltip>
              ) : null}
              {/* a series with no result states why once, on its first side */}
              {n === 1 && !winner && row.forfeit ? <span className="text-xs font-normal text-muted-foreground">Forfeit</span> : null}
              {n === 1 && !winner && row.review_note ? (
                <TapTooltip content={row.review_note}>
                  <Icon name="mdi-information-outline" size={14} className="text-muted-foreground" />
                </TapTooltip>
              ) : null}
            </span>
          </div>
        ))}
      </div>
    </li>
  );
}

/** One bracket of an archived night: its king, then every series in the order it was played. */
function HistoricalBracket({ bracket }: { bracket: Row }) {
  const history: Row[] = bracket.history ?? [];
  return (
    <Card className="card h-full gap-0 py-0">
      <CardHeader className="bg-primary p-3">
        <CardTitle className="text-on-primary">{bracket.name}</CardTitle>
      </CardHeader>
      <div className="flex items-center gap-2 border-b px-3 py-2.5">
        <Icon name="mdi-crown" size={20} className={bracket.historical_king ? "text-primary-text" : "text-muted-foreground"} />
        {bracket.historical_king ? (
          <span className="min-w-0 truncate font-bold">{bracket.historical_king.name}</span>
        ) : <span className="text-sm text-muted-foreground">King not recorded</span>}
      </div>
      <ol className="flex flex-col gap-1.5 p-3" aria-label={`${bracket.name}, series in play order`}>
        {history.map((row: Row) => <HistorySeries key={row.series_id} row={row} />)}
      </ol>
    </Card>
  );
}

/** A complete archived night, shared by the public event and the run page. */
export function HistoricalBoard({ board }: { board: Row }) {
  const brackets: Row[] = orderedBrackets(board);
  return (
    <section className="mt-4 space-y-3" aria-label="KOTH results">
      {board.videos?.length ? (
        <div className="flex flex-wrap gap-3" aria-label="Event videos">
          {board.videos.map((video: Row) => <a key={video.id} href={video.url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary-text underline">{video.title || "Watch event video"}</a>)}
        </div>
      ) : null}
      <Legend />
      <div className="grid gap-4 min-[960px]:grid-cols-3">
        {brackets.map((bracket: Row) => <HistoricalBracket key={bracket.division_id} bracket={bracket} />)}
      </div>
    </section>
  );
}
