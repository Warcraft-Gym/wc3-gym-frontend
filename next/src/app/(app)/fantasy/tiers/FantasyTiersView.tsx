"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/Icon";
import { Pick } from "@/components/ui/Pick";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TableCell } from "@/components/ui/table";
import { DivisionBracketing } from "@/components/DivisionBracketing";
import { GroupedTable, type GroupedColumn } from "@/components/GroupedTable";
import { PageHeader } from "@/components/PageHeader";
import { PlayerName } from "@/components/PlayerName";
import { TeamName } from "@/components/TeamName";
import { SeasonSelect } from "@/components/SeasonSelect";
import { StatusAlert } from "@/components/StatusAlert";
import { W3CMmr } from "@/components/W3CMmr";
import { useLadderStore, usePlayerStore, useSeason, useSeasonStore, useTeamStore } from "@/stores";
import { bandOf, domainOf, quantileCuts, rangeText } from "@/helpers/divisions.mjs";
import { eventLabel } from "@/helpers/event-labels.mjs";
import { resolveCurrentW3CSeason } from "@/helpers/current-season.js";
import { ALL_COLORS, ALL_NAMES, tierChanges } from "@/helpers/tiers.mjs";
import { getW3CStatsWithFallback } from "@/helpers/w3c-stats";
import { cn } from "@/lib/utils";

// Bands ascend by MMR; tier numbers descend, so the top band is always tier 1.
// A season cutting fewer tiers drops the lowest names, so tier 1 stays Diamond.
const TIER_COUNTS = [2, 3, 4, 5, 6].map((count) => ({ value: count, title: String(count) }));

const NAMES = ALL_NAMES as string[];
const COLORS = ALL_COLORS as string[];

// Tailwind builds no class from a name held in data, so each tier chip is written out.
const TIER_CHIP: Record<string, string> = {
  "tier-1": "bg-tier-1 text-on-tier-1",
  "tier-2": "bg-tier-2 text-on-tier-2",
  "tier-3": "bg-tier-3 text-on-tier-3",
  "tier-4": "bg-tier-4 text-on-tier-4",
  "tier-5": "bg-tier-5 text-on-tier-5",
  "tier-6": "bg-tier-6 text-on-tier-6",
  tag: "bg-tag text-on-tag",
};

type Row = { id: number; player: any; race: string | null; mmr: number; team: any };

// The pool: every signup on a team this season, with its team name
const poolRows = (signups: any[], teams: any[], seasonId: number | null, w3cSeason: any): Row[] => {
  const teamOf = new Map<number, any>();
  for (const team of teams || []) {
    for (const player of team.player_by_season?.[seasonId as number] || []) teamOf.set(player.id, team);
  }
  return signups
    .filter((player) => teamOf.has(player.id))
    .map((player) => ({
      id: player.id,
      player,
      race: player.signup_race,
      mmr: (getW3CStatsWithFallback(player, player.signup_race, w3cSeason) as any)?.mmr ?? 0,
      team: teamOf.get(player.id),
    }));
};

const columns: GroupedColumn[] = [
  { key: "name", title: "Player" },
  { key: "mmr", title: "W3C MMR", align: "right" },
  { key: "team", title: "Team" },
  { key: "tier", title: "Tier" },
  { key: "move", title: "Move to" },
];

