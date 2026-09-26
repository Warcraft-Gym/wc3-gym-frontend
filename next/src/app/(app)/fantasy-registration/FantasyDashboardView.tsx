"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { DateTime } from "luxon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Combobox } from "@/components/ui/Combobox";
import { DataTable } from "@/components/ui/DataTable";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Field } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { TableCell } from "@/components/ui/table";
import { GroupedTable, type GroupedColumn } from "@/components/GroupedTable";
import { PageHeader } from "@/components/PageHeader";
import { PlayerName } from "@/components/PlayerName";
import { TeamName } from "@/components/TeamName";
import { RaceIcon } from "@/components/RaceIcon";
import { RaceSelect } from "@/components/RaceSelect";
import { SeasonSelect } from "@/components/SeasonSelect";
import { StatusAlert } from "@/components/StatusAlert";
import { W3CMmr } from "@/components/W3CMmr";
import { LadderDayBars } from "@/components/ladder/LadderDayBars";
import { MatchupCompare } from "@/components/ladder/MatchupCompare";
import { PlayerLadderPanel } from "@/components/ladder/PlayerLadderPanel";
import { MD_AND_UP, useBreakpoint } from "@/hooks/breakpoint";
import { useConfigStore, useFantasyStore, useSeason, useSeasonStore, useSeriesStore, useTeamStore } from "@/stores";
import { formatDateTime } from "@/helpers/datetime";
import { eventLabel } from "@/helpers/event-labels.mjs";
import { betsOpen, isScored, validateBetPoints as checkBetPoints } from "@/helpers/bets.mjs";
import { ALL_COLORS, ALL_NAMES } from "@/helpers/tiers.mjs";
import { record } from "@/helpers/figures.mjs";
import { fillDays, maxGamesPerDay } from "@/helpers/ladder-days.mjs";
import { showDefaultTeamImage, teamImageUrl } from "@/helpers/team-image";
import { cn } from "@/lib/utils";

// Tier 1 is always Diamond, so a season cutting fewer tiers drops the names off the bottom
const tierNames = [...(ALL_NAMES as string[])].reverse();
const tierColors = [...(ALL_COLORS as string[])].reverse();

// Tailwind builds no class from a name held in data, so each tier chip is written out.
const TIER_CHIP: Record<string, string> = {
  "tier-1": "bg-tier-1 text-on-tier-1",
  "tier-2": "bg-tier-2 text-on-tier-2",
  "tier-3": "bg-tier-3 text-on-tier-3",
  "tier-4": "bg-tier-4 text-on-tier-4",
  "tier-5": "bg-tier-5 text-on-tier-5",
  "tier-6": "bg-tier-6 text-on-tier-6",
};

const phoneCell = "hidden min-[960px]:table-cell";

// "Saul's Angels (SA)"; a team without a long name shows its tag alone
const teamTitle = (team: any) => (team.long_name ? `${team.long_name} (${team.name})` : team.name);

const emptyForm = (seasonId: number | null) => ({
  name: "",
  season_id: seasonId,
  drafted_team_id: null as number | null,
  grind_team_id: null as number | null,
  drafted_race: null as string | null,
});

const fmtDay = (iso: string) => DateTime.fromISO(iso).toFormat("d MMM");

const betBadge = (result?: string | null) => (result === "WIN" ? "bg-win text-on-win" : result === "LOSS" ? "bg-loss text-on-loss" : "bg-secondary text-on-secondary");

