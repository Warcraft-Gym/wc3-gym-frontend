"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { scaleQuantize } from "d3-scale";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/Icon";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ColumnNote } from "@/components/ColumnNote";
import { PlayerName } from "@/components/PlayerName";
import { TeamName } from "@/components/TeamName";
import { RaceIcon } from "@/components/RaceIcon";
import { StatusAlert } from "@/components/StatusAlert";
import { useAuth, useSeason, useTeamStore, useSeriesStore, useFantasyStore, useLadderStore } from "@/stores";
import { canSeeRole } from "@/helpers";
import { POINTS_NOTES } from "@/helpers/achievements.js";
import { resolveCurrentSeasonId } from "@/helpers/current-season.js";
import { eventLabel } from "@/helpers/event-labels.mjs";
import { gamesBarHeight, winRate } from "@/helpers/ladder-days.mjs";
import { playerPath } from "@/helpers/players.mjs";
import { raceWrapper } from "@/helpers/races.js";
import { isUnscored } from "@/helpers/season-phase.mjs";
import { findSeason } from "@/helpers/season-slug.mjs";
import { cn } from "@/lib/utils";
import "./report.css";

// Random is not a race, so it and any unknown race take the neutral draw colour
const raceTokens: Record<string, string> = { HU: "race-hu", OC: "race-oc", UD: "race-ud", NE: "race-ne" };
const getRaceColor = (race: string) => `rgb(var(--v-theme-${raceTokens[race] || "draw"}))`;
const getRaceName = (race: string) => raceWrapper.getRaceObject(race)?.name || race;

const rankMedal = (rank: number) => {
  if (rank === 1) return { icon: "mdi-medal", color: "text-medal-gold" };
  if (rank === 2) return { icon: "mdi-medal", color: "text-medal-silver" };
  if (rank === 3) return { icon: "mdi-medal", color: "text-primary" };
  return null;
};

// Row 0 of by_hour is Sunday, the heatmap reads Monday first
const dayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const dayRows = [1, 2, 3, 4, 5, 6, 0];

const pad2 = (n: number) => String(n).padStart(2, "0");
const monthDay = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

/** A bar of a percentage, the port of v-progress-linear on a report row. It is two divs, not
 *  `Progress`, because Base UI writes a hidden "x" into every progress bar it draws. */
function RateBar({ value, height, color }: { value: number; height: string; color: string }) {
  return (
    <div className={cn("w-full overflow-hidden rounded-full bg-surface-light", height)}>
      <div className={cn("h-full rounded-full", color)} style={{ width: `${value}%` }} />
    </div>
  );
}

/** One column heading of a report table, centred, with its optional note. */
function Th({ className, note, children }: { className?: string; note?: string; children: React.ReactNode }) {
  return (
    <TableHead className={cn("text-center", className)}>{note ? <ColumnNote note={note}>{children}</ColumnNote> : children}</TableHead>
  );
}

// The columns a phone drops, so a report row never runs off the screen
const WIDE = "hidden md:table-cell";