/** The admin page that cuts a season's roster into fantasy tiers by W3C MMR. */
export function FantasyTiersView() {
  const ladderStore = useLadderStore();
  const playerStore = usePlayerStore();
  const seasonStore = useSeasonStore();
  const teamStore = useTeamStore();
  const { selectedSeasonId: currentSeasonId } = useSeason();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [currentSeason, setCurrentSeason] = useState<any>(null);
  // A commenced season's tiers are locked until the admin unlocks them: moving a cut moves drafted players
  const [locked, setLocked] = useState(false);
  const [currentW3CSeason, setCurrentW3CSeason] = useState<any>(null);
  const [tierCount, setTierCount] = useState(NAMES.length);
  const [signups, setSignups] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [cuts, setCuts] = useState<number[]>([]);
  const [moves, setMoves] = useState<Record<number, number>>({}); // player id -> band pinned by hand

  const seasonName = eventLabel(currentSeason) || "season";
  const phase = currentSeason?.phase ?? "open";
  const names = NAMES.slice(-tierCount);
  const colors = COLORS.slice(-tierCount);
  const tierOf = (band: number) => tierCount - band;

  const moveItems = [
    { value: -1, title: "By MMR" },
    ...names.map((name, i) => ({ value: i, title: `Tier ${tierOf(i)} · ${name}` })).reverse(),
  ];

  const rows = useMemo(() => poolRows(signups, teams, currentSeasonId, currentW3CSeason), [signups, teams, currentSeasonId, currentW3CSeason]);
  const domain = domainOf(rows.map((row) => row.mmr));
  const bandFor = (row: Row) => moves[row.id] ?? (row.mmr > 0 ? (bandOf(row.mmr, cuts) as number) : null);
  const stripPlayers = rows.map((row) => ({ id: row.id, label: row.player.name, mmr: row.mmr, band: bandFor(row), pinned: row.id in moves }));
  const groups = (() => {
    const banded = names
      .map((name, i) => ({
        key: i as string | number,
        title: `Tier ${tierOf(i)} · ${name}`,
        color: colors[i],
        range: rangeText(i, cuts),
        rows: rows.filter((row) => bandFor(row) === i).sort((a, b) => b.mmr - a.mmr),
      }))
      .reverse();
    const none = rows.filter((row) => bandFor(row) === null);
    return none.length ? [...banded, { key: "none", title: "No W3C MMR", color: "tag", range: "not applied, move by hand", rows: none }] : banded;
  })();

  // What the last Apply wrote, so the page can say whether the chart still matches it
  const stored: number[] = currentSeason?.fantasy_tier_cuts ?? [];
  // A stored pin comes back on the signup as a tier number; a live pin is a band index
  const storedPins = Object.fromEntries(signups.filter((player) => player.fantasy_tier_pinned).map((player) => [player.id, player.fantasy_tier]));
  const livePins = Object.fromEntries(Object.entries(moves).map(([id, band]) => [id, tierOf(band)]));
  const changes: string[] = tierChanges(cuts, stored, names, livePins, storedPins);
  // a half-loaded page would call the old cuts a change
  const tierState =
    isLoading || !currentSeason
      ? null
      : !stored.length
        ? { type: "warning" as const, text: `No tiers are stored for ${seasonName}. The chart proposes an even split of today's W3C MMR.` }
        : changes.length
          ? { type: "warning" as const, text: `Changed since the last Apply: ${changes.join("; ")}.` }
          : { type: "success" as const, text: `These ${tierCount} tiers are the ones stored for ${seasonName}.` };
  // One alert carries both the season's lock state and the stored-tier state; the lock itself sits with the other controls
  const phaseText = phase !== "open" ? `${seasonName} has ${phase === "complete" ? "ended" : "commenced"}, so its tiers are ${locked ? "locked" : "unlocked"}. ` : "";

  const evenSplit = () => setCuts(quantileCuts(rows.map((row) => row.mmr), tierCount));
  // A pin is a band index, so it means something else after the count changes
  const pickCount = (count: number | null) => {
    if (count == null) return;
    setTierCount(count);
    setMoves({});
    setCuts(quantileCuts(rows.map((row) => row.mmr), count));
  };
  const move = (id: number, band: number) =>
    setMoves((was) => {
      const next = { ...was };
      if (band === -1) delete next[id];
      else next[id] = band;
      return next;
    });

  useEffect(() => {
    if (!currentSeasonId) return; // the picker resolves one
    const seasonId = currentSeasonId;
    (async () => {
      setIsLoading(true);
      setErrorMessage(null);
      setSuccessMessage(null);
      setMoves({});
      try {
        const season = await seasonStore.fetchSeason(seasonId);
        setCurrentSeason(season);
        setLocked((season.phase ?? "open") !== "open");
        const w3cSeason = await resolveCurrentW3CSeason();
        setCurrentW3CSeason(w3cSeason);
        const signupRows = (await seasonStore.fetchSeasonSignups(seasonId)) || [];
        setSignups(signupRows);
        const teamRows = (await teamStore.fetchTeamsBySeason(seasonId)) || [];
        setTeams(teamRows);
        // The page reopens on the cuts the last Apply wrote, once there are any
        if (season.fantasy_tier_cuts.length) {
          const count = season.fantasy_tier_cuts.length + 1;
          setTierCount(count);
          setCuts(season.fantasy_tier_cuts);
          // A tier set by hand comes back as its pin; the rest follow the MMR
          setMoves(Object.fromEntries(signupRows.filter((p: any) => p.fantasy_tier_pinned).map((p: any) => [p.id, count - p.fantasy_tier])));
        } else {
          setCuts(quantileCuts(poolRows(signupRows, teamRows, seasonId, w3cSeason).map((row) => row.mmr), tierCount));
        }
      } catch (error) {
        console.error("Error loading data:", error);
        setErrorMessage("Failed to load player data. Please try again.");
      } finally {
        setIsLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSeasonId]);

  const applyTiers = async () => {
    // Only a pin is written; every other tier is read from the MMR on today's date
    const allocation: Record<number, number> = {};
    for (const row of rows) if (row.id in moves) allocation[row.id] = tierOf(moves[row.id]);
    const pinned = Object.keys(allocation).length;
    // A commenced season's drafted rosters follow the tiers, so the confirm says so
    const commenced = phase !== "open" ? " This season has started: tiers already drafted against will move." : "";
    if (!window.confirm(`Write ${tierCount} tiers, ${pinned} set by hand? Every other player follows their W3C MMR as of today.${commenced}`)) return;

    setIsSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      // The cuts carry the count, so one request replaces the whole allocation
      await playerStore.updateFantasyTiers(currentSeasonId as number, cuts, allocation);
      // The tiers read from the stored ladder matches, so the pool is synced up to today
      const sync = await ladderStore.syncSeason(currentSeasonId as number);
      const synced = `${sync.synced.length} of ${sync.synced.length + sync.skipped.length + sync.failed.length} players synced`;
      setSuccessMessage(`${tierCount} tiers written, ${pinned} set by hand. ${synced}.`);
      // The page re-reads what it wrote, so the stored-tier alert stops warning
      setCurrentSeason(await seasonStore.fetchSeason(currentSeasonId as number));
      setSignups((await seasonStore.fetchSeasonSignups(currentSeasonId as number)) || []);
    } catch (error) {
      console.error("Error applying tier allocation:", error);
      setErrorMessage("Failed to apply tier allocation. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-4">
      {/* The page dims while the roster loads. */}
      {isLoading ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/60">
          <span className="size-16 animate-spin rounded-full border-8 border-primary border-t-transparent" />
        </div>
      ) : null}

      <PageHeader
        title={
          <>
            <Icon name="mdi-trophy-variant" className="mr-2" />
            Fantasy Player Tiers
          </>
        }
      >
        <p className="w-full text-muted-foreground">
          Cut the {seasonName} roster into {tierCount} tiers by <W3CMmr />
        </p>
        <div className="w-full sm:w-auto">
          <SeasonSelect />
        </div>
        <Pick labelAfter className="w-[110px]" label="Tiers" items={TIER_COUNTS} value={tierCount} onChange={pickCount} disabled={locked} />
        {phase !== "open" ? (
          <Button variant="outline" onClick={() => setLocked(!locked)}>
            <Icon name={locked ? "mdi-lock-open-variant" : "mdi-lock"} />
            {locked ? "Unlock" : "Lock"}
          </Button>
        ) : null}
        <Button variant="outline" disabled={locked || !rows.length} onClick={evenSplit}>
          <Icon name="mdi-scale-balance" />
          Even split
        </Button>
        <Button disabled={locked || isSaving || !rows.length} onClick={applyTiers}>
          <Icon name={isSaving ? "mdi-loading mdi-spin" : "mdi-content-save"} />
          Apply tiers
        </Button>
      </PageHeader>

      {tierState || phase !== "open" ? <StatusAlert modelValue={`${phaseText}${tierState?.text ?? ""}`} type={tierState?.type ?? "info"} closable={false} /> : null}
      <StatusAlert modelValue={errorMessage} onClose={() => setErrorMessage(null)} />
      <StatusAlert modelValue={successMessage} type="success" onClose={() => setSuccessMessage(null)} />

      <Card className="card mb-4 p-4">
        <DivisionBracketing cuts={cuts} onUpdateCuts={setCuts} players={stripPlayers} names={names} colors={colors} domain={domain} stored={stored} disabled={locked} />
      </Card>

      <Card className="card gap-0 py-0">
        <GroupedTable
          columns={columns}
          groups={groups}
          empty="No players on a team this season"
          head={{ mmr: <W3CMmr /> }}
          group={({ group }) => (
            <TableCell colSpan={columns.length}>
              <Badge className={cn("mr-2", TIER_CHIP[group.color])}>{group.title}</Badge>
              <span className="mr-2 text-muted-foreground">
                {group.rows.length} {group.rows.length === 1 ? "player" : "players"}
              </span>
              <span className="text-[rgba(var(--v-theme-on-surface),0.38)]">{group.range}</span>
            </TableCell>
          )}
          rows={({ group }) =>
            group.rows.map((row) => (
              <tr key={row.id} className="detail-row border-b">
                <TableCell />
                <TableCell>
                  <PlayerName player={row.player} race={row.race ?? undefined} />
                </TableCell>
                <TableCell className="tnum text-right">{row.mmr || "—"}</TableCell>
                <TableCell><TeamName team={row.team} /></TableCell>
                <TableCell>
                  {row.player.fantasy_tier ? (
                    <Badge variant={row.player.fantasy_tier_pinned ? "secondary" : "outline"} className="text-xs">
                      {row.player.fantasy_tier_pinned ? <Icon name="mdi-pin" size={12} /> : null}T{row.player.fantasy_tier}
                    </Badge>
                  ) : null}
                </TableCell>
                <TableCell>
                  <Select value={moves[row.id] ?? -1} onValueChange={(next) => move(row.id, next as number)} disabled={locked}>
                    <SelectTrigger aria-label={`Move ${row.player.name}`} className="w-full max-w-[200px]">
                      <SelectValue>{(chosen: number) => moveItems.find((item) => item.value === chosen)?.title ?? ""}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {moveItems.map((item) => (
                        <SelectItem key={item.value} value={item.value}>
                          {item.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
              </tr>
            ))
          }
        />
      </Card>
    </div>
  );
}

export default FantasyTiersView;
