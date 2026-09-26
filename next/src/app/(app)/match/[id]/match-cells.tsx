/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { RaceIcon } from "@/components/RaceIcon";
import { W3CIcon } from "@/components/W3CIcon";
import { TapTooltip } from "@/components/ui/TapTooltip";
import { getAllRaceStats, getW3CMMR, syncedAgo, syncedAt } from "@/helpers/w3c-stats";

export type Row = Record<string, any>;

/** The MMR of one race: the entry's MMR; list payloads carry live entries only. */
export const mmrOf = (player: Row | undefined | null, race?: string | null) => getW3CMMR(player as Row, race as string);

/** The highest MMR across the races of the live window. */
export function getHighestW3CMMR(player?: Row | null): number | null {
  const live = getAllRaceStats(player as Row).filter((entry: Row) => !entry.stale && entry.mmr != null);
  return live.length ? Math.max(...live.map((entry: Row) => entry.mmr)) : null;
}

/** The races a player faced, from the matchup history of his record in this event. */
export function getOpponentRaceHistory(player?: Row | null): string[] {
  return player?.record?.matchup_history ?? [];
}

/** One icon per race the player already faced this season. */
export function FacedRaces({ player }: { player?: Row | null }) {
  const races = getOpponentRaceHistory(player).filter(Boolean);
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
