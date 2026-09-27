"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Fragment, useMemo } from "react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/Icon";
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toneClass } from "@/components/ui/tone";
import { BetIcon } from "@/components/fantasy/BetIcon";
import { GroupedTable, type GroupedColumn } from "@/components/GroupedTable";
import { PlayerName } from "@/components/PlayerName";
import { RaceIcon } from "@/components/RaceIcon";
import { TeamName } from "@/components/TeamName";
import { W3CMmr } from "@/components/W3CMmr";
import { record } from "@/helpers/figures.mjs";
import { raceWrapper } from "@/helpers/races.js";
import { teamImageUrl, showDefaultTeamImage } from "@/helpers/team-image.js";
import { getW3CMMR } from "@/helpers/w3c-stats.js";
import { cn } from "@/lib/utils";

const playerColumns: GroupedColumn[] = [
  { key: "player", title: "Player" },
  { key: "mmr", title: "W3C MMR", align: "right" },
  { key: "record", title: "GNL Record", align: "right" },
  { key: "player_pts", title: "Player Points", align: "right" },
  { key: "bench_pts", title: "Bench Points", align: "right" },
  { key: "total", title: "Total", align: "right" },
];

const betColumns: GroupedColumn[] = [
  { key: "week", title: "Round", width: "110px" },
  { key: "series", title: "Series" },
  { key: "points", title: "Points", align: "right" },
];

// Team, Race and Bets hold a handful of numbers; stretching them to the panel
// pushes the points column an eye-travel away from the row it belongs to.
const NARROW = "[&_table]:w-auto";
// The label keeps its width, so the round names line up over the opponents.
const WEEK_LABEL = "inline-block min-w-16 opacity-(--v-medium-emphasis-opacity)";
const ICON = "size-6 object-contain";

// The breakdown names the drafted GNL team flat, so the team line is built from the three fields it carries
const draftedTeam = (part: any) => ({ id: part.team_id, name: part.team_name, icon_url: part.team_icon_url });

type RosterRow = { key: string | number; label: string; player: any; mmr: any; record: string; bench: number; total: number; weeks: any[] };
type BetWeek = { key: number; label: string; week: number; bets: any[]; summary: string; net: number };

/** The five panels behind one fantasy team's score: its drafted team, its grind team, its race,
 *  its roster and its bets. The breakdown answer carries names (and sometimes ids); the players
 *  list turns them back into full players so every reference renders as PlayerName. */
