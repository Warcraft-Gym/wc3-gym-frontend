"use client";
import { ColumnNote } from "@/components/ColumnNote";
import { PlayerName } from "@/components/PlayerName";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Icon } from "@/components/ui/Icon";
import { ACHIEVEMENTS_NOTE, LADDER_NOTE, SCORED_NOTE } from "@/helpers/achievements.js";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>;
type Segment = { key: "ladder" | "badge"; value: number };

const badgePoints = (player: Row) => player.points - player.ladder_points;
// A segment worth nothing is left out, so min-width never paints a stub for 0 points
const segments = (...list: Segment[]) => list.filter((seg) => seg.value > 0);

/** Three ranked lists over the season's players: total, achievement and ladder points */
export function LadderLeaderboards({
  players = [], // The season's players, each with points, ladder_points and achievements
  top = 8,
  onOpenPlayer,
}: {
  players?: Row[];
  top?: number;
  onOpenPlayer?: (player: Row) => void;
}) {
  const rank = (value: (player: Row) => number) =>
    players.filter((p) => p.games > 0 && value(p) > 0).sort((a, b) => value(b) - value(a)).slice(0, top);

  const grind = rank((p) => p.points).map((p): Row => ({
    ...p, value: p.points, caption: `${p.ladder_points} + ${badgePoints(p)}`,
    segments: segments({ key: "ladder", value: p.ladder_points }, { key: "badge", value: badgePoints(p) }),
  }));
  const badges = rank(badgePoints).map((p): Row => ({
    ...p, value: badgePoints(p), caption: `${p.achievements.length} badges`,
    segments: segments({ key: "badge", value: badgePoints(p) }),
  }));
  const ladder = rank((p) => p.ladder_points).map((p): Row => ({
    ...p, value: p.ladder_points, caption: `${p.wins}-${p.losses}`,
    segments: segments({ key: "ladder", value: p.ladder_points }),
  }));
  // One scale per list: its own leader fills the bar
  const max = (rows: Row[]) => Math.max(1, ...rows.map((r) => r.value));
  const boards = [
    { key: "grind", title: "Grind", icon: "mdi-fire", note: `Ladder points plus achievement points. ${SCORED_NOTE}`, rows: grind, max: max(grind), legend: true },
    { key: "badges", title: "Achievements", icon: "mdi-trophy-variant-outline", note: ACHIEVEMENTS_NOTE, rows: badges, max: max(badges), legend: false },
    { key: "ladder", title: "Ladder", icon: "mdi-sword-cross", note: LADDER_NOTE, rows: ladder, max: max(ladder), legend: false },
  ];

  return (
    <div className="mb-4 grid gap-2 md:grid-cols-3">
      {boards.map((board) => (
        <Card key={board.key} className="card h-full gap-0 py-0">
          <CardTitle className="flex items-center px-4 pt-3 pb-1 text-base font-normal">
            <Icon name={board.icon} className="mr-2 text-sm" />
            <ColumnNote title={board.title} note={board.note} />
          </CardTitle>
          <CardContent className="px-4 pt-0 pb-2">
            <ol className="m-0 list-none p-0">
              {board.rows.map((row, i) => (
                /* rank | name | bar over caption | value */
                <li
                  key={row.id}
                  className="tnum flex cursor-pointer items-center gap-2 py-1 hover:bg-on-surface/4"
                  onClick={() => onOpenPlayer?.(row)}
                >
                  <span className="w-6 shrink-0 text-right text-muted-foreground">{i + 1}</span>
                  <span className="w-[9.5em] shrink-0 overflow-hidden [&_.player-name]:max-w-full [&_.name]:truncate">
                    <PlayerName player={row} race={row.race} />
                  </span>
                  <span className="min-w-0 flex-1" title={row.caption}>
                    <span className="flex h-2 gap-[2px]">
                      {row.segments.map((seg: Segment) => (
                        /* The data end is rounded, the baseline end square */
                        <span
                          key={seg.key}
                          className={`block min-w-[2px] rounded-r ${seg.key === "ladder" ? "bg-primary" : "bg-tier-5"}`}
                          style={{ width: `${(100 * seg.value) / board.max}%` }}
                        />
                      ))}
                    </span>
                    <span className="mt-0.5 block text-xs leading-none text-muted-foreground">{row.caption}</span>
                  </span>
                  <span className="w-12 shrink-0 text-right font-bold">{row.value}</span>
                </li>
              ))}
            </ol>
            {board.legend ? (
              <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                <span className="inline-flex items-center"><span className="mr-1 inline-block size-[10px] rounded-sm bg-primary" />ladder</span>
                <span className="inline-flex items-center"><span className="mr-1 inline-block size-[10px] rounded-sm bg-tier-5" />achievements</span>
              </div>
            ) : null}
            {!board.rows.length ? <div className="text-xs text-muted-foreground">No games yet</div> : null}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default LadderLeaderboards;
