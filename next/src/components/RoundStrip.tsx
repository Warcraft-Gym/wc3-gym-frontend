"use client";
import { useState } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { PlayerName } from "@/components/PlayerName";
import { markText, roundMarks, seriesHead, stripLabel, stripRecord } from "@/helpers/round-strip.mjs";
import { getW3CMMR } from "@/helpers/w3c-stats";
import { cn } from "@/lib/utils";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>;
type Mark = { round: number; state: string; series: Row[] };
// The helpers are plain JS, so their defaults type the parameters; the seam names the real shapes.
const roundMarks_ = roundMarks as (series: Row[], playerId: number, roundCount: number) => Mark[];
const seriesHead_ = seriesHead as (round: number, one: Row) => string;
const markText_ = markText as (mark: Mark) => string;
const stripLabel_ = stripLabel as (marks: Mark[]) => string;
const stripRecord_ = stripRecord as (marks: Mark[]) => { wins: number; losses: number; played: number };

// One square per round: won, lost, one of each, a series still to play, or no series
const ROUND: Record<string, string> = {
  none: "bg-border",
  won: "bg-win",
  lost: "bg-loss",
  mixed: "bg-[linear-gradient(90deg,rgb(var(--v-theme-win))_50%,rgb(var(--v-theme-loss))_50%)]",
  pending: "border border-dashed border-foreground/50 bg-transparent",
};

/** One player's event as one square per round. The mark names the winner of the series and the
 *  tooltip holds the margin and the opponent, so best of 1, 3 and 5 read the same. The strip is
 *  one keyboard stop and the arrow keys walk its marks. `record` prints the count beside it, so
 *  colour is never the only channel. */
export function RoundStrip({
  series,
  playerId,
  rounds,
  record = false,
  className,
}: {
  series: Row[];
  playerId: number;
  rounds: number;
  record?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState<number | null>(null);
  const marks = roundMarks_(series ?? [], playerId, rounds);
  const { wins, losses } = stripRecord_(marks);
  if (!rounds) return null;

  // the group holds the tab stop and the arrows walk its marks; the accordion trigger around it reads the same keys, so the event stops here
  const walk = (event: React.KeyboardEvent<HTMLSpanElement>) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    const list = [...event.currentTarget.querySelectorAll<HTMLElement>("[data-mark]")];
    const at = list.indexOf(document.activeElement as HTMLElement);
    event.preventDefault();
    event.stopPropagation();
    list[Math.max(0, Math.min(list.length - 1, at + (event.key === "ArrowRight" ? 1 : -1)))]?.focus();
  };

  return (
    <span className={cn("inline-flex items-center", className)}>
      {/* w-8 is the track the round numbers in a roster head offset by */}
      {record ? (
        <span className="tnum hidden w-8 flex-none text-xs sm:inline-block">
          {wins || losses ? (
            <>
              <span className="text-win">{wins}</span> – <span className="text-loss">{losses}</span>
            </>
          ) : null}
        </span>
      ) : null}
      <span
        role="group"
        tabIndex={0}
        aria-label={stripLabel_(marks)}
        className="inline-flex gap-[3px] rounded-[3px] outline-offset-[3px] focus-within:outline-2 focus-within:outline-primary"
        onKeyDown={walk}
      >
        {marks.map((mark, index) => (
          <Tooltip key={mark.round} open={open === index} onOpenChange={(next: boolean) => setOpen(next ? index : null)}>
            <TooltipTrigger
              render={
                <span
                  data-mark
                  tabIndex={-1}
                  role="img"
                  aria-label={markText_(mark)}
                  className="flex h-5 items-center focus-visible:outline-none"
                  onClick={(event: React.MouseEvent) => {
                    // a tap opens the tooltip and nothing else, wherever the strip sits
                    event.preventDefault();
                    event.stopPropagation();
                    setOpen((was) => (was === index ? null : index));
                  }}
                >
                  <span className={cn("box-border size-3 rounded-[2px]", ROUND[mark.state])} />
                </span>
              }
            />
            <TooltipContent className="max-w-none flex-col items-start gap-1">
              {mark.series.length ? (
                mark.series.map((one, at) => {
                  // the payload of a series carries the opponent's ladder stats on some surfaces only
                  const mmr = one.opponent ? getW3CMMR(one.opponent, undefined, one.opponentRace ?? undefined) : null;
                  return (
                    <span key={at} className="block">
                      <span className="block">{seriesHead_(mark.round, one)}</span>
                      {one.opponent ? (
                        <span className="flex items-center gap-1.5">
                          vs
                          <PlayerName player={one.opponent} race={one.opponentRace ?? undefined} plain />
                          {mmr != null ? <span className="tnum">{mmr}</span> : null}
                        </span>
                      ) : null}
                    </span>
                  );
                })
              ) : (
                <span>{markText_(mark)}</span>
              )}
            </TooltipContent>
          </Tooltip>
        ))}
      </span>
    </span>
  );
}

export default RoundStrip;
