/* eslint-disable @typescript-eslint/no-explicit-any */
import { backendUrl, fetchWrapper } from "@/helpers";
import { box, useBox } from "./box";

type LadderState = {
  // season ladder answers, keyed by season id, so a dialog reuses the page's read
  ladders: Record<string, any>;
  // { done, total } once a season sync knows its player count, null otherwise
  syncProgress: { done: number; total: number } | null;
};

export const ladderBox = box<LadderState>({ ladders: {}, syncProgress: null });
const patch = (part: Partial<LadderState>) => ladderBox.set({ ...ladderBox.get(), ...part });

const members = ({ ladders, syncProgress }: LadderState) => {
  return {
    ladders,
    syncProgress,
    // sent without a bearer so the edge can cache it (EDGE_CACHED in fetch-wrapper)
    async seasonLadder(season_id: number) {
      const ladder = await fetchWrapper.get(`${backendUrl}/seasons/${season_id}/ladder`);
      patch({ ladders: { ...ladderBox.get().ladders, [season_id]: ladder } });
      return ladder;
    },
    async userLadder(user_id: number, { seasonId = null }: { seasonId?: number | null } = {}) {
      const suffix = seasonId == null ? "" : `?season_id=${seasonId}`;
      return await fetchWrapper.get(`${backendUrl}/users/${user_id}/ladder${suffix}`);
    },
    // The sync route answers one chunk of players and where the next one starts
    async syncSeason(season_id: number) {
      const result: { synced: any[]; skipped: any[]; failed: any[] } = { synced: [], skipped: [], failed: [] };
      let offset: number | null = 0;
      try {
        while (offset !== null) {
          // No limit is sent, so the server picks the chunk size from its worker count
          const chunk = await fetchWrapper.post(`${backendUrl}/seasons/${season_id}/ladder-sync?offset=${offset}`);
          result.synced.push(...(chunk.synced ?? []));
          result.skipped.push(...(chunk.skipped ?? []));
          result.failed.push(...(chunk.failed ?? []));
          offset = chunk.next_offset ?? null;
          // The bar stays hidden until the first chunk answers with the player count
          if (chunk.total) patch({ syncProgress: { done: offset ?? chunk.total, total: chunk.total } });
        }
      } finally {
        patch({ syncProgress: null });
      }
      return result;
    },
  };
};

export const useLadderStore = () => members(ladderBox.get());

/** The same members, redrawn while a sync runs. */
export const useLadder = () => members(useBox(ladderBox));
