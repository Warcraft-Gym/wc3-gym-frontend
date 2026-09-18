/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { Fragment, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AchievementChip } from "@/components/AchievementChip";
import { ColumnNote } from "@/components/ColumnNote";
import { FilterPanel } from "@/components/FilterPanel";
import { PageHeader } from "@/components/PageHeader";
import { PlayerName } from "@/components/PlayerName";
import { RaceIcon } from "@/components/RaceIcon";
import { SeasonSelect } from "@/components/SeasonSelect";
import { StatusAlert } from "@/components/StatusAlert";
import { SyncProgress } from "@/components/SyncProgress";
import { W3CIcon } from "@/components/W3CIcon";
import { W3CMmr } from "@/components/W3CMmr";
import { W3CSyncResultDialog, type SyncEntry } from "@/components/W3CSyncResultDialog";
import { BadgeRarity } from "@/components/ladder/BadgeRarity";
import { LadderLeaderboards } from "@/components/ladder/LadderLeaderboards";
import { PlayerLadderTab } from "@/components/ladder/PlayerLadderTab";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Icon } from "@/components/ui/Icon";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TapTooltip } from "@/components/ui/TapTooltip";
import { useTheme } from "@/hooks/theme";
import { useAuth, useLadderStore, usePlayerStore, useSeason } from "@/stores";
import w3championsLogo from "@/assets/media/w3champions-logo.png";
import w3championsLogoWhite from "@/assets/media/w3champions-logo-white.png";
import w3cLogo from "@/assets/media/w3c-logo.png";
import w3cLogoWhite from "@/assets/media/w3c-logo-white.png";
import { ACHIEVEMENTS_NOTE, LADDER_NOTE, SCORED_NOTE, TEAM_BADGES_NOTE, achievementPoints } from "@/helpers/achievements.js";
import { playerPath } from "@/helpers/players.mjs";
import { roundLabel } from "@/helpers/rounds.mjs";
import { showDefaultTeamImage, teamImageUrl } from "@/helpers/team-image.js";
import { agoFromIso, localFromIso } from "@/helpers/w3c-stats.js";
import { cn } from "@/lib/utils";

type Row = Record<string, any>;
// A column the table drops below the md breakpoint, as `mobile: false` does in the Vue table
const WIDE = "hidden min-[960px]:table-cell";
// A standings column the table drops below the sm breakpoint
const SM = "hidden min-[600px]:table-cell";
const COLUMNS = 11;

// The roster's badge points plus the team badges; the standing column and the season total
const teamBadgePoints = (team: Row) => team.points - team.ladder_points + achievementPoints(team.achievements);

