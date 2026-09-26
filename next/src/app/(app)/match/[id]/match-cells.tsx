/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { RaceIcon } from "@/components/RaceIcon";
import { W3CIcon } from "@/components/W3CIcon";
import { TapTooltip } from "@/components/ui/TapTooltip";
import { getAllRaceStats, getW3CMMR, syncedAgo, syncedAt } from "@/helpers/w3c-stats";

export type Row = Record<string, any>;

/** The live MMR of one race, from the player's ladder summary. */
export const mmrOf = (player: Row | undefined | null, race?: string | null) => getW3CMMR(player as Row, race as string);

/** The highest MMR across the races of the live window. */
export function getHighestW3CMMR(player?: Row | null): number | null {
  const live = getAllRaceStats(player as Row).filter((entry: Row) => !entry.stale && entry.mmr != null);
  return live.length ? Math.max(...live.map((entry: Row) => entry.mmr)) : null;
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
