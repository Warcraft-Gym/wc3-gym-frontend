"use client";
import { PlayerName, type Player } from "@/components/PlayerName";
import { RaceIcon } from "@/components/RaceIcon";
import { LadderDayBars } from "./LadderDayBars";
import type { LadderDay } from "./LadderPlots";
import { LOSS, WIN, winRate } from "@/helpers/ladder-days.mjs";

/* eslint-disable @typescript-eslint/no-explicit-any */
type LadderRow = { games?: number; wins?: number; losses?: number; vs_race?: Record<string, [number, number]> } & Record<string, any>;
type GnlRow = { games?: number; wins?: number; losses?: number } & Record<string, any>;

const disabled = "text-[rgba(var(--v-theme-on-surface),0.38)]";
const label = `text-center text-xs ${disabled}`;

const record = (p?: LadderRow | null) => (!p || !p.games ? "—" : `${p.wins}–${p.losses} · ${winRate(p.wins, p.losses)}%`);
const vs = (p?: LadderRow | null, race?: string) => {
  const r = race ? p?.vs_race?.[race] : null;
  return r && r[0] + r[1] ? `${r[0]}–${r[1]}` : "—";
};
const gnl = (g?: GnlRow | null) => (g && g.games ? `${g.wins ?? 0}–${g.losses ?? 0}` : "—");

/** The two players of a series side by side: MMR, ladder record, the record against the other's
 *  race, the GNL record, the games per day */
export function MatchupCompare({
  a,
  b,
  raceA,
  raceB,
  la,
  lb,
  ga,
  gb,
  daysA,
  daysB,
  ymax,
}: {
  a: Player; // series.player1
  b: Player; // series.player2
  raceA?: string; // the race each side plays in this series
  raceB?: string;
  la?: LadderRow | null; // their SeasonPlayer rows, null while unsynced
  lb?: LadderRow | null;
  ga?: GnlRow | null; // their GNL stats of the season
  gb?: GnlRow | null;
  daysA?: LadderDay[] | null; // from fillDays
  daysB?: LadderDay[] | null;
  ymax: number;
}) {
  return (
    <div className="grid grid-cols-[236px_70px_236px] items-center gap-y-1 text-sm tnum">
      <div className="text-right font-medium">
        <PlayerName player={a} race={raceA} mmr={false} />
      </div>
      <div className={label}>vs</div>
      <div className="font-medium">
        <PlayerName player={b} race={raceB} mmr={false} />
      </div>

      <div className="text-right">{la?.mmr?.current ?? "—"}</div>
      <div className={label}>MMR</div>
      <div>{lb?.mmr?.current ?? "—"}</div>

      <div className="text-right">{record(la)}</div>
      <div className={label}>record</div>
      <div>{record(lb)}</div>

      <div className="inline-flex items-center justify-end gap-1 text-right">
        {vs(la, raceB)} {raceB ? <RaceIcon raceIdentifier={raceB} size="1.1em" /> : null}
      </div>
      <div className={label}>vs race</div>
      <div className="inline-flex items-center gap-1">
        {raceA ? <RaceIcon raceIdentifier={raceA} size="1.1em" /> : null} {vs(lb, raceA)}
      </div>

      <div className="text-right">{gnl(ga)}</div>
      <div className={label}>GNL</div>
      <div>{gnl(gb)}</div>

      <div className="flex justify-end">
        {daysA ? <LadderDayBars days={daysA} ymax={ymax} /> : <span className={disabled}>&mdash;</span>}
      </div>
      <div className={label}>ladder</div>
      <div>{daysB ? <LadderDayBars days={daysB} ymax={ymax} /> : <span className={disabled}>&mdash;</span>}</div>

      <div className="col-span-full flex flex-wrap justify-center gap-3 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <span className="inline-block h-[10px] w-[10px]" style={{ background: WIN }} />
          wins
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="inline-block h-[10px] w-[10px]" style={{ background: LOSS }} />
          losses
        </span>
        <span>both columns scale to {ymax} games a day</span>
      </div>
    </div>
  );
}

export default MatchupCompare;
