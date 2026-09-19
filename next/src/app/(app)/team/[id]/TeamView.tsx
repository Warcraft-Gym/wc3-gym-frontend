/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Icon } from "@/components/ui/Icon";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ColumnNote } from "@/components/ColumnNote";
import { StatusAlert } from "@/components/StatusAlert";
import { TeamRoster } from "@/components/TeamRoster";
import { POINTS_NOTES } from "@/helpers/achievements.js";
import { loadSeasons, resolveCurrentSeasonId } from "@/helpers/current-season.js";
import { seasonRank, roundResults, seasonTabs as tabsOf, seriesRecord } from "@/helpers/team-record.mjs";
import { showDefaultTeamImage, teamImageUrl } from "@/helpers/team-image.js";
import { rosterOf } from "@/helpers/team-roster.mjs";
import { useSeason, useSeriesStore, useTeamStore } from "@/stores";

type Row = Record<string, any>;
const pointsNotes = POINTS_NOTES as Record<string, string>;

export function TeamView({ id }: { id: string }) {
  const teamId = Number(id);
  const teamStore = useTeamStore();
  const seriesStore = useSeriesStore();
  const seasonStore = useSeason();
  const [team, setTeam] = useState<Row | null>(null);
  const [seasonTeam, setSeasonTeam] = useState<Row | null>(null);
  const [standings, setStandings] = useState<Row[]>([]);
  const [series, setSeries] = useState<Row[]>([]);
  const [seasonId, setSeasonId] = useState<number | null>(null);
  const [currentSeasonId, setCurrentSeasonId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const tabs: Row[] = tabsOf(team?.seasons_info || [], seasonStore.seasons || []);
  const info = (team?.seasons_info || []).find((row: Row) => row.season_id === seasonId) || null;
  const label = tabs.find((tab) => tab.id === seasonId)?.label || "";
  const roster = rosterOf(seasonTeam, seasonId);
  const rank = seasonRank(standings, teamId, seasonId);
  const rounds: Row[] = roundResults(series, teamId);
  const record = seriesRecord(rounds);
  const slug = seasonId ? seasonStore.slugOf(seasonId) : null;
  const stats = [{ label: "Rank", value: rank ? `${rank.rank} of ${rank.of}` : "—" }, { label: "Series", value: `${record.wins}–${record.losses}` }, { label: "Points", value: info?.final_score ?? "—" }, { label: "Points against", value: info?.points_against ?? "—" }, { label: "Points available", value: info?.points_available ?? "—" }];

  useEffect(() => {
    const start = async () => {
      try {
        const [loaded] = await Promise.all([teamStore.getTeam(teamId), loadSeasons()]);
        setTeam(loaded);
        const current = await resolveCurrentSeasonId(); setCurrentSeasonId(current);
        const tabRows: Row[] = tabsOf(loaded?.seasons_info || [], seasonStore.seasons || []);
        const ids = tabRows.map((tab) => tab.id); setSeasonId(ids.includes(current) ? current : ids[0] ?? null);
      } catch (e) { setError((e as Error).message || "Failed to load the team."); }
      finally { setLoading(false); }
    };
    start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamId]);

  useEffect(() => {
    if (!seasonId) return;
    let active = true;
    // the tab shows one season only, so the rows of the season before go before the reads
    queueMicrotask(() => { setStandings([]); setSeries([]); });
    Promise.all([teamStore.getTeamDetailsSeason(teamId, seasonId).catch(() => null), teamStore.getTeamsSeasonBasic(seasonId).catch(() => []), seriesStore.searchSeriesBySeason(seasonId).catch(() => [])]).then(([one, teams, rows]) => { if (active) { setSeasonTeam(one); setStandings(teams); setSeries(rows); } });
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seasonId, teamId]);

  return <div className="p-4">
    {loading ? <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/60"><Icon name="mdi-loading" size={64} className="animate-spin text-primary" /></div> : null}
    <StatusAlert modelValue={error} onClose={() => setError(null)} />
    {team ? <Card className="card mb-4 gap-0 py-0"><CardTitle className="flex items-center gap-3 bg-primary p-4 text-on-primary"><span className="block size-10 overflow-hidden rounded-full"><img className="size-full object-contain" src={teamImageUrl(team)} alt="" onError={showDefaultTeamImage} /></span><span><span className="block">{team.long_name || team.name}</span>{team.long_name ? <span className="block text-xs font-normal">{team.name}</span> : null}</span></CardTitle>
      {tabs.length ? <Tabs value={seasonId} onValueChange={(value) => setSeasonId(Number(value))} className="border-b px-4"><TabsList variant="line" className="max-w-full justify-start overflow-x-auto">{tabs.map((tab) => <TabsTrigger key={tab.id} value={tab.id} className="flex-none px-3">{tab.label}{tab.id === currentSeasonId ? <Icon name="mdi-star" title="Current season" /> : null}</TabsTrigger>)}</TabsList></Tabs> : null}
      {seasonId ? <CardContent className="flex flex-wrap gap-2 pt-4"><Button variant="outline" size="sm" nativeButton={false} render={<Link href={`/events/${seasonId}`} />}><Icon name="mdi-trophy-variant" />{label}</Button>{slug ? <Button variant="outline" size="sm" nativeButton={false} render={<Link href={`/team/${teamId}/season/${slug}`} />}><Icon name="mdi-shield-account" />Season team page</Button> : null}</CardContent> : null}
      {info ? <CardContent className="grid grid-cols-[repeat(auto-fit,minmax(104px,1fr))] gap-x-4 gap-y-3 pb-4">{stats.map((stat) => <div key={stat.label} className="text-right"><div className="text-xs text-muted-foreground">{pointsNotes[stat.label] ? <ColumnNote title={stat.label} note={pointsNotes[stat.label]} /> : stat.label}</div><div className="tnum text-lg">{stat.value}</div></div>)}</CardContent> : null}
    </Card> : null}
    {team && rounds.length ? <Card className="card mb-4 gap-0 py-0"><CardTitle className="flex items-center gap-2 bg-primary p-4 text-on-primary"><Icon name="mdi-sword-cross" />Rounds</CardTitle><div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead className="w-[72px] text-right">Round</TableHead><TableHead>Opponent</TableHead><TableHead className="text-right">Series</TableHead><TableHead className="text-right">Points</TableHead></TableRow></TableHeader><TableBody>{rounds.map((row) => <TableRow key={row.matchId}><TableCell className="tnum text-right">{row.playday}</TableCell><TableCell><span className="flex items-center gap-2"><span className="block size-6 overflow-hidden rounded-sm"><img className="size-full object-contain" src={teamImageUrl(row.opponent)} alt="" onError={showDefaultTeamImage} /></span>{row.opponent?.long_name || row.opponent?.name}</span></TableCell><TableCell className="tnum whitespace-nowrap text-right">{row.wins}–{row.losses}{row.toPlay ? <span className="text-muted-foreground"> of {row.wins + row.losses + row.toPlay}</span> : null}</TableCell><TableCell className={`tnum whitespace-nowrap text-right ${row.pointsFor > row.pointsAgainst ? "font-bold" : ""}`}>{row.pointsFor}–{row.pointsAgainst}</TableCell></TableRow>)}</TableBody></Table></div></Card> : null}
    {team ? <TeamRoster captains={roster.captains} members={roster.members} /> : null}
  </div>;
}

export default TeamView;
