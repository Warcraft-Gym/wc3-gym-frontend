"use client";
import { PlayerName, type Player } from "@/components/PlayerName";
import { cn } from "@/lib/utils";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>;

/** One series on a phone: a title line, then one line per player with a value at the right.
 *  `title`, `actions` and `side` fill the title line, its right end and each player line. */
export function SeriesCard({
  series, // player1, player2, host_player_id, scores
  title,
  actions,
  side,
}: {
  series: Row;
  title?: React.ReactNode;
  actions?: React.ReactNode;
  side?: (args: { player: Player; race?: string; n: number; won: boolean }) => React.ReactNode;
}) {
  // the race each side played, which is his signup race unless he reported another
  const races: (string | undefined)[] = [series.player1_race, series.player2_race];
  // the rating the row names on that race; a row without the field lets the line read its own
  const mmrs: (number | null | undefined)[] = [series.player1_mmr, series.player2_mmr];

  const { player1_score: a = 0, player2_score: b = 0 } = series;
  const winner = a === b ? null : a > b ? 0 : 1;

  return (
    <div className="border-b px-3 py-2 [&_.player-name]:whitespace-normal">
      {/* the caption-sized title link is the only way into the match on a phone */}
      <div className="flex items-center justify-between text-xs text-muted-foreground [&_a]:inline-block [&_a]:py-1.5">
        <span>{title}</span>
        {actions}
      </div>
      {[series.player1, series.player2].map((player: Player, n) => (
        <div key={n} className={cn("flex items-center gap-2", winner === n && "font-bold")}>
          <span className="flex-1">
            <PlayerName player={player} race={races[n]} mmr={mmrs[n]} host={series.host_player_id === player.id} />
          </span>
          {side?.({ player, race: races[n], n, won: winner === n })}
        </div>
      ))}
    </div>
  );
}

export default SeriesCard;