export function LadderView() {
  const router = useRouter();
  const ladderStore = useLadderStore();
  const playerStore = usePlayerStore();
  const { isAdmin } = useAuth();
  const { seasons, selectedSeasonId, slugOf } = useSeason();
  // The dark-ink wordmark is made for the light theme; the dark theme takes the white original.
  const { activeTheme } = useTheme();
  const wordmark = activeTheme === "dark" ? w3championsLogoWhite : w3championsLogo;
  // The Sync button is a primary fill, so its mark follows on-primary: the inverse of the surface rule
  const syncMark = activeTheme === "dark" ? w3cLogo : w3cLogoWhite;

  const [ladder, setLadder] = useState<Row | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [searchName, setSearchName] = useState("");
  const [searchRace, setSearchRace] = useState<string | null>(null);
  const [searchTeam, setSearchTeam] = useState<number | null>(null);

  const [syncDialog, setSyncDialog] = useState(false);
  const [syncEntries, setSyncEntries] = useState<SyncEntry[]>([]);
  const [expanded, setExpanded] = useState<number[]>([]);
  const [fullPlayers, setFullPlayers] = useState<Record<number, Row>>({});
  const [sort, setSort] = useState<{ key: string; desc: boolean }>({ key: "points", desc: true });

  const loadLadder = async (seasonId: number) => {
    setExpanded([]);
    setIsLoading(true);
    setErrorMessage(null);
    try {
      setLadder(await ladderStore.seasonLadder(seasonId));
    } catch (error) {
      setLadder(null);
      setErrorMessage((error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!selectedSeasonId) return;
    // the loader sets state, so it runs just outside the effect body (react-hooks/set-state-in-effect)
    queueMicrotask(() => loadLadder(selectedSeasonId));
    // the store's members are rebuilt every render, so the season drives the read
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSeasonId]);

  // The ladder row carries no gnl_stats, so an expanding row reads the full player once
  useEffect(() => {
    (async () => {
      for (const id of expanded) {
        if (fullPlayers[id]) continue;
        try {
          const player = await playerStore.getPlayer(id);
          setFullPlayers((old) => ({ ...old, [id]: player }));
        } catch (error) {
          setErrorMessage((error as Error).message);
        }
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expanded]);

  const seasonName = seasons.find((season: Row) => season.id === selectedSeasonId)?.name ?? "";
  // The round label formats a start/end pair exactly as every other date on the page reads
  const season = ladder?.season;
  const seasonDates = season?.start_date && season?.end_date ? roundLabel(season) : "";
  const teams: Row[] = ladder?.teams ?? [];
  const seasonPoints = teams.reduce((sum, team) => sum + team.points, 0);
  const seasonBadgePoints = teams.reduce((sum, team) => sum + teamBadgePoints(team), 0);
  const seasonPlayers = teams.reduce((sum, team) => sum + team.players.length, 0);
  const teamOptions = teams.map((team) => ({ id: team.id, name: team.name }));

  // One row per player of the season, carrying the team he plays for
  const allPlayers: Row[] = teams.flatMap((team) =>
    team.players.map((player: Row) => ({
      ...player,
      teamId: team.id,
      teamName: team.name,
      badgePoints: player.points - player.ladder_points,
      mmr: player.mmr?.current ?? null,
      // A player still in his placement games has no MMR, so there is no span to subtract
      mmrDiff: player.mmr?.current != null && player.mmr?.start != null ? player.mmr.current - player.mmr.start : null,
    })),
  );

  // The backend leaves the season stamp null until every signup is stamped, so the
  // newest player stamp is what the caption and its tooltip read
  const newestSync = allPlayers.map((player) => player.synced_at).filter(Boolean).sort().at(-1) ?? null;
  // A season counts as synced only while every player of it carries a stamp
  const synced = allPlayers.filter((player) => player.synced_at).length;
  const syncCaption = !synced
    ? "never synced"
    : synced < allPlayers.length
      ? `partly synced · ${synced} of ${allPlayers.length} players`
      : `synced ${agoFromIso(newestSync)}`;

  const term = searchName.trim().toLowerCase();
  let filtered = allPlayers;
  if (term) filtered = filtered.filter((p) => (p.name || "").toLowerCase().includes(term) || (p.battleTag || "").toLowerCase().includes(term));
  if (searchRace) filtered = filtered.filter((p) => p.race === searchRace);
  if (searchTeam) filtered = filtered.filter((p) => p.teamId === searchTeam);
  const rows = [...filtered].sort((a, b) => {
    const av = a[sort.key] ?? null;
    const bv = b[sort.key] ?? null;
    if (av == null) return 1;
    if (bv == null) return -1;
    const order = typeof av === "number" && typeof bv === "number" ? av - bv : String(av).localeCompare(String(bv), undefined, { numeric: true });
    return order * (sort.desc ? -1 : 1);
  });

  const resetFilters = () => {
    setSearchName("");
    setSearchRace(null);
    setSearchTeam(null);
  };

  const syncLadder = async () => {
    setIsSyncing(true);
    setErrorMessage(null);
    try {
      const result = await ladderStore.syncSeason(selectedSeasonId as number);
      setSyncEntries([{ title: seasonName, result }]);
      setSyncDialog(true);
      await loadLadder(selectedSeasonId as number);
    } catch (error) {
      setErrorMessage((error as Error).message);
    } finally {
      setIsSyncing(false);
    }
  };

  const goToPlayer = (player: Row) => router.push(playerPath(player));
  const toggleExpanded = (id: number) => setExpanded((old) => (old.includes(id) ? old.filter((row) => row !== id) : [...old, id]));
  const toggleSort = (key: string) => setSort((old) => ({ key, desc: old.key === key ? !old.desc : false }));
  const sortIcon = (key: string) => (sort.key === key ? (sort.desc ? "mdi-arrow-down" : "mdi-arrow-up") : null);
  // A header that holds its own tooltip button takes the sort click on the cell, so the two never nest
  const noteHead = (label: React.ReactNode, key: string, className = "") => (
    <TableHead className={cn("cursor-pointer text-center select-none", sort.key === key && "text-primary", className)} onClick={() => toggleSort(key)}>
      {label}
    </TableHead>
  );
  const head = (label: React.ReactNode, key: string, className = "") => (
    <TableHead className={className}>
      <button type="button" className={cn("whitespace-nowrap", sort.key === key && "text-primary")} onClick={() => toggleSort(key)}>
        {label}
        <Icon name={sortIcon(key) ?? "mdi-arrow-up"} className={cn("ml-1 text-xs", sort.key !== key && "opacity-25")} />
      </button>
    </TableHead>
  );

  const syncButton = (
    <Button disabled={isSyncing || !selectedSeasonId} onClick={syncLadder}>
      <TapTooltip content="MMR and ladder matches" className="inline-flex items-baseline">
        <Icon name={isSyncing ? "mdi-loading mdi-spin" : "mdi-sync"} className="mr-1" />
        Sync
        <img src={syncMark.src} alt="W3C" className="ml-1 h-[1.4em] translate-y-[3%]" />
      </TapTooltip>
    </Button>
  );

  const teamAvatar = (team: Row | number, size: string) => (
    <span className={cn("block shrink-0 overflow-hidden rounded-sm", size)}>
      <img className="size-full object-contain" src={teamImageUrl(team)} alt="" onError={showDefaultTeamImage} />
    </span>
  );

  return (
    <div className="p-4">
      {isLoading ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/60">
          <Icon name="mdi-loading" size={64} className="animate-spin text-primary" />
        </div>
      ) : null}

      <PageHeader title={<img src={wordmark.src} alt="W3Champions" className="h-[1.35em]" />} />

      {/* Season picker and the sync of that season */}
      <div className="mb-2 flex flex-wrap items-center gap-3">
        <div className="w-full sm:w-[240px]"><SeasonSelect /></div>
        <div className="ms-auto min-w-[240px] text-right"><SyncProgress caption={syncCaption} stamp={localFromIso(newestSync)} /></div>
        {isAdmin ? syncButton : null}
      </div>

      <StatusAlert modelValue={errorMessage} onClose={() => setErrorMessage(null)} />

      {/* Empty state */}
      {ladder && !ladder.total_games ? (
        <Card className="card">
          <CardContent className="p-8 text-center">
            <W3CIcon size={64} className="mx-auto opacity-35" />
            <div className="mt-4 mb-2 text-xl text-muted-foreground">No ladder games synced for {seasonName}</div>
            <p className="mb-4 text-muted-foreground">
              {isAdmin ? "Sync the season to fetch its W3Champions matches" : "An admin syncs the season from W3Champions."}
            </p>
            {isAdmin ? syncButton : null}
            <div className="mx-auto mt-4 max-w-[320px]"><SyncProgress /></div>
          </CardContent>
        </Card>
      ) : null}

      {ladder && ladder.total_games ? (
        <>
          {/* Team standings */}
          <Card className="card mb-4 gap-0 py-0">
            <CardTitle className="flex items-center gap-2 bg-primary p-4 text-on-primary">
              <Icon name="mdi-trophy" />
              <span>Team standings</span>
            </CardTitle>
            <div className="p-2 text-xs text-muted-foreground">{seasonDates}</div>
            <div className="table-scroll overflow-x-auto">
              <Table className="tnum">
                <TableHeader>
                  <TableRow className="[&_th]:text-xs [&_th]:text-muted-foreground">
                    <TableHead>Team</TableHead>
                    <TableHead className="text-center"><ColumnNote title="Total points" note={SCORED_NOTE} /></TableHead>
                    <TableHead className={cn(SM, "text-center")}><ColumnNote title="Achievement points" note={TEAM_BADGES_NOTE} /></TableHead>
                    <TableHead className="text-center">Games</TableHead>
                    <TableHead className={cn(SM, "text-center")}>Players</TableHead>
                    <TableHead className={SM}>Team badges</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {teams.map((team, idx) => (
                    <TableRow key={team.id} className={cn(idx === 0 && "bg-primary/6")}>
                      <TableCell>
                        <div className="flex items-center">
                          {teamAvatar(team, "mr-2 size-6")}
                          <Link href={`/team/${team.id}/season/${slugOf(selectedSeasonId as number)}`}>{team.long_name || team.name}</Link>
                        </div>
                      </TableCell>
                      <TableCell className="text-center font-bold">{team.points}</TableCell>
                      <TableCell className={cn(SM, "text-center")}>{teamBadgePoints(team)}</TableCell>
                      <TableCell className="text-center">{team.games}</TableCell>
                      <TableCell className={cn(SM, "text-center")}>{team.players.length}</TableCell>
                      <TableCell className={SM}><AchievementChip badges={team.achievements} showPoints={false} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                {/* The season totals, under the column each one belongs to */}
                <tfoot>
                  <TableRow className="border-t">
                    <TableCell className="text-muted-foreground">{teams.length} teams</TableCell>
                    <TableCell className="text-center font-bold">{seasonPoints}</TableCell>
                    <TableCell className={cn(SM, "text-center")}>{seasonBadgePoints}</TableCell>
                    <TableCell className="text-center">{ladder.total_games}</TableCell>
                    <TableCell className={cn(SM, "text-center")}>{seasonPlayers}</TableCell>
                    <TableCell className={SM} />
                  </TableRow>
                </tfoot>
              </Table>
            </div>
          </Card>

          <LadderLeaderboards players={allPlayers} onOpenPlayer={goToPlayer} />
          <BadgeRarity rules={ladder.achievement_rules} teamRules={ladder.team_achievement_rules} players={allPlayers} teams={teams} />

          {/* Filters (reusable) */}
          <FilterPanel
            searchName={searchName}
            onSearchNameChange={setSearchName}
            searchRace={searchRace}
            onSearchRaceChange={setSearchRace}
            showSeason={false}
            showMMR={false}
            extraActive={searchTeam ? 1 : 0}
            onReset={resetFilters}
            after={
              <Select items={teamOptions.map((team) => ({ value: team.id, label: team.name }))} value={searchTeam} onValueChange={(value) => setSearchTeam(value as number | null)}>
                <SelectTrigger aria-label="Team" className="w-full md:w-[220px]">
                  <Icon name="mdi-shield-account" className="text-muted-foreground" />
                  <SelectValue placeholder="Team" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>All teams</SelectItem>
                  {teamOptions.map((team) => (
                    <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            }
          />

          {/* Players */}
          <Card className="card gap-0 py-0">
            <CardTitle className="flex items-center gap-2 bg-primary p-4 text-on-primary">
              <Icon name="mdi-account-group" />
              <span>Players</span>
            </CardTitle>
            <div className="table-scroll overflow-x-auto">
              <Table className="tnum">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12" />
                    {head("Name", "name")}
                    {head("Race", "race", cn(WIDE, "w-16"))}
                    {head("Team", "teamName", WIDE)}
                    {noteHead(<ColumnNote title="Ladder points" note={LADDER_NOTE} sortIcon={sortIcon("ladder_points")} />, "ladder_points", WIDE)}
                    {noteHead(<ColumnNote title="Achievements" note={ACHIEVEMENTS_NOTE} sortIcon={sortIcon("badgePoints")} />, "badgePoints", WIDE)}
                    {noteHead(<ColumnNote title="Total points" note={SCORED_NOTE} sortIcon={sortIcon("points")} />, "points")}
                    {head("Wins", "wins", WIDE)}
                    {head("Losses", "losses", WIDE)}
                    {head(<W3CMmr sortIcon={sortIcon("mmr")} />, "mmr", WIDE)}
                    {head(<W3CMmr suffix=" +/-" sortIcon={sortIcon("mmrDiff")} />, "mmrDiff", WIDE)}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => (
                    <Fragment key={row.id}>
                      <TableRow className="cursor-pointer" onClick={() => toggleExpanded(row.id)}>
                        <TableCell>
                          <Icon name={expanded.includes(row.id) ? "mdi-chevron-up" : "mdi-chevron-down"} />
                        </TableCell>
                        <TableCell>
                          <PlayerName player={row}>
                            {!row.synced_at ? (
                              <TapTooltip content="not fully synced" className="inline-flex">
                                <Icon name="mdi-sync-alert" size={12} className="text-warning" />
                              </TapTooltip>
                            ) : null}
                          </PlayerName>
                        </TableCell>
                        <TableCell className={WIDE}>{row.race ? <RaceIcon raceIdentifier={row.race} /> : null}</TableCell>
                        <TableCell className={WIDE}>
                          <div className="flex items-center">
                            {teamAvatar(row.teamId, "mr-2 size-5")}
                            <span>{row.teamName}</span>
                          </div>
                        </TableCell>
                        <TableCell className={WIDE}>{row.ladder_points}</TableCell>
                        <TableCell className={WIDE}><AchievementChip badges={row.achievements} /></TableCell>
                        <TableCell className="font-bold">{row.points}</TableCell>
                        <TableCell className={WIDE}>{row.wins}</TableCell>
                        <TableCell className={WIDE}>{row.losses}</TableCell>
                        <TableCell className={WIDE}>{row.mmr ?? "—"}</TableCell>
                        <TableCell className={WIDE}>{row.mmrDiff == null ? "—" : row.mmrDiff > 0 ? `+${row.mmrDiff}` : row.mmrDiff}</TableCell>
                      </TableRow>
                      {expanded.includes(row.id) ? (
                        <TableRow>
                          <TableCell colSpan={COLUMNS} className="p-0">
                            {/* sticky: stays in view when the summary row scrolls sideways on a narrow window */}
                            <div className="sticky left-0 max-w-[calc(100vw-48px)] p-4">
                              {!fullPlayers[row.id] ? (
                                <div className="p-4 text-center"><Icon name="mdi-loading" size={32} className="animate-spin text-primary" /></div>
                              ) : (
                                <PlayerLadderTab player={fullPlayers[row.id]} seasonId={selectedSeasonId as number} />
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : null}
                    </Fragment>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        </>
      ) : null}

      <W3CSyncResultDialog modelValue={syncDialog} entries={syncEntries} onUpdateModelValue={setSyncDialog} />
    </div>
  );
}

export default LadderView;
