"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { timeFormat } from "d3-time-format";
import { Icon } from "@/components/ui/Icon";
import { RaceIcon } from "@/components/RaceIcon";
import { LadderPlots, type LadderDay } from "./LadderPlots";
import { LOSS, RACES, WIN, lastPlayed } from "@/helpers/ladder-days.mjs";
import { w3cPlayerUrl } from "@/helpers/w3c-stats";

/* eslint-disable @typescript-eslint/no-explicit-any */
type SeasonPlayer = { games?: number; battleTag?: string | null; vs_race?: Record<string, [number, number]>; per_day?: any[] } & Record<string, any>;

const BAR = 150;
const fmt = timeFormat("%-d %b");

/** The open row under a draft pick: his record against each race, then his games and MMR per day */
export function PlayerLadderPanel({
  player,
  days,
  ymax,
  ladderTo,
}: {
  player: SeasonPlayer; // a SeasonPlayer of the ladder players answer
  days: LadderDay[]; // from fillDays
  ymax: number;
  ladderTo: string; // the href of the season's ladder page
}) {
  // The plots fill whatever width the row leaves beside the race panel
  const plotBox = useRef<HTMLDivElement>(null);
  const [plotWidth, setPlotWidth] = useState(0);
  useEffect(() => {
    const el = plotBox.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setPlotWidth(Math.floor(entry.contentRect.width)));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const vs = player.vs_race || {};
  const played = RACES.filter((race: string) => vs[race] && vs[race][0] + vs[race][1] > 0);
  const max = Math.max(1, ...played.map((race: string) => vs[race][0] + vs[race][1]));
  const raceRows = played.map((race: string) => {
    const [w, l] = vs[race];
    return { race, w, l, wPx: Math.round((BAR * w) / max), lPx: Math.round((BAR * l) / max) };
  });

  const lastDay = lastPlayed(player.per_day);
  const last = lastDay ? fmt(new Date(`${lastDay}T00:00:00`)) : null;

  return (
    <div className="flex items-start gap-7">
      <div className="flex w-[250px] shrink-0 flex-col gap-2">
        <span className="text-[11px] leading-[14px] font-medium text-muted-foreground">Against each race</span>
        {raceRows.length ? (
          <div className="flex flex-col">
            {raceRows.map((r) => (
              <div key={r.race} className="flex h-[22px] items-center gap-2">
                <RaceIcon raceIdentifier={r.race} />
                <div className="flex w-[150px] gap-0">
                  {r.wPx ? <div style={{ width: `${r.wPx}px`, background: WIN }} className="h-[10px]" /> : null}
                  {r.lPx ? <div style={{ width: `${r.lPx}px`, background: LOSS, marginLeft: r.wPx ? "2px" : 0 }} className="h-[10px]" /> : null}
                </div>
                <span className="min-w-[30px] text-[0.8125rem] tnum">
                  {r.w}&ndash;{r.l}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <span className="text-muted-foreground">&mdash;</span>
        )}
        <span className="mt-1 text-sm text-muted-foreground">
          {player.games} games{last ? ` · last ${last}` : null}
        </span>
        <div className="flex gap-4 text-sm">
          <Link href={ladderTo}>Ladder</Link>
          {player.battleTag ? (
            <a href={w3cPlayerUrl(player.battleTag)} target="_blank" rel="noopener" className="inline-flex items-center gap-1">
              W3Champions <Icon name="mdi-open-in-new" size="14px" />
            </a>
          ) : null}
        </div>
      </div>
      <div ref={plotBox} className="flex min-w-0 grow flex-col">
        <div className="flex justify-end gap-4 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <span className="inline-block h-[10px] w-[10px]" style={{ background: WIN }} />
            wins
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="inline-block h-[10px] w-[10px]" style={{ background: LOSS }} />
            losses
          </span>
        </div>
        {plotWidth ? <LadderPlots days={days} ymax={ymax} width={plotWidth} /> : null}
      </div>
    </div>
  );
}

export default PlayerLadderPanel;
