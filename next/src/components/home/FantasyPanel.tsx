"use client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/Icon";
import { PlayerName } from "@/components/PlayerName";
import { HomePanel, ROW, SkeletonRows } from "@/components/home/HomePanel";
import { seriesWhen } from "@/helpers/home-hub.mjs";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>;

/** The member's fantasy league on Home: while team creation is open and he has no team, the way to
 *  create one; once he has a team, the fantasy series still open for bets, each with his bet or the
 *  button to place one. The caller draws nothing when creation is closed and he has no team. */
export function FantasyPanel({
  state,
  rows,
  loading,
  order,
  onBet,
}: {
  state: "create" | "bets";
  rows: Row[];
  loading: boolean;
  order: number;
  onBet: (series: Row) => void;
}) {
  const pick = (row: Row) => {
    const bet = row.myBet;
    if (!bet) return null;
    const winner = bet.winner_id === row.player1_id ? row.player1?.name : row.player2?.name;
    return `Your pick: ${winner ?? "?"}${bet.bet_points ? ` · ${bet.bet_points} pts` : ""}`;
  };

  return (
    <HomePanel
      icon="mdi-cards-outline"
      title="Fantasy"
      order={order}
      action={loading ? null : <Link href="/fantasy" className="text-on-primary underline">Leaderboard</Link>}
    >
      {loading ? (
        <SkeletonRows rows={2} />
      ) : state === "create" ? (
        <>
          <p className="text-sm">Fantasy team creation is open. Draft your own team of players and score points with them all season.</p>
          <Button className="mt-3" nativeButton={false} render={<Link href="/fantasy-registration" />}>
            <Icon name="mdi-plus" />
            Create your fantasy team
          </Button>
        </>
      ) : (
        <>
          {rows.length ? (
            rows.map((row) => (
              <div key={row.id} className={ROW}>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="tnum text-sm text-muted-foreground">{seriesWhen(row)}</span>
                  <Button size="sm" variant={row.myBet ? "outline" : "default"} className="ml-auto" onClick={() => onBet(row)}>
                    {row.myBet ? "Change bet" : "Place bet"}
                  </Button>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                  {row.player1 ? <PlayerName player={row.player1} race={row.player1_race} mmr={false} /> : null}
                  <span className="text-muted-foreground">vs</span>
                  {row.player2 ? <PlayerName player={row.player2} race={row.player2_race} mmr={false} /> : null}
                </div>
                {pick(row) ? <div className="text-sm text-muted-foreground">{pick(row)}</div> : null}
              </div>
            ))
          ) : (
            <p className="text-sm">No fantasy match is open for bets right now. The captains mark the fantasy matches when they publish a round.</p>
          )}
          <Button variant="outline" size="sm" className="mt-3 text-primary-text" nativeButton={false} render={<Link href="/fantasy-registration" />}>
            My fantasy team
          </Button>
        </>
      )}
    </HomePanel>
  );
}
