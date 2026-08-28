import { defineStore } from 'pinia';

import { fetchWrapper } from '@/helpers';

const backendUrl = `${import.meta.env.VITE_BACKEND_URL}`

export const useLadderStore = defineStore({
    id: 'ladderStore',
    state: () => ({
        // season ladder answers, keyed by season id, so a dialog reuses the page's read
        ladders: {},
        // { done, total } while a season sync runs, null otherwise
        syncProgress: null,
    }),
    actions: {
        // The ladder routes are admin gated, so their GETs carry the access token
        async seasonLadder(season_id) {
            const ladder = await fetchWrapper.getSecure(`${backendUrl}/seasons/${season_id}/ladder`);
            this.ladders[season_id] = ladder;
            return ladder;
        },
        async userLadder(user_id, { seasonId = null, limit = null, offset = null } = {}) {
            const query = new URLSearchParams();
            for (const [key, value] of Object.entries({ season_id: seasonId, limit, offset })) {
                if (value !== null && value !== undefined) query.append(key, value);
            }
            const suffix = query.toString() ? `?${query}` : '';
            return await fetchWrapper.getSecure(`${backendUrl}/users/${user_id}/ladder${suffix}`);
        },
        // The sync route answers one chunk of players and where the next one starts
        async syncSeason(season_id) {
            const result = { synced: [], skipped: [], failed: [] };
            let offset = 0;
            this.syncProgress = { done: 0, total: 0 };
            try {
                while (offset !== null) {
                    const chunk = await fetchWrapper.post(`${backendUrl}/seasons/${season_id}/ladder-sync?offset=${offset}`);
                    result.synced.push(...(chunk.synced ?? []));
                    result.skipped.push(...(chunk.skipped ?? []));
                    result.failed.push(...(chunk.failed ?? []));
                    offset = chunk.next_offset ?? null;
                    this.syncProgress = { done: offset ?? chunk.total ?? 0, total: chunk.total ?? 0 };
                }
            } finally {
                this.syncProgress = null;
            }
            return result;
        }
    }
});
