/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { RaceIcon } from "@/components/RaceIcon";
import { W3CIcon } from "@/components/W3CIcon";
import { TapTooltip } from "@/components/ui/TapTooltip";
import { getW3CMMR, syncedAgo, syncedAt } from "@/helpers/w3c-stats";

export type Row = Record<string, any>;

/** Every MMR on this page reads the same w3champions season, so a sort never contradicts
 *  the number beside it. */
export const mmrOf = (player: Row | undefined | null, race?: string | null, season?: number) => getW3CMMR(player as Row, season as number, race as string);

/** The highest MMR across all races: the current w3champions season, else the one before it,
 *  else the last season the player has stats for. */
export function getHighestW3CMMR(player?: Row | null, season?: number): number | null {
  if (!player || !player.w3c_stats || player.w3c_stats.length === 0) return null;
  const getMax = (entries: Row[]) => (entries.length > 0 ? Math.max(...entries.map((s) => s.mmr || 0)) : null);
  if (season) {
    const current = player.w3c_stats.filter((s: Row) => s.wc3_season === season);
    if (current.length > 0) return getMax(current);
    const prev = player.w3c_stats.filter((s: Row) => s.wc3_season === season - 1);
    if (prev.length > 0) return getMax(prev);
  }
  const maxSeason = Math.max(...player.w3c_stats.map((s: Row) => s.wc3_season || 0));
  return getMax(player.w3c_stats.filter((s: Row) => s.wc3_season === maxSeason));
}

/** The races a player faced, from his gnl_stats matchup history for this season. */
export function getOpponentRaceHistory(player?: Row | null, seasonId?: number): string[] {
  if (!player || !player.gnl_stats || player.gnl_stats.length === 0) return [];
  const seasonStats = seasonId ? player.gnl_stats.find((s: Row) => s.season_id === seasonId) : player.gnl_stats[0];
  return seasonStats?.matchup_history || [];
}

/** One icon per race the player already faced this season. */
export function FacedRaces({ player, seasonId }: { player?: Row | null; seasonId?: number }) {
  const races = getOpponentRaceHistory(player, seasonId).filter(Boolean);
  return (
    <div className="flex items-center gap-1">
      {races.map((race, idx) => (
        <RaceIcon key={`${race}-${idx}`} raceIdentifier={race} size={24} />
      ))}
      {!races.length ? <span className="text-xs text-muted-foreground">—</span> : null}
    </div>
  );
}

/** The W3C data line: the mark and the synced time, with the exact time on tap. */
export function SyncedLine({ player }: { player?: Row | null }) {
  // syncedAgo already words the never case, so only a real time takes the verb
  const ago = syncedAgo(player as Row);
  return (
    <TapTooltip className="inline-flex items-center gap-1 whitespace-nowrap text-xs text-muted-foreground" content={syncedAt(player as Row)}>
      <W3CIcon size={14} />
      {ago === "never synced" ? ago : `synced ${ago}`}
    </TapTooltip>
  );
}