/** A member's own fantasy team: the tiered draft, and one bet per fantasy match of the season. */
export function FantasyDashboardView() {
  const fantasyStore = useFantasyStore();
  const teamStore = useTeamStore();
  const seasonStore = useSeasonStore();
  const configStore = useConfigStore();
  const seriesStore = useSeriesStore();
  const { selectedSeasonId, setSelectedSeasonId } = useSeason();
  const searchParams = useSearchParams();
  const mdAndUp = useBreakpoint(MD_AND_UP);

  // the first fetch runs from the mount effect, so the scrim is up before it starts
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isBetSaving, setIsBetSaving] = useState(false);
  const [isCreationEnabled, setIsCreationEnabled] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [playerData, setPlayerData] = useState<any>(null);
  const [playerLoaded, setPlayerLoaded] = useState(false);
  const [existingTeam, setExistingTeam] = useState<any>(null);
  const [teams, setTeams] = useState<any[]>([]);
  const [availablePlayers, setAvailablePlayers] = useState<any[]>([]);

  // The picked season; a team is drafted while it is open, a complete one is read-only
  const [season, setSeason] = useState<any>(null);
  const [tierCount, setTierCount] = useState(tierNames.length);
  const [tierSelections, setTierSelections] = useState<Record<number, number | null>>({});
  const [teamForm, setTeamForm] = useState(emptyForm(null));

  // The ladder record of every signup, for the draft rows and the bet rows
  const [ladderPlayers, setLadderPlayers] = useState<any[]>([]);
  const [openRows, setOpenRows] = useState<Set<number>>(new Set());

  // Betting state
  const [fantasySeries, setFantasySeries] = useState<any[]>([]);
  const [fantasyBets, setFantasyBets] = useState<any[]>([]);
  const [betDialog, setBetDialog] = useState(false);
  const [betSeries, setBetSeries] = useState<any>({});
  const [selectedBetWinnerId, setSelectedBetWinnerId] = useState<number | null>(null);
  const [betPoints, setBetPoints] = useState<number | null>(null);
  const [useFixedBetPoints, setUseFixedBetPoints] = useState(false);
  const [fixedBetPointsValue, setFixedBetPointsValue] = useState(0);
  const [minBetPoints, setMinBetPoints] = useState<number | null>(null);
  const [maxBetPoints, setMaxBetPoints] = useState<number | null>(null);
  const [betPointsError, setBetPointsError] = useState<string | null>(null);
  const [betError, setBetError] = useState<string | null>(null);

  const seasonName = eventLabel(season) || "this season";
  const phase = season?.phase ?? "open";
  const ended = phase === "complete";
  const canDraft = !!season && isCreationEnabled && phase === "open" && tierCount > 0;

  const tiers = useMemo(() => Array.from({ length: tierCount }, (_, i) => i + 1), [tierCount]);
  const emptyTierSelections = (count: number) => Object.fromEntries(Array.from({ length: count }, (_, i) => [i + 1, null]));

  const ladderById = useMemo(() => new Map(ladderPlayers.map((player) => [player.id, player])), [ladderPlayers]);
  const ladderWindow = season?.start_date ? { start: season.start_date, end: season.end_date || DateTime.now().toISODate() } : null;
  const windowLabel = ladderWindow ? `${fmtDay(ladderWindow.start)} – ${fmtDay(ladderWindow.end)}` : "";
  const ymax = maxGamesPerDay(ladderPlayers);
  const daysById = useMemo(
    () => new Map(ladderPlayers.map((player) => [player.id, ladderWindow ? fillDays(player.per_day, ladderWindow.start, ladderWindow.end) : null])),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ladderPlayers, ladderWindow?.start, ladderWindow?.end],
  );
  const seasonParam = searchParams.get("season");
  const ladderTo = seasonParam ? `/ladder?season=${seasonParam}` : "/ladder";
  const toggleRow = (id: number) =>
    setOpenRows((was) => {
      const next = new Set(was);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const draftColumns: GroupedColumn[] = [
    { key: "name", title: "Player" },
    { key: "team", title: "Team", phone: false },
    { key: "mmr", title: "W3C MMR", align: "right" },
    { key: "record", title: "Record", align: "right", phone: false },
    { key: "ladder", title: windowLabel ? `Ladder · ${windowLabel}` : "Ladder", phone: false },
    { key: "open", title: "" },
  ];

  // Organize players by tier based on the fantasy_tier attribute
  const playersByTier = useMemo(() => {
    const byTier: Record<number, any[]> = Object.fromEntries(tiers.map((tier) => [tier, []]));
    // Only include players that have an explicit fantasy_tier set
    availablePlayers.forEach((player) => {
      if (player.fantasy_tier >= 1 && player.fantasy_tier <= tierCount) byTier[player.fantasy_tier].push(player);
    });
    return byTier;
  }, [availablePlayers, tiers, tierCount]);

  const draftGroups = tiers.map((tier) => ({
    key: tier as string | number,
    tier,
    title: `Tier ${tier} · ${tierNames[tier - 1]}`,
    color: tierColors[tier - 1],
    rows: (playersByTier[tier] || []).map((player) => {
      const ladder = ladderById.get(player.id) || null;
      return { ...player, ladder, days: daysById.get(player.id) || null };
    }),
  }));

  // Every tier's pick, in tier order
  const selectedPlayers = tiers.map((tier) => availablePlayers.find((player) => player.id === tierSelections[tier])).filter(Boolean);
  const playerIds = selectedPlayers.map((player: any) => player.id);

  // The answer carries only the id, so the name comes from the season's teams
  const grindTeamName = teams.find((team) => team.id === existingTeam?.grind_team_id)?.name;

  // Merge fantasy series with the member's bets
  const fantasySeriesWithBets = useMemo(
    () => fantasySeries.map((series) => ({ ...series, myBet: fantasyBets.find((bet) => bet.series_id === series.id) || null })),
    [fantasySeries, fantasyBets],
  );

  const formOf = (team: any) => ({
    name: team.name || "",
    season_id: team.season_id,
    drafted_team_id: team.drafted_team_id,
    grind_team_id: team.grind_team_id ?? null,
    drafted_race: team.drafted_race,
  });

  // Each drafted player lands in the tier slot their fantasy_tier names
  const selectionsFrom = (ids: number[], pool: any[], count: number) => {
    const selections: Record<number, number | null> = emptyTierSelections(count);
    ids.forEach((id) => {
      const player = pool.find((row) => row.id === id);
      if (player && player.fantasy_tier >= 1 && player.fantasy_tier <= count) selections[player.fantasy_tier] = id;
    });
    return selections;
  };

  const fetchFantasyData = async (team: any, seasonId: number | null, userId?: number) => {
    if (!team || !seasonId) return;
    try {
      // The fantasy matches of the season, where is_fantasy_match = true
      setFantasySeries((await seriesStore.searchSeriesBySeason(seasonId, "is_fantasy_match==True")) ?? []);
      if (userId) setFantasyBets(await fantasyStore.searchBets(`season_id == ${seasonId} AND user_id == ${userId}`));
    } catch (error) {
      console.error("Error fetching fantasy data:", error);
      // Don't show error to user, fantasy is optional
    }
  };

  // The settings and the member, once
  useEffect(() => {
    (async () => {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        // Check if fantasy team creation is enabled
        try {
          const setting = await configStore.fetchSetting("fantasy_team_creation_enabled");
          setIsCreationEnabled(!!setting?.value && setting.value.toLowerCase() === "true");
        } catch {
          setIsCreationEnabled(false);
        }

        // Load bet points settings
        try {
          const fixedBetPointsSetting = await configStore.fetchSetting("fantasy_fixed_bet_points");
          setUseFixedBetPoints(!!fixedBetPointsSetting?.value && fixedBetPointsSetting.value.toLowerCase() === "true");
          const betPointsValueSetting = await configStore.fetchSetting("fantasy_bet_points_value");
          setFixedBetPointsValue(betPointsValueSetting?.value ? parseInt(betPointsValueSetting.value) : 0);
          const minBetPointsSetting = await configStore.fetchSetting("fantasy_min_bet_points");
          setMinBetPoints(minBetPointsSetting?.value ? parseInt(minBetPointsSetting.value) : null);
          const maxBetPointsSetting = await configStore.fetchSetting("fantasy_max_bet_points");
          setMaxBetPoints(maxBetPointsSetting?.value ? parseInt(maxBetPointsSetting.value) : null);
        } catch {
          setUseFixedBetPoints(false);
          setFixedBetPointsValue(0);
          setMinBetPoints(null);
          setMaxBetPoints(null);
        }

        // the backend reads the member off the session bearer
        let me: any = null;
        try {
          me = await fantasyStore.public_getUserInfo();
        } catch {
          setErrorMessage("Could not load your player data. Please try again later.");
          return;
        }
        setPlayerData(me);
        setPlayerLoaded(true);
        // The page opens on the current season; the season effect loads a changed pick
        if (me.season_id && me.season_id !== selectedSeasonId) setSelectedSeasonId(me.season_id);
      } catch (error) {
        console.error("Failed to load data:", error);
        setErrorMessage("Failed to load registration data. Please try again later.");
      } finally {
        setIsLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The picked season's team, pool and bets; nothing before the member is known
  useEffect(() => {
    if (!selectedSeasonId || !playerLoaded) return;
    const seasonId = selectedSeasonId;
    (async () => {
      setIsLoading(true);
      setExistingTeam(null);
      setIsEditing(false);
      setFantasySeries([]);
      setFantasyBets([]);
      try {
        const picked = await seasonStore.fetchSeason(seasonId);
        setSeason(picked);
        const count = picked.fantasy_tiers;
        setTierCount(count);
        setTeams((await teamStore.fetchTeamsBySeasonBasic(seasonId)) || []);

        // The draft pool: the season's signups, carrying signup_race and race_mmrs
        let pool = (await seasonStore.fetchSeasonSignups(seasonId)) || [];
        setLadderPlayers(await seasonStore.fetchSeasonLadderPlayers(seasonId).catch(() => []));

        // Search for an existing team by captain and season
        let team = null;
        if (playerData?.user?.id) {
          const found = await fantasyStore.searchTeams(`captain_id == ${playerData.user.id} and season_id == ${seasonId}`);
          team = found?.length ? found[0] : null;
        }
        if (team) {
          // A drafted player removed from signups since the draft still keeps his roster spot
          const knownIds = new Set(pool.map((player: any) => player.id));
          const missingDrafted = (team.drafted_players || []).filter((player: any) => player && !knownIds.has(player.id));
          if (missingDrafted.length > 0) pool = [...pool, ...missingDrafted];
          setTeamForm(formOf(team));
          setTierSelections(selectionsFrom(team.drafted_players?.map((player: any) => player.id) || [], pool, count));
          setExistingTeam(team);
          await fetchFantasyData(team, seasonId, playerData?.user?.id);
        } else {
          setTeamForm(emptyForm(seasonId));
          setTierSelections(emptyTierSelections(count));
        }
        setAvailablePlayers(pool);
      } catch (error) {
        console.error("Failed to load the season:", error);
        setErrorMessage("Failed to load registration data. Please try again later.");
      } finally {
        setIsLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSeasonId, playerLoaded]);

  const cancelEditing = () => {
    setIsEditing(false);
    // Reset the form to the existing team
    if (existingTeam) {
      setTeamForm(formOf(existingTeam));
      setTierSelections(selectionsFrom(existingTeam.drafted_players?.map((player: any) => player.id) || [], availablePlayers, tierCount));
    }
  };

  const submitTeam = async () => {
    // Validate all required fields
    if (!teamForm.name || !teamForm.season_id || !teamForm.drafted_team_id || !teamForm.drafted_race) {
      setErrorMessage("Please fill in all required fields (Fantasy team name, Draft a team, Draft a race).");
      return;
    }

    // Validate every tier the season cuts has a player selected
    const missingTiers = tierNames
      .slice(0, tierCount)
      .map((name, i) => (tierSelections[i + 1] ? null : `Tier ${i + 1} - ${name}`))
      .filter(Boolean);
    if (missingTiers.length > 0) {
      setErrorMessage(`Please select a player for all tiers. Missing: ${missingTiers.join(", ")}`);
      return;
    }
    if (playerIds.length !== tierCount) {
      setErrorMessage(`You must select exactly ${tierCount} players (one for each tier).`);
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      // Use the public fantasy-team endpoint
      const team = await fantasyStore.public_createFantasyTeam({
        name: teamForm.name,
        season_id: teamForm.season_id,
        drafted_team_id: teamForm.drafted_team_id,
        grind_team_id: teamForm.grind_team_id ?? null,
        drafted_race: teamForm.drafted_race,
        player_ids: playerIds,
        user_name: playerData?.user?.name || playerData?.discord_tag,
        battle_tag: playerData?.user?.battleTag || playerData?.discord_tag,
      });
      setSuccessMessage(existingTeam ? "Fantasy team updated successfully!" : "Fantasy team registered successfully!");
      setExistingTeam(team);
      // The user row is created with the first team, so the page takes the captain it answered
      if (!playerData.user && team.captain) setPlayerData({ ...playerData, user: team.captain });
      setIsEditing(false);
      await fetchFantasyData(team, teamForm.season_id, playerData?.user?.id ?? team.captain?.id);
    } catch (error: any) {
      console.error("Failed to save team:", error);
      if (error.error === "fantasy_team_creation_closed") setErrorMessage(error.message || "Fantasy team creation is currently closed.");
      else setErrorMessage(error.message || "Failed to save fantasy team. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const validateBetPoints = (points: number | null) => checkBetPoints(points, minBetPoints, maxBetPoints);

  const placeBet = (series: any) => {
    setBetSeries(series);
    setSelectedBetWinnerId(series.myBet?.winner_id || null);
    setBetPoints(series.myBet?.bet_points || null);
    setBetPointsError(null);
    setBetError(null);
    setBetDialog(true);
  };

  const closeBet = () => {
    setBetDialog(false);
    setBetError(null);
    setBetSeries({});
    setSelectedBetWinnerId(null);
    setBetPoints(null);
    setBetPointsError(null);
  };

  const saveBet = async () => {
    setIsBetSaving(true);
    try {
      const betData = {
        series_id: betSeries.id,
        season_id: teamForm.season_id,
        winner_id: selectedBetWinnerId,
        bet_points: betPoints, // Send as-is, the backend applies fixed points if configured
      };
      if (betSeries.myBet) {
        await fantasyStore.public_updateBet(betSeries.myBet.id, betData);
        setSuccessMessage("Bet updated successfully!");
      } else {
        await fantasyStore.public_createBet(betData);
        setSuccessMessage("Bet placed successfully!");
      }
      closeBet();
      await fetchFantasyData(existingTeam, teamForm.season_id, playerData?.user?.id);
    } catch (error: any) {
      console.error("Error saving bet:", error);
      setBetError(error.message || "Error saving bet. Please try again.");
    } finally {
      setIsBetSaving(false);
    }
  };

  const deleteBet = async () => {
    if (!betSeries.myBet) return;
    setIsBetSaving(true);
    try {
      await fantasyStore.public_deleteBet(betSeries.myBet.id);
      setSuccessMessage("Bet deleted successfully!");
      closeBet();
      await fetchFantasyData(existingTeam, teamForm.season_id, playerData?.user?.id);
    } catch (error: any) {
      console.error("Error deleting bet:", error);
      setBetError(error.message || "Error deleting bet. Please try again.");
    } finally {
      setIsBetSaving(false);
    }
  };

  const getBetPlayerName = (series: any, bet: any) => {
    if (!bet) return "";
    if (bet.winner_id === series.player1_id) return series.player1?.name || "Player 1";
    if (bet.winner_id === series.player2_id) return series.player2?.name || "Player 2";
    return "Unknown";
  };

  // For the betting view the score chip only carries the result, not the captain's score
  const scoreTone = (series: any) =>
    series.player1_score > series.player2_score ? "text-win border-win" : series.player2_score > series.player1_score ? "text-loss border-loss" : "text-draw border-draw";

  const teamItems = teams.map((team) => ({ value: String(team.id), title: teamTitle(team), team }));
  const teamRow = (item: { title: string; team: any }) => (
    <>
      <span className="block size-8 shrink-0 overflow-hidden rounded-full">
        <img className="size-full object-cover" src={teamImageUrl(item.team)} alt="" onError={showDefaultTeamImage} />
      </span>
      {item.title}
    </>
  );

  const betColumns: any[] = [
    {
      id: "players",
      header: "Match",
      enableSorting: false,
      cell: ({ row }: any) =>
        row.original.player1 && row.original.player2 ? (
          <MatchupCompare
            a={row.original.player1}
            b={row.original.player2}
            raceA={row.original.player1_race}
            raceB={row.original.player2_race}
            la={ladderById.get(row.original.player1.id)}
            lb={ladderById.get(row.original.player2.id)}
            ga={row.original.player1.record}
            gb={row.original.player2.record}
            daysA={daysById.get(row.original.player1.id)}
            daysB={daysById.get(row.original.player2.id)}
            ymax={ymax}
          />
        ) : null,
    },
    { id: "date_time", accessorKey: "date_time", header: "Date & time", cell: ({ row }: any) => formatDateTime(row.original.date_time) },
    {
      id: "my_bet",
      header: "My bet",
      enableSorting: false,
      cell: ({ row }: any) =>
        row.original.myBet ? (
          <Badge className={betBadge(row.original.myBet.bet_result)}>{getBetPlayerName(row.original, row.original.myBet)}</Badge>
        ) : (
          <span className="text-muted-foreground">No bet</span>
        ),
    },
    {
      id: "score",
      header: "Score",
      enableSorting: false,
      cell: ({ row }: any) =>
        isScored(row.original) ? (
          <Badge variant="outline" className={cn("tnum", scoreTone(row.original))}>
            {record(row.original.player1_score || 0, row.original.player2_score || 0) ?? "—"}
          </Badge>
        ) : (
          <span className="text-muted-foreground">Not played</span>
        ),
    },
    {
      id: "result",
      header: "Result",
      enableSorting: false,
      cell: ({ row }: any) =>
        row.original.myBet && isScored(row.original) ? (
          <Badge className={betBadge(row.original.myBet.bet_result)}>{row.original.myBet.bet_result || "PENDING"}</Badge>
        ) : (
          <span className="text-muted-foreground">{isScored(row.original) ? "No bet" : "-"}</span>
        ),
    },
    {
      id: "actions",
      header: "",
      enableSorting: false,
      cell: ({ row }: any) =>
        !ended && betsOpen(row.original) ? (
          <Button variant="outline" size="sm" disabled={isBetSaving} onClick={() => placeBet(row.original)}>
            {row.original.myBet ? "Change bet" : "Place bet"}
          </Button>
        ) : (
          <Badge className="bg-secondary text-on-secondary">Locked</Badge>
        ),
    },
  ];

  const pointsHint =
    minBetPoints && maxBetPoints
      ? `Enter between ${minBetPoints} and ${maxBetPoints} points`
      : minBetPoints
        ? `Minimum ${minBetPoints} points`
        : maxBetPoints
          ? `Maximum ${maxBetPoints} points`
          : "Enter the number of points you want to bet";

  return (
    <div className="p-4">
      {/* The page dims while the season loads. */}
      {isLoading ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/60">
          <span className="size-16 animate-spin rounded-full border-8 border-primary border-t-transparent" />
        </div>
      ) : null}

      <PageHeader
        title={
          <>
            <Icon name="mdi-trophy-variant" className="mr-2" />
            Fantasy Dashboard
          </>
        }
      >
        <div className="w-full sm:w-auto">
          <SeasonSelect />
        </div>
      </PageHeader>

      <StatusAlert modelValue={errorMessage} onClose={() => setErrorMessage(null)} />
      <StatusAlert modelValue={successMessage} type="success" onClose={() => setSuccessMessage(null)} />

      {/* Fantasy Team Card */}
      <Card className="card mb-6 gap-0 py-0">
        <CardHeader className="bg-primary p-4">
          <CardTitle className="flex flex-wrap items-center gap-2 text-on-primary">
            <Icon name="mdi-account-group" />
            <span>Fantasy team</span>
            {existingTeam ? (
              <Badge variant="outline" className="border-on-primary text-on-primary">
                Registered
              </Badge>
            ) : null}
            {phase !== "open" ? (
              <Badge variant="outline" className="border-on-primary text-on-primary">
                {seasonName} has {ended ? "ended" : "commenced"}
              </Badge>
            ) : null}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          {/* No team, and why the form is not here */}
          {!season && !existingTeam && !isLoading ? (
            <StatusAlert modelValue="The season did not load, so registration is unavailable. Please try again later." type="info" closable={false} />
          ) : ended && !existingTeam ? (
            <StatusAlert modelValue={`You had no fantasy team in ${seasonName}.`} type="info" closable={false} />
          ) : phase !== "open" && !existingTeam ? (
            <StatusAlert modelValue={`Team creation closed when ${seasonName} started.`} type="info" closable={false} />
          ) : !isCreationEnabled && !existingTeam ? (
            <StatusAlert modelValue="Team creation is closed" type="warning" closable={false} />
          ) : !tierCount && !existingTeam ? (
            <StatusAlert modelValue={`The player tiers for ${seasonName} are not cut yet. Registration opens once they are.`} type="info" closable={false} />
          ) : null}

          {/* Existing team */}
          {existingTeam && !isEditing ? (
            <Card className="card mb-4 gap-0 py-0">
              <CardContent className="p-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <div className="mb-2 flex flex-wrap items-center gap-1">
                      <strong>Captain:</strong>
                      {/* no race: the captain bets, they don't play */}
                      {existingTeam.captain ? <PlayerName player={existingTeam.captain} /> : <span>{playerData?.discord_tag || "N/A"}</span>}
                    </div>
                    <div className="mb-2">
                      <strong>Season:</strong> {eventLabel(existingTeam.season) || "N/A"}
                    </div>
                    <div className="mb-2 flex flex-wrap items-center gap-1">
                      <strong>Drafted team:</strong>
                      {existingTeam.drafted_team ? <TeamName team={existingTeam.drafted_team} /> : "N/A"}
                    </div>
                    {season?.fantasy_grind ? (
                      <div className="mb-2">
                        <strong>Grind team:</strong> {grindTeamName || "N/A"}
                      </div>
                    ) : null}
                    <div className="mb-2 flex flex-wrap items-center gap-1">
                      <strong>Drafted race:</strong>
                      {existingTeam.drafted_race ? <RaceIcon raceIdentifier={existingTeam.drafted_race} /> : null}
                    </div>
                  </div>
                  <div>
                    <div className="mb-2 tnum">
                      <strong>Total points:</strong> {existingTeam.total_points || 0}
                    </div>
                    <div className="text-xs tnum">
                      Player points: {existingTeam.player_points || 0}
                      <br />
                      Bench points: {existingTeam.bench_points || 0}
                      <br />
                      Team points: {existingTeam.team_points || 0}
                      <br />
                      Race points: {existingTeam.race_points || 0}
                      <br />
                      {season?.fantasy_grind ? (
                        <>
                          Grind points: {existingTeam.grind_points || 0}
                          <br />
                        </>
                      ) : null}
                      Bet points: {existingTeam.bet_points || 0}
                    </div>
                  </div>
                </div>

                <Separator className="my-4" />

                <div>
                  <strong className="mb-2 block">Drafted players:</strong>
                  <div className="flex flex-wrap gap-2">
                    {existingTeam.drafted_players?.length ? (
                      existingTeam.drafted_players.map((player: any) => (
                        <Badge key={player.id} variant="secondary">
                          {player.name}
                        </Badge>
                      ))
                    ) : (
                      <Badge className="bg-secondary text-on-secondary">No players selected</Badge>
                    )}
                  </div>
                </div>

                <div className="mt-4 flex justify-end">
                  {canDraft ? (
                    <Button onClick={() => setIsEditing(true)}>
                      <Icon name="mdi-pencil" />
                      Edit team
                    </Button>
                  ) : !ended ? (
                    <Badge variant="outline">Team editing is currently disabled</Badge>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          ) : null}

          {/* Registration and edit form */}
          {canDraft && (!existingTeam || isEditing) ? (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                submitTeam();
              }}
            >
              <Card className="card mb-4 gap-0 py-0">
                <CardHeader className="bg-primary p-4">
                  <CardTitle className="flex items-center gap-2 text-on-primary">
                    <Icon name="mdi-account-group" />
                    Team details
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 p-4 md:grid-cols-2">
                  <Field label="Fantasy team name *" htmlFor="team-name" className="md:col-span-2">
                    <Input
                      id="team-name"
                      required
                      placeholder="Enter your fantasy team name"
                      value={teamForm.name}
                      onChange={(event) => setTeamForm({ ...teamForm, name: event.target.value })}
                    />
                  </Field>
                  <Field label="Draft a team *" htmlFor="drafted-team">
                    <Combobox
                      id="drafted-team"
                      label="Draft a team"
                      items={teamItems}
                      value={teamForm.drafted_team_id == null ? null : String(teamForm.drafted_team_id)}
                      onChange={(value) => setTeamForm({ ...teamForm, drafted_team_id: value == null ? null : Number(value) })}
                      row={teamRow}
                    />
                  </Field>
                  <Field label="Draft a race *" htmlFor="drafted-race">
                    <RaceSelect
                      id="drafted-race"
                      label="Draft a race"
                      value={teamForm.drafted_race}
                      onChange={(value) => setTeamForm({ ...teamForm, drafted_race: value })}
                    />
                  </Field>
                  {season?.fantasy_grind ? (
                    <Field label="Grind team" htmlFor="grind-team">
                      <div className="flex items-center gap-1">
                        <Combobox
                          id="grind-team"
                          label="Grind team"
                          items={teamItems}
                          value={teamForm.grind_team_id == null ? null : String(teamForm.grind_team_id)}
                          onChange={(value) => setTeamForm({ ...teamForm, grind_team_id: value == null ? null : Number(value) })}
                          row={teamRow}
                        />
                        {teamForm.grind_team_id != null ? (
                          <Button variant="ghost" size="icon-sm" aria-label="Clear Grind team" onClick={() => setTeamForm({ ...teamForm, grind_team_id: null })}>
                            <Icon name="mdi-close" />
                          </Button>
                        ) : null}
                      </div>
                    </Field>
                  ) : null}
                </CardContent>
              </Card>

              <Card className="card mb-4 gap-0 py-0">
                <CardHeader className="bg-primary p-4">
                  <CardTitle className="flex items-center gap-2 text-on-primary">
                    <Icon name="mdi-account-multiple" />
                    Draft players
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <StatusAlert
                    modelValue={`Pick one player from each tier. Records and games are W3C ladder${windowLabel ? `, ${windowLabel}` : ""}.`}
                    type="info"
                    closable={false}
                  />

                  <GroupedTable
                    columns={draftColumns}
                    groups={draftGroups}
                    defaultOpen
                    empty="No players tiered this season"
                    head={{ mmr: <W3CMmr /> }}
                    group={({ group }) => (
                      <TableCell colSpan={draftColumns.length}>
                        <Badge className={cn("mr-2", TIER_CHIP[group.color])}>{group.title}</Badge>
                        <span className="text-muted-foreground">
                          {group.rows.length} {group.rows.length === 1 ? "player" : "players"}
                        </span>
                      </TableCell>
                    )}
                    rows={({ group }) =>
                      group.rows.flatMap((row: any) => [
                        <tr key={row.id} className={cn("detail-row border-b", tierSelections[group.tier] === row.id && "[&>td]:bg-[rgba(var(--v-theme-primary),0.06)]")}>
                          <TableCell>
                            <input
                              type="radio"
                              className="size-[18px] cursor-pointer align-middle accent-[rgb(var(--v-theme-primary))]"
                              name={`tier-${group.tier}`}
                              value={row.id}
                              aria-label={row.name}
                              disabled={!canDraft}
                              checked={tierSelections[group.tier] === row.id}
                              onChange={() => setTierSelections({ ...tierSelections, [group.tier]: row.id })}
                            />
                          </TableCell>
                          <TableCell>
                            <PlayerName player={row} race={row.signup_race} mmr={false} />
                          </TableCell>
                          <TableCell className={cn(phoneCell, "text-muted-foreground")}>
                            {row.ladder?.team ? <TeamName team={{ id: row.ladder.team_id, name: row.ladder.team, icon_url: row.ladder.team_icon_url }} /> : null}
                          </TableCell>
                          <TableCell className="tnum text-right">{row.ladder?.mmr?.current ?? "—"}</TableCell>
                          <TableCell className={cn(phoneCell, "tnum text-right")}>{(row.ladder && record(row.ladder.wins, row.ladder.losses)) || "—"}</TableCell>
                          <TableCell className={phoneCell}>
                            {row.days ? <LadderDayBars days={row.days} ymax={ymax} /> : <span className="text-muted-foreground">—</span>}
                          </TableCell>
                          <TableCell className="text-right">
                            {row.ladder ? (
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                aria-expanded={openRows.has(row.id)}
                                aria-label={`Ladder detail of ${row.name}`}
                                onClick={() => toggleRow(row.id)}
                              >
                                <Icon name={openRows.has(row.id) ? "mdi-chevron-up" : "mdi-chevron-down"} />
                              </Button>
                            ) : null}
                          </TableCell>
                        </tr>,
                        openRows.has(row.id) && row.ladder ? (
                          <tr key={`open-${row.id}`} className="detail-row">
                            <td />
                            <td colSpan={draftColumns.length} className="bg-[rgba(var(--v-theme-on-surface),0.02)] px-3 pt-2.5 pb-3">
                              <PlayerLadderPanel player={row.ladder} days={row.days} ymax={ymax} ladderTo={ladderTo} />
                            </td>
                          </tr>
                        ) : null,
                      ])
                    }
                  />
                </CardContent>
              </Card>

              <div className="flex justify-center gap-2">
                {isEditing ? (
                  <Button type="button" variant="outline" disabled={isSaving} onClick={cancelEditing}>
                    Cancel
                  </Button>
                ) : null}
                <Button type="submit" size="lg" className="bg-success text-on-success" disabled={isSaving}>
                  <Icon name={isSaving ? "mdi-loading mdi-spin" : isEditing ? "mdi-content-save" : "mdi-check-circle"} />
                  {isEditing ? "Update team" : "Register team"}
                </Button>
              </div>
            </form>
          ) : null}
        </CardContent>
      </Card>

      {/* Fantasy Bets Card */}
      <Card className="card gap-0 py-0">
        <CardHeader className="bg-primary p-4">
          <CardTitle className="flex items-center justify-between gap-2 text-on-primary">
            <span className="flex items-center gap-2">
              <Icon name="mdi-crystal-ball" />
              <span>Fantasy bets</span>
            </span>
            {existingTeam ? (
              <Badge variant="outline" className="border-on-primary text-on-primary">
                {fantasyBets.length} bets
              </Badge>
            ) : null}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          {/* No team, so no bets */}
          {!existingTeam && (ended || phase !== "open") ? (
            <StatusAlert modelValue={`No team in ${seasonName}, so no bets.`} type="info" closable={false} />
          ) : !existingTeam ? (
            <StatusAlert modelValue="Register a team first. You need to register a fantasy team before you can place bets on matches." type="info" closable={false} />
          ) : fantasySeries.length === 0 ? (
            <StatusAlert modelValue="No fantasy matches yet. No fantasy matches are scheduled for betting. They appear once the round is drawn." type="info" closable={false} />
          ) : (
            <DataTable
              data={fantasySeriesWithBets}
              columns={betColumns}
              rowId={(series: any) => String(series.id)}
              pageSize={10}
              mobileStack
              columnVisibility={{ score: mdAndUp }}
              empty="No fantasy matches yet"
            />
          )}
        </CardContent>
      </Card>

      {/* Place Bet Dialog */}
      <Dialog open={betDialog} onOpenChange={(open) => (open ? setBetDialog(true) : closeBet())} disablePointerDismissal>
        <DialogContent showCloseButton={false} className="gap-0 p-0 sm:max-w-[500px]">
          <DialogTitle className="flex items-center gap-2 bg-primary px-4 py-3 text-on-primary">Place fantasy bet</DialogTitle>

          <div className="flex flex-col gap-4 p-4">
            <StatusAlert modelValue={betError} onClose={() => setBetError(null)} />
            <div className="flex flex-wrap items-center gap-2">
              {betSeries.player1 ? <PlayerName player={betSeries.player1} race={betSeries.player1_race} plain /> : null}
              vs
              {betSeries.player2 ? <PlayerName player={betSeries.player2} race={betSeries.player2_race} plain /> : null}
            </div>

            <RadioGroup value={selectedBetWinnerId} onValueChange={(next) => setSelectedBetWinnerId(next as number)} aria-label="Select winner">
              {[
                { id: betSeries.player1_id, name: betSeries.player1?.name },
                { id: betSeries.player2_id, name: betSeries.player2?.name },
              ].map((side) => (
                <Label key={side.id} className="flex items-center gap-2 font-normal">
                  <RadioGroupItem value={side.id} />
                  {side.name}
                </Label>
              ))}
            </RadioGroup>

            {!useFixedBetPoints ? (
              <Field label="Bet points" hint={pointsHint} error={betPointsError} htmlFor="bet-points">
                <Input
                  id="bet-points"
                  type="number"
                  min={minBetPoints || 1}
                  max={maxBetPoints ?? undefined}
                  value={betPoints ?? ""}
                  onChange={(event) => {
                    const points = event.target.value === "" ? null : Number(event.target.value);
                    setBetPoints(points);
                    setBetPointsError(validateBetPoints(points));
                  }}
                  onBlur={() => setBetPointsError(validateBetPoints(betPoints))}
                />
              </Field>
            ) : (
              <StatusAlert modelValue={`This bet will be worth ${fixedBetPointsValue} points`} type="info" closable={false} />
            )}
          </div>

          <div className="flex flex-wrap justify-end gap-2 px-4 py-3">
            {betSeries.myBet ? (
              <Button variant="ghost" className="mr-auto text-error" disabled={isBetSaving} onClick={deleteBet}>
                Delete bet
              </Button>
            ) : null}
            <Button variant="ghost" disabled={isBetSaving} onClick={closeBet}>
              Cancel
            </Button>
            <Button disabled={!selectedBetWinnerId || isBetSaving || (!useFixedBetPoints && (!!betPointsError || !betPoints))} onClick={saveBet}>
              <Icon name={isBetSaving ? "mdi-loading mdi-spin" : "mdi-content-save"} />
              Save bet
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default FantasyDashboardView;