/** The whole season on one page: standings, players, races, ladder activity and fantasy. */
export function SeasonReportView({ seasonKey }: { seasonKey?: string }) {
  const router = useRouter();
  const { me } = useAuth();
  const { seasons, current_season, selectedSeasonId, setSelectedSeasonId, fetchSeasons, fetchSeason, seasonIdOf, slugOf } = useSeason();
  const teamStore = useTeamStore();
  const seriesStore = useSeriesStore();
  const fantasyStore = useFantasyStore();
  const ladderStore = useLadderStore();

  const [teams, setTeams] = useState<any[]>([]);
  const [series, setSeries] = useState<any[]>([]);
  const [fantasyAll, setFantasyAll] = useState<any[]>([]);
  const [ladder, setLadder] = useState<any>(null);
  // A season id in the route or already stored means a fetch is coming, so the first paint
  // shows the loading state rather than the "select a season" empty state
  const [isLoading, setIsLoading] = useState(() => !!seasonKey || selectedSeasonId != null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  // The current season heads the dropdown and is what a cold open loads
  const [currentSeasonId, setCurrentSeasonId] = useState<number | null>(null);
  const [booted, setBooted] = useState(false);
  // Every section starts open, so the report still prints and embeds whole
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const toggle = (key: string) =>
    setCollapsed((open) => {
      const next = new Set(open);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const seasonItems = seasons
    .slice()
    .sort((a, b) => Number(b.id === currentSeasonId) - Number(a.id === currentSeasonId) || b.id - a.id);

  // /report is public; only a reader who may open /player/:id gets a clickable row or a name link
  const mayOpenPlayer = !!me && canSeeRole(me.role, "member");

  const season = current_season;
  // Every team name on the page links to the team page of the season the report shows
  const seasonSlug = season?.id ? slugOf(season.id) : null;
  const fantasyTeams = fantasyAll.filter((t) => t.season_id === selectedSeasonId);
  const reportReady = !!season?.id && teams.length > 0;

  // The season list and the season the page opens on, in one pass, so the first report load
  // carries the resolved id. The rows the read answers name the season; the snapshot this
  // pass closed over still holds an empty list.
  useEffect(() => {
    (async () => {
      setIsLoading(true);
      try {
        const rows = await fetchSeasons();
        const resolved = await resolveCurrentSeasonId();
        setCurrentSeasonId(resolved);
        // The path names the season; without one, the season picked on another page, then the newest
        const paramId = seasonKey ? findSeason(rows, seasonKey)?.id ?? null : null;
        if (paramId) setSelectedSeasonId(paramId);
        else if (rows.length) {
          const picked = rows.find((s: any) => s.id === selectedSeasonId);
          setSelectedSeasonId(picked ? picked.id : resolved ?? Math.max(...rows.map((s: any) => s.id)));
        }
        // No season to read: the load effect never runs, so this pass clears the flag itself
        else setIsLoading(false);
      } catch {
        setErrorMessage("Failed to load seasons.");
        setIsLoading(false);
      } finally {
        setBooted(true);
      }
    })();
    // one read on mount, as onMounted does
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // A season typed into the path while the page is open
  useEffect(() => {
    if (!booted) return;
    const paramId = seasonKey ? seasonIdOf(seasonKey) : null;
    if (paramId) setSelectedSeasonId(paramId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seasonKey]);

  // The report of the season in force
  useEffect(() => {
    if (!booted || !selectedSeasonId) return;
    let live = true;
    (async () => {
      // Keep the season id in the URL, without remounting the page under it
      window.history.replaceState(null, "", `/report/${slugOf(selectedSeasonId)}${window.location.search}`);
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const [, teamRows, seriesRows, fantasyRows] = await Promise.all([
          fetchSeason(selectedSeasonId),
          teamStore.fetchTeamsBySeason(selectedSeasonId),
          seriesStore.searchSeriesBySeason(selectedSeasonId),
          fantasyStore.fetchTeams(),
        ]);
        if (!live) return;
        setTeams(teamRows || []);
        setSeries(seriesRows || []);
        setFantasyAll(fantasyRows || []);
        // A season with no synced ladder answers an error, and the card stays hidden
        try {
          const answer = await ladderStore.seasonLadder(selectedSeasonId);
          if (live) setLadder(answer);
        } catch {
          if (live) setLadder(null);
        }
      } catch {
        if (live) setErrorMessage("Failed to load report data.");
      } finally {
        if (live) setIsLoading(false);
      }
    })();
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [booted, selectedSeasonId]);

  // The report is a light document: print it light and give the admin his theme back. The light is
  // never stored, so a browser that skips afterprint leaves his saved theme alone.
  const printReport = () => {
    const previous = document.documentElement.dataset.theme;
    document.documentElement.dataset.theme = "light";
    window.addEventListener(
      "afterprint",
      () => {
        if (previous) document.documentElement.dataset.theme = previous;
        else delete document.documentElement.dataset.theme;
      },
      { once: true },
    );
    window.print();
  };

  // ─── All players in this season (deduplicated) ────────────────────────────
  const allPlayers = (() => {
    if (!season?.id || !teams.length) return [];
    const seen = new Set<number>();
    const result: any[] = [];
    const seasonIdKey = String(season.id);
    for (const team of teams) {
      for (const player of team.player_by_season?.[seasonIdKey] || []) {
        if (seen.has(player.id)) continue;
        seen.add(player.id);
        const seasonStats = player.gnl_stats?.find((s: any) => s.season_id === season.id) || null;
        result.push({ ...player, seasonStats, team });
      }
    }
    return result;
  })();

  // ─── Player leaderboard ───────────────────────────────────────────────────
  // Played counts the scored series a player stood in; the rate divides by the decided ones
  const leaderboard = allPlayers
    .map((p) => {
      const own = series.filter((s) => s.player1_id === p.id || s.player2_id === p.id);
      const wins = p.seasonStats?.wins || 0;
      const losses = p.seasonStats?.losses || 0;
      return {
        ...p,
        wins,
        losses,
        played: own.filter((s) => !isUnscored(s)).length,
        winRate: winRate(wins, losses),
        totalPoints: own.reduce((sum, s) => sum + (s.player1_id === p.id ? s.player1_points || 0 : s.player2_points || 0), 0),
      };
    })
    .sort((a, b) => b.totalPoints - a.totalPoints || (b.winRate ?? -1) - (a.winRate ?? -1) || b.wins - a.wins);

  // ─── Team standings (sorted by final_score desc) ──────────────────────────
  const teamStandings = teams
    .map((team) => {
      const info = team.seasons_info?.find((s: any) => s.season_id === season?.id) || team.seasons_info?.[0] || {};
      const seasonIdKey = String(season?.id);
      const players = team.player_by_season?.[seasonIdKey] || [];
      const statsOf = (p: any) => p.gnl_stats?.find((s: any) => s.season_id === season?.id);
      const totalWins = players.reduce((sum: number, p: any) => sum + (statsOf(p)?.wins || 0), 0);
      const totalLosses = players.reduce((sum: number, p: any) => sum + (statsOf(p)?.losses || 0), 0);
      return {
        id: team.id,
        icon_url: team.icon_url,
        name: team.long_name || team.name,
        finalScore: info.final_score || 0,
        pointsAvailable: info.points_available || 0,
        pointsAgainst: info.points_against || 0,
        playerCount: players.length,
        totalWins,
        winRate: winRate(totalWins, totalLosses),
      };
    })
    .sort((a, b) => b.finalScore - a.finalScore);

  // ─── Race breakdown ───────────────────────────────────────────────────────
  const raceBreakdown = (() => {
    type RaceStats = { wins: number; losses: number; played: number; players: number; points: number };
    const raceMap: Record<string, RaceStats> = {};
    const entry = (race: string) => (raceMap[race] ??= { wins: 0, losses: 0, played: 0, players: 0, points: 0 });

    for (const player of leaderboard) {
      if (!player.signup_race) continue; // unsigned players have no race to tally, same as the points loop below
      const row = entry(player.signup_race);
      row.players++;
      row.wins += player.wins;
      row.losses += player.losses;
      row.played += player.played;
    }

    // Points go to the race the side played, which is his signup race unless
    // he reported another one for that series
    for (const s of series) {
      if (s.player1_race && s.player1_points != null) entry(s.player1_race).points += s.player1_points;
      if (s.player2_race && s.player2_points != null) entry(s.player2_race).points += s.player2_points;
    }

    const maxPoints = Math.max(...Object.values(raceMap).map((r) => r.points), 1);
    return Object.entries(raceMap)
      .map(([race, stats]) => ({
        race,
        ...stats,
        winRate: winRate(stats.wins, stats.losses),
        pointsBarPct: Math.round((stats.points / maxPoints) * 100),
      }))
      .sort((a, b) => b.points - a.points);
  })();

  // ─── Fantasy leaderboard (sorted by total_points) ─────────────────────────
  const sortedFantasyTeams = [...fantasyTeams].sort((a, b) => (b.total_points || 0) - (a.total_points || 0));

  // ─── Header summary stats ─────────────────────────────────────────────────
  const headerStats = [
    { label: "Rounds", value: season?.round_count ?? "–", icon: "mdi-calendar-week" },
    { label: "Teams", value: teams.length, icon: "mdi-shield-outline" },
    { label: "Players", value: allPlayers.length, icon: "mdi-account-group" },
    { label: "Series played", value: series.filter((s) => !isUnscored(s)).length, icon: "mdi-sword-cross" },
  ];

  /* ── Ladder activity ────────────────────────────────────────────────────── */
  const hourMax = Math.max(1, ...(ladder?.by_hour ?? []).flat());
  // Five equal buckets of 1..5 x step games, one bronze step each; an hour with no games stays surface-light
  const heatStep = Math.ceil(hourMax / 5);
  const heatScale = scaleQuantize<number>().domain([0.5, 5 * heatStep + 0.5]).range([1, 2, 3, 4, 5]);
  const heatColor = (games: number) => `rgb(var(--v-theme-${games ? `heat-${heatScale(games)}` : "surface-light"}))`;

  const heatRows = (() => {
    const grid = ladder?.by_hour;
    if (!grid?.length || !ladder?.total_games) return [];
    return Array.from({ length: 24 }, (_, hour) => ({
      hour,
      label: hour % 3 === 0 ? `${pad2(hour)}:00` : "",
      cells: dayRows.map((row, col) => {
        const games = grid[row]?.[hour] ?? 0;
        return { key: `${row}-${hour}`, color: heatColor(games), title: `${dayLabels[col]} ${pad2(hour)}:00 · ${games} games` };
      }),
    }));
  })();

  const heatLegend = [
    { color: heatColor(0), label: "0" },
    ...Array.from({ length: 5 }, (_, i) => ({
      color: `rgb(var(--v-theme-heat-${i + 1}))`,
      label: i === 4 ? `${heatStep * 4 + 1}+` : `${i * heatStep + 1}-${(i + 1) * heatStep}`,
    })),
  ];

  // One entry per season day, as the answer serves it, and they add up to total_games
  const ladderDays: { d: string; g: number }[] = ladder?.per_day ?? [];
  const dayMax = Math.max(1, ...ladderDays.map((day) => day.g));
  const dayBars = ladderDays.map((day) => ({
    d: day.d,
    height: gamesBarHeight(day.g, dayMax),
    title: `${monthDay(day.d)} · ${day.g} games`,
  }));
  // One tick slot per day in the same flex row as the bars, labelled every 7th, so a
  // label always sits under the day it names
  const lastLabel = Math.floor((ladderDays.length - 1) / 7) * 7;
  const dayTicks = ladderDays.map((day, i) => ({ d: day.d, label: i % 7 ? "" : monthDay(day.d), end: i === lastLabel }));

  /** The head of a section, which folds it away on screen. */
  const sectionTitle = (key: string, icon: string, text: string) => (
    <button
      type="button"
      className="section-title mb-3 flex w-full cursor-pointer items-center border-0 bg-transparent p-0 font-heading text-[1.15rem] font-bold text-inherit"
      aria-expanded={!collapsed.has(key)}
      onClick={() => toggle(key)}
    >
      <Icon name={icon} className="mr-2 text-primary" />
      {text}
      <Icon name={collapsed.has(key) ? "mdi-chevron-down" : "mdi-chevron-up"} className="no-print ml-2" />
    </button>
  );

  return (
    <>
      {isLoading ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/60">
          <div className="size-16 animate-spin rounded-full border-8 border-surface-light border-t-primary" role="status" aria-label="Loading" />
        </div>
      ) : null}

      {/* Controls bar (hidden when printing) */}
      <div className="no-print">
        <div className="flex flex-wrap items-center gap-3 p-4 pb-2">
          {/* The label reads above the field and follows it in the markup, as the floating Vuetify label does */}
          <div className="flex w-full flex-col-reverse gap-1.5 sm:w-1/3 md:w-1/4">
            <Select value={selectedSeasonId} onValueChange={setSelectedSeasonId}>
              <SelectTrigger id="report-season" className="w-full">
                <SelectValue>{(id: number) => eventLabel(seasons.find((s) => s.id === id))}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {seasonItems.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {eventLabel(s)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Label htmlFor="report-season">Select season</Label>
          </div>
          <div className="flex-1" />
          <Button disabled={!reportReady} onClick={printReport}>
            <Icon name="mdi-printer" className="mr-1" />
            Print / Save as PDF
          </Button>
        </div>
        <div className="px-4">
          <StatusAlert modelValue={errorMessage} onClose={() => setErrorMessage(null)} />
        </div>
      </div>

      {/* Empty state */}
      {!reportReady && !isLoading && !errorMessage ? (
        <div className="flex min-h-[60vh] flex-col items-center justify-center">
          <Icon name="mdi-chart-box-outline" size={80} className="text-muted-foreground" />
          <p className="mt-4 text-lg text-muted-foreground">
            {selectedSeasonId
              ? `${season?.name ?? "This season"} has no teams yet — the report starts when the draft is done.`
              : "Select a season to generate the report"}
          </p>
        </div>
      ) : null}

      {reportReady ? (
        <div id="season-report">
          {/* ── Hero header ── */}
          <div className="report-hero relative overflow-hidden bg-hero px-6 py-10 text-on-hero">
            <div className="report-hero-overlay" />
            <div className="relative z-[1]">
              <div className="mb-1 text-base opacity-80">Season report</div>
              <h1 className="mb-6 text-on-hero">{season.name}</h1>
              <div className="flex flex-wrap gap-4">
                {headerStats.map((stat) => (
                  <div
                    key={stat.label}
                    className="min-w-[110px] rounded-xl border border-on-hero/20 bg-on-hero/10 px-6 py-4 text-center backdrop-blur-[4px]"
                  >
                    <Icon name={stat.icon} size={24} className="mb-1 opacity-90" />
                    <div className="text-3xl font-bold leading-none tnum text-on-hero">{stat.value}</div>
                    <div className="text-xs text-band-muted">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="report-body mx-auto max-w-[1400px] p-4 pt-6">
            {/* ── Team standings ── */}
            <div className={cn("report-section mb-6", collapsed.has("standings") && "collapsed")}>
              {sectionTitle("standings", "mdi-trophy", "Team standings")}
              <Card className="card p-0">
                <Table className="standings-table table-scroll">
                  <TableHeader>
                    <TableRow>
                      <Th className="w-14">#</Th>
                      <TableHead>Team</TableHead>
                      <Th note={POINTS_NOTES["Points"]}>Points</Th>
                      <Th className={WIDE} note={POINTS_NOTES["Points available"]}>Points available</Th>
                      <Th className={WIDE} note={POINTS_NOTES["Points against"]}>Points against</Th>
                      <Th className={WIDE}>Players</Th>
                      <Th>Win rate</Th>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {teamStandings.map((team, idx) => {
                      const medal = rankMedal(idx + 1);
                      return (
                        <TableRow key={team.id} className={cn("hover:bg-primary/5", idx === 0 && "bg-primary/6")}>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center">
                              {medal ? <Icon name={medal.icon} size={22} className={cn("mr-1", medal.color)} /> : null}
                              <span className={cn("text-xs tnum", !medal && "text-muted-foreground")}>{idx + 1}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <TeamName team={team} seasonKey={seasonSlug} className="font-medium" />
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge className="font-bold tnum">{team.finalScore}</Badge>
                          </TableCell>
                          <TableCell className={cn(WIDE, "text-center tnum")}>{team.pointsAvailable}</TableCell>
                          <TableCell className={cn(WIDE, "text-center tnum")}>{team.pointsAgainst}</TableCell>
                          <TableCell className={cn(WIDE, "text-center tnum")}>{team.playerCount}</TableCell>
                          <TableCell className="text-center">
                            <div className="win-rate-cell flex min-w-[100px] items-center">
                              <RateBar value={team.winRate ?? 0} height="h-2" color="bg-win" />
                              <span className="ml-2 text-xs tnum">{team.winRate != null ? `${team.winRate}%` : "–"}</span>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </Card>
            </div>

            {/* ── Player leaderboard ── */}
            <div className={cn("report-section mb-6", collapsed.has("leaderboard") && "collapsed")}>
              {sectionTitle("leaderboard", "mdi-account-star", "Player leaderboard")}
              <Card className="card p-0">
                <Table className="standings-table table-scroll">
                  <TableHeader>
                    <TableRow>
                      <Th className="w-11">#</Th>
                      <TableHead>Player</TableHead>
                      <Th>Race</Th>
                      <TableHead className={WIDE}>Team</TableHead>
                      <Th>W-L</Th>
                      <Th className={WIDE}>Played</Th>
                      <Th className={WIDE}>Win %</Th>
                      <Th>Points</Th>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {leaderboard.map((player, idx) => (
                      <TableRow
                        key={player.id}
                        className={cn(mayOpenPlayer && "cursor-pointer hover:bg-primary/5")}
                        onClick={() => mayOpenPlayer && router.push(playerPath(player))}
                      >
                        <TableCell className="text-center text-xs tnum text-muted-foreground">{idx + 1}</TableCell>
                        <TableCell>
                          <PlayerName player={player} plain={!mayOpenPlayer} />
                        </TableCell>
                        <TableCell className="text-center">
                          {player.signup_race ? <RaceIcon raceIdentifier={player.signup_race} /> : <span className="text-xs">–</span>}
                        </TableCell>
                        <TableCell className={WIDE}>
                          {player.team ? (
                            /* the row opens the player, so the team name stops that click on its way up */
                            <span onClick={(event) => event.stopPropagation()}>
                              <TeamName team={player.team} seasonKey={seasonSlug} />
                            </span>
                          ) : (
                            <span className="text-xs">–</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center tnum">
                          {player.wins}-{player.losses}
                        </TableCell>
                        <TableCell className={cn(WIDE, "text-center tnum")}>{player.played}</TableCell>
                        <TableCell className={cn(WIDE, "text-center tnum")}>
                          {player.winRate != null ? `${player.winRate}%` : <span className="text-xs text-muted-foreground">–</span>}
                        </TableCell>
                        <TableCell className="text-center">
                          {player.totalPoints > 0 ? (
                            <Badge className="text-[0.625rem] tnum">{player.totalPoints}</Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">–</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            </div>

            {/* ── Race performance ── */}
            <div className={cn("report-section mb-6", collapsed.has("races") && "collapsed")}>
              {sectionTitle("races", "mdi-sword-cross", "Race performance")}
              <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
                {raceBreakdown.map((raceEntry) => (
                  <Card key={raceEntry.race} className="race-card card gap-0 overflow-hidden p-0">
                    <div className="race-stripe h-1" style={{ background: getRaceColor(raceEntry.race) }} />
                    <div className="flex items-center justify-between px-4 py-3">
                      <div className="flex items-center">
                        <RaceIcon raceIdentifier={raceEntry.race} />
                        <span className="ml-2 text-base font-bold">{getRaceName(raceEntry.race)}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {raceEntry.players} {raceEntry.players === 1 ? "player" : "players"}
                      </span>
                    </div>
                    <CardContent className="p-4 pt-0">
                      <div className="flex items-center gap-3">
                        <span className="min-w-20 text-xs text-muted-foreground">Win rate</span>
                        <div className="flex-1">
                          <RateBar value={raceEntry.winRate ?? 0} height="h-2.5" color="bg-win" />
                        </div>
                        <span className="min-w-9 text-right text-sm font-bold tnum">
                          {raceEntry.winRate != null ? `${raceEntry.winRate}%` : "–"}
                        </span>
                      </div>
                      <div className="mt-2 flex items-center gap-3">
                        <span className="min-w-20 text-xs text-muted-foreground">Points vs top race</span>
                        <div className="flex-1">
                          <RateBar value={raceEntry.pointsBarPct} height="h-2.5" color="bg-draw" />
                        </div>
                        <span className="min-w-9 text-right text-sm font-bold tnum">{raceEntry.points}</span>
                      </div>
                      <Separator className="my-3" />
                      <div className="flex justify-between">
                        <div className="text-center">
                          <div className="text-lg font-bold tnum">{raceEntry.played}</div>
                          <div className="text-xs text-muted-foreground">Played</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-bold tnum">
                            {raceEntry.wins}-{raceEntry.losses}
                          </div>
                          <div className="text-xs text-muted-foreground">W-L</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-bold tnum">{raceEntry.points}</div>
                          <div className="text-xs text-muted-foreground">Points</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* ── Ladder activity ── */}
            {heatRows.length ? (
              <div className={cn("report-section mb-6", collapsed.has("ladder") && "collapsed")}>
                {sectionTitle("ladder", "mdi-podium", "Ladder activity")}
                <div className="grid gap-4 md:grid-cols-2">
                  <Card className="card gap-0 p-0">
                    <CardTitle className="flex items-center p-4 text-sm">
                      <span>Games by hour</span>
                      <span className="flex-1" />
                      <span className="text-xs font-normal text-muted-foreground">UTC</span>
                    </CardTitle>
                    <CardContent className="p-4 pt-0">
                      <div className="grid grid-cols-[46px_repeat(7,minmax(0,1fr))] gap-0.5 text-[0.6875rem] text-muted-foreground">
                        <span />
                        {dayLabels.map((day) => (
                          <span key={day} className="text-center">
                            {day}
                          </span>
                        ))}
                        {heatRows.map((row) => (
                          <div key={row.hour} className="contents">
                            <span className="pr-1.5 text-right leading-3 tnum">{row.label}</span>
                            {row.cells.map((cell) => (
                              <div key={cell.key} className="h-3 rounded-sm" style={{ background: cell.color }} title={cell.title} />
                            ))}
                          </div>
                        ))}
                      </div>
                      <div className="mt-2.5 flex items-center gap-1.5 text-[0.6875rem] text-muted-foreground">
                        {heatLegend.map((step) => (
                          <span key={step.label} className="flex items-center gap-1.5">
                            <span className="heat-swatch inline-block h-2.5 w-3.5 rounded-sm" style={{ background: step.color }} />
                            <span>{step.label}</span>
                          </span>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="card flex h-full flex-col gap-0 p-0">
                    <CardTitle className="flex items-center p-4 text-sm">
                      <span>Games per day</span>
                      <span className="flex-1" />
                      <span className="text-xs font-normal tnum text-muted-foreground">{ladder.total_games} games</span>
                    </CardTitle>
                    <CardContent className="flex flex-1 flex-col p-4 pt-0">
                      <div className="relative min-h-[232px] flex-1">
                        <div className="absolute inset-x-0 top-0 border-t border-dotted border-on-surface/40" />
                        <span className="absolute right-0 top-0.5 bg-surface pl-1 text-[0.6875rem] tnum text-muted-foreground">{dayMax}</span>
                        <div className="absolute inset-0 flex items-end gap-0.5">
                          {dayBars.map((bar) => (
                            <div key={bar.d} className="min-w-1 flex-1 rounded-t-[1px] bg-primary" style={{ height: bar.height }} title={bar.title} />
                          ))}
                        </div>
                      </div>
                      <div className="mt-1.5 flex gap-0.5 text-[0.6875rem] text-muted-foreground">
                        {/* A tick slot matches its bar: same flex row, same gap, same minimum. The label
                            is wider than its slot and overflows it, so it starts at its own bar. The
                            last one would overflow the card, so it ends at its own slot. */}
                        {dayTicks.map((tick) => (
                          <span key={tick.d} className={cn("min-w-1 flex-1 whitespace-nowrap", tick.end && "text-right")}>
                            {tick.label}
                          </span>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            ) : null}

            {/* ── Fantasy leaderboard ── */}
            {sortedFantasyTeams.length > 0 ? (
              <div className={cn("report-section mb-6", collapsed.has("fantasy") && "collapsed")}>
                {sectionTitle("fantasy", "mdi-cards", "Fantasy league leaderboard")}
                <Card className="card p-0">
                  <Table className="standings-table table-scroll">
                    <TableHeader>
                      <TableRow>
                        <Th className="w-14">#</Th>
                        <TableHead>Fantasy team</TableHead>
                        <Th>Captain</Th>
                        <TableHead className={WIDE}>Drafted team</TableHead>
                        <Th className={WIDE}>Drafted race</Th>
                        <Th className={WIDE}>Player pts</Th>
                        <Th className={WIDE}>Team pts</Th>
                        <Th className={WIDE}>Race pts</Th>
                        <Th className={WIDE}>Bet pts</Th>
                        <Th>Total</Th>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedFantasyTeams.map((ft, idx) => {
                        const medal = rankMedal(idx + 1);
                        return (
                          <TableRow key={ft.id} className={cn(idx === 0 && "bg-primary/6")}>
                            <TableCell className="text-center">
                              <div className="flex items-center justify-center">
                                {medal ? <Icon name={medal.icon} size={22} className={cn("mr-1", medal.color)} /> : null}
                                <span className={cn("text-xs tnum", !medal && "text-muted-foreground")}>{idx + 1}</span>
                              </div>
                            </TableCell>
                            <TableCell className="font-medium">{ft.name}</TableCell>
                            <TableCell className="text-center text-xs">{ft.captain?.name || "–"}</TableCell>
                            <TableCell className={cn(WIDE, "text-xs")}>{ft.drafted_team ? <TeamName team={ft.drafted_team} seasonKey={seasonSlug} /> : "–"}</TableCell>
                            <TableCell className={cn(WIDE, "text-center")}>
                              {ft.drafted_race ? <RaceIcon raceIdentifier={ft.drafted_race} /> : <span className="text-xs">–</span>}
                            </TableCell>
                            <TableCell className={cn(WIDE, "text-center tnum")}>{ft.player_points ?? "–"}</TableCell>
                            <TableCell className={cn(WIDE, "text-center tnum")}>{ft.team_points ?? "–"}</TableCell>
                            <TableCell className={cn(WIDE, "text-center tnum")}>{ft.race_points ?? "–"}</TableCell>
                            <TableCell className={cn(WIDE, "text-center tnum")}>{ft.bet_points ?? "–"}</TableCell>
                            <TableCell className="text-center">
                              <Badge className="font-bold tnum">{ft.total_points ?? 0}</Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </Card>
              </div>
            ) : null}

            {/* ── Report footer ── */}
            <div className="no-print mt-6">
              <Separator className="mb-4" />
              <div className="flex justify-center">
                <Button size="lg" onClick={printReport}>
                  <Icon name="mdi-printer" className="mr-1" />
                  Print / Save as PDF
                </Button>
              </div>
            </div>

            <div className="print-only mt-6">
              <Separator className="mb-2" />
              <div className="text-center text-xs text-muted-foreground">GNL Admin &mdash; {season.name} season report</div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

export default SeasonReportView;