export function FantasyScoreBreakdown({
  breakdown,
  players = [],
  draftedPlayers = [],
}: {
  breakdown: any;
  players?: any[];
  draftedPlayers?: any[];
}) {
  // drafted players last: they carry the event record the roster table reads
  const pool = useMemo(() => [...players, ...draftedPlayers], [players, draftedPlayers]);
  const byId = useMemo(() => new Map(pool.map((p) => [p.id, p])), [pool]);
  const byName = useMemo(() => new Map(pool.map((p) => [p.name, p])), [pool]);

  const resolve = (name: string, id: number | null = null) => byId.get(id) || byName.get(name) || { name };

  // the MMR of the race the opponent played, on the pool the roster rows read
  const opponentMmr = (series: any) => {
    const player = resolve(series.opponent);
    return series.opponent_race ? getW3CMMR(player, series.opponent_race) : null;
  };

  const gnlRecord = (player: any) => {
    const stat = player.record;
    return (stat && record(stat.wins || 0, stat.losses || 0)) || "—";
  };

  const roster: RosterRow[] = (() => {
    const bench: Record<string, number> = {};
    for (const b of breakdown.bench_breakdown) bench[b.player_name] = (bench[b.player_name] || 0) + b.points;
    return breakdown.player_breakdown.map((b: any) => {
      const player = resolve(b.player_name, b.player_id);
      return {
        ...b,
        key: b.player_id ?? b.player_name,
        label: b.player_name,
        player,
        mmr: getW3CMMR(player, player.signup_race),
        record: gnlRecord(player),
        bench: bench[b.player_name] || 0,
      };
    });
  })();

  const raceRanking = Object.entries(breakdown.race_breakdown.all_race_points as Record<string, number>)
    .map(([race, points]) => ({ race, points }))
    .sort((a, b) => b.points - a.points);
  const raceRank = raceRanking.findIndex((entry) => entry.race === breakdown.race_breakdown.race) + 1;
  const raceName = raceWrapper.getRaceObject(breakdown.race_breakdown.race)?.name ?? breakdown.race_breakdown.race;

  const betWeeks: BetWeek[] = (() => {
    const weeks = new Map<number, any[]>();
    for (const bet of breakdown.bet_breakdown) weeks.set(bet.week, [...(weeks.get(bet.week) || []), bet]);
    return [...weeks.entries()]
      .sort(([a], [b]) => a - b)
      .map(([week, bets]) => {
        const won = bets.filter((b) => b.won);
        const lost = bets.filter((b) => !b.won);
        const points = (arr: any[]) => arr.reduce((sum, b) => sum + b.result, 0);
        const summary = [won.length && `${won.length} won (+${points(won)})`, lost.length && `${lost.length} lost (${points(lost)})`].filter(Boolean).join(" · ");
        return { key: week, label: `Round ${week}`, week, bets, summary, net: points(bets) };
      });
  })();

  return (
    // `multiple`: a reader compares two panels side by side
    <Accordion multiple className="w-full">
      {/* Team Points Breakdown */}
      {breakdown.team_breakdown.team_name ? (
        <AccordionItem value="team">
          <AccordionTrigger className="items-center gap-2 font-normal hover:no-underline">
            <span className="flex w-full flex-wrap items-center gap-2">
              {/* inside the accordion button, so the team line is plain text, and it reads as quiet as the grind name under it */}
              <TeamName team={draftedTeam(breakdown.team_breakdown)} plain className="opacity-(--v-medium-emphasis-opacity)" />
              <strong>Team Points Details</strong>
              <Badge className="ml-auto mr-2">{breakdown.totals.team_points} points</Badge>
            </span>
          </AccordionTrigger>
          <AccordionContent className={NARROW}>
            <table className="caption-bottom text-sm">
              <TableHeader>
                <TableRow>
                  <TableHead>Team</TableHead>
                  <TableHead>Final Score</TableHead>
                  <TableHead>Points Against</TableHead>
                  <TableHead>Points Available</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-bold">
                    <TeamName team={draftedTeam(breakdown.team_breakdown)} />
                  </TableCell>
                  <TableCell>{breakdown.team_breakdown.final_score}</TableCell>
                  <TableCell>{breakdown.team_breakdown.points_against}</TableCell>
                  <TableCell>{breakdown.team_breakdown.points_available}</TableCell>
                </TableRow>
              </TableBody>
            </table>
          </AccordionContent>
        </AccordionItem>
      ) : null}

      {/* Grind Points Breakdown: the second team, paying by achievement rank */}
      {breakdown.grind_breakdown?.team_name ? (
        <AccordionItem value="grind">
          <AccordionTrigger className="items-center gap-2 font-normal hover:no-underline">
            <span className="flex w-full flex-wrap items-center gap-2">
              <img className={ICON} src={teamImageUrl(breakdown.grind_breakdown.team_id)} onError={showDefaultTeamImage} alt="" />
              <strong>Grind Points Details</strong>
              <span className="opacity-(--v-medium-emphasis-opacity)">{breakdown.grind_breakdown.team_name}</span>
              <Badge className="ml-auto mr-2">{breakdown.totals.grind_points} points</Badge>
            </span>
          </AccordionTrigger>
          <AccordionContent className={NARROW}>
            <table className="caption-bottom text-sm">
              <TableHeader>
                <TableRow>
                  <TableHead>Team</TableHead>
                  <TableHead>Achievement points</TableHead>
                  <TableHead>Rank</TableHead>
                  <TableHead>Points</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-bold">
                    <span className="inline-flex items-center gap-2">
                      <img className={ICON} src={teamImageUrl(breakdown.grind_breakdown.team_id)} onError={showDefaultTeamImage} alt="" />
                      {breakdown.grind_breakdown.team_name}
                    </span>
                  </TableCell>
                  <TableCell>{breakdown.grind_breakdown.achievement_points}</TableCell>
                  <TableCell>
                    {breakdown.grind_breakdown.rank} of {breakdown.grind_breakdown.teams}
                  </TableCell>
                  <TableCell>{breakdown.grind_breakdown.points}</TableCell>
                </TableRow>
              </TableBody>
            </table>
          </AccordionContent>
        </AccordionItem>
      ) : null}

      {/* Race Points Breakdown */}
      <AccordionItem value="race">
        <AccordionTrigger className="items-center gap-2 font-normal hover:no-underline">
          <span className="flex w-full flex-wrap items-center gap-2">
            <RaceIcon raceIdentifier={breakdown.race_breakdown.race} size={24} />
            <strong>Race Points Details</strong>
            <span className="opacity-(--v-medium-emphasis-opacity)">
              {raceName} · {record(breakdown.race_breakdown.season_stats.wins, breakdown.race_breakdown.season_stats.losses) ?? "—"}
            </span>
            <Badge className={toneClass("primary")}>
              #{raceRank} of {raceRanking.length}
            </Badge>
            <Badge className="ml-auto mr-2">{breakdown.totals.race_points} points</Badge>
          </span>
        </AccordionTrigger>
        <AccordionContent className={NARROW}>
          <table className="caption-bottom text-sm">
            <TableHeader>
              <TableRow>
                <TableHead style={{ width: "80px" }}>Round</TableHead>
                <TableHead className="text-right">Wins</TableHead>
                <TableHead className="text-right">Losses</TableHead>
                <TableHead className="text-right">Ratio</TableHead>
                <TableHead className="text-right">Rank</TableHead>
                <TableHead className="text-right">Points</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {breakdown.race_breakdown.weekly_breakdown.map((week: any) => (
                <TableRow key={week.week}>
                  <TableCell>{week.week}</TableCell>
                  <TableCell className="text-right">{week.wins}</TableCell>
                  <TableCell className="text-right">{week.losses}</TableCell>
                  <TableCell className="text-right">{week.ratio.toFixed(2)}</TableCell>
                  <TableCell className="text-right">
                    {week.rank ? (
                      <Badge className={week.rank === 1 ? "bg-success text-on-success" : week.rank === 2 ? "bg-info text-on-info" : "bg-warning text-on-warning"}>#{week.rank}</Badge>
                    ) : (
                      <span className="opacity-(--v-medium-emphasis-opacity)">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {week.points_awarded > 0 ? <strong>+{week.points_awarded}</strong> : <span className="opacity-(--v-medium-emphasis-opacity)">0</span>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </table>
        </AccordionContent>
      </AccordionItem>

      {/* Player Points Breakdown: the drafted roster; a row opens the player's rounds */}
      <AccordionItem value="player">
        <AccordionTrigger className="items-center gap-2 font-normal hover:no-underline">
          <span className="flex w-full flex-wrap items-center gap-2">
            <Icon name="mdi-account-multiple" className="text-primary-text" />
            <strong>Player Points Details</strong>
            <Badge className="ml-auto">{breakdown.totals.player_points} points</Badge>
            <Badge className="mr-2 bg-warning text-on-warning">{breakdown.totals.bench_points} bench points</Badge>
          </span>
        </AccordionTrigger>
        <AccordionContent>
          <GroupedTable
            columns={playerColumns}
            groups={roster}
            empty="No drafted players"
            head={{ mmr: <W3CMmr /> }}
            group={({ group: row }) => (
              <>
                <TableCell className="font-bold">
                  <PlayerName player={row.player} race={row.player.signup_race} mmr={false} />
                </TableCell>
                <TableCell className="text-right">{row.mmr || "N/A"}</TableCell>
                <TableCell className="text-right">{row.record}</TableCell>
                <TableCell className="text-right">{row.total}</TableCell>
                <TableCell className="text-right text-warning">{row.bench ? `+${row.bench}` : 0}</TableCell>
                <TableCell className="text-right">
                  <strong>{row.total + row.bench}</strong>
                </TableCell>
              </>
            )}
            rows={({ group: row }) =>
              row.weeks.map((week: any) =>
                week.series.length === 0 ? (
                  <tr key={week.week} className="detail-row border-b">
                    <td />
                    <td>
                      <span className={WEEK_LABEL}>Round {week.week}</span>
                      {week.bench_points > 0 ? (
                        <span className="text-warning">
                          <Icon name="mdi-seat" className="text-sm" /> Benched
                        </span>
                      ) : (
                        <span className="opacity-(--v-medium-emphasis-opacity)">No games</span>
                      )}
                    </td>
                    <td />
                    <td />
                    <td />
                    <td className="text-right">
                      {week.bench_points > 0 ? <span className="text-warning">+{week.bench_points}</span> : <span className="opacity-(--v-medium-emphasis-opacity)">0</span>}
                    </td>
                    <td />
                  </tr>
                ) : (
                  week.series.map((series: any, idx: number) => (
                    // only the last row of a round carries the rule, so one round reads as one block
                    <tr key={`${week.week}-${idx}`} className={cn("detail-row", idx === week.series.length - 1 && "border-b")}>
                      <td />
                      <td>
                        <span className="flex flex-wrap items-center gap-1">
                          <span className={WEEK_LABEL}>{idx ? "" : `Round ${week.week}`}</span>
                          <span className="opacity-(--v-medium-emphasis-opacity)">vs</span>
                          <PlayerName player={resolve(series.opponent)} race={series.opponent_race} mmr={false} />
                        </span>
                      </td>
                      <td className="text-right">{opponentMmr(series) || "N/A"}</td>
                      <td className="text-right">{series.score}</td>
                      <td className="text-right">{series.points}</td>
                      <td />
                      <td />
                    </tr>
                  ))
                ),
              )
            }
          />
        </AccordionContent>
      </AccordionItem>

      {/* Bet Points Breakdown */}
      {breakdown.bet_breakdown.length > 0 ? (
        <AccordionItem value="bet">
          <AccordionTrigger className="items-center gap-2 font-normal hover:no-underline">
            <span className="flex w-full flex-wrap items-center gap-2">
              <BetIcon size={24} className="text-primary-text" />
              <strong>Bet Points Details</strong>
              <Badge className={cn("ml-auto mr-2", breakdown.totals.bet_points >= 0 ? "bg-win text-on-win" : "bg-loss text-on-loss")}>
                {breakdown.totals.bet_points} points
              </Badge>
            </span>
          </AccordionTrigger>
          <AccordionContent className={NARROW}>
            <GroupedTable
              columns={betColumns}
              groups={betWeeks}
              empty="No bets"
              group={({ group: week }) => (
                <>
                  <TableCell>Round {week.week}</TableCell>
                  <TableCell className="opacity-(--v-medium-emphasis-opacity)">{week.summary}</TableCell>
                  <TableCell className="text-right">
                    <strong className={week.net >= 0 ? "text-win" : "text-loss"}>
                      {week.net > 0 ? "+" : ""}
                      {week.net}
                    </strong>
                  </TableCell>
                </>
              )}
              rows={({ group: week }) =>
                week.bets.map((bet: any, idx: number) => (
                  <tr key={idx} className="detail-row border-b">
                    <td />
                    <td />
                    <td>
                      {bet.player1 && bet.player2 ? (
                        <span className="flex flex-wrap items-center gap-1">
                          {[bet.player1, bet.player2].map((side: string) => (
                            <Fragment key={side}>
                              {side === bet.player2 ? <span className="opacity-(--v-medium-emphasis-opacity)">{bet.score}</span> : null}
                              <span className={side === bet.actual_winner ? "font-bold" : undefined}>
                                <PlayerName player={resolve(side)} race={resolve(side).signup_race} />
                              </span>
                              {side === bet.bet_on ? <BetIcon className="text-primary-text" /> : null}
                            </Fragment>
                          ))}
                        </span>
                      ) : (
                        <span>{bet.series}</span>
                      )}
                    </td>
                    <td className={cn("text-right", bet.won ? "text-win" : "text-loss")}>
                      {bet.result > 0 ? "+" : ""}
                      {bet.result}
                    </td>
                  </tr>
                ))
              }
            />
          </AccordionContent>
        </AccordionItem>
      ) : null}
    </Accordion>
  );
}

export default FantasyScoreBreakdown;
