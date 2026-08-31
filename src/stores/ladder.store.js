import { defineStore } from 'pinia';

import { fetchWrapper } from '@/helpers';

const backendUrl = `${import.meta.env.VITE_BACKEND_URL}`

export const useLadderStore = defineStore({
    id: 'ladderStore',
    state: () => ({
        // season ladder answers, keyed by season id, so a dialog reuses the page's read
        ladders: {},
        // { done, total } once a season sync knows its player count, null otherwise
        syncProgress: null,
    }),
    actions: {
        // The ladder GETs carry the session bearer
        async seasonLadder(season_id) {
            const ladder = await fetchWrapper.get(`${backendUrl}/seasons/${season_id}/ladder`);
            this.ladders[season_id] = ladder;
            return ladder;
        },
        async userLadder(user_id, { seasonId = null, limit = null, offset = null } = {}) {
            const query = new URLSearchParams();
            for (const [key, value] of Object.entries({ season_id: seasonId, limit, offset })) {
                if (value !== null && value !== undefined) query.append(key, value);
            }
            const suffix = query.toString() ? `?${query}` : '';
            return await fetchWrapper.get(`${backendUrl}/users/${user_id}/ladder${suffix}`);
        },
        // The sync route answers one chunk of players and where the next one starts
        async syncSeason(season_id) {
            const result = { synced: [], skipped: [], failed: [] };
            let offset = 0;
            try {
                while (offset !== null) {
                    // No limit is sent, so the server picks the chunk size from its worker count
                    const chunk = await fetchWrapper.post(`${backendUrl}/seasons/${season_id}/ladder-sync?offset=${offset}`);
                    result.synced.push(...(chunk.synced ?? []));
                    result.skipped.push(...(chunk.skipped ?? []));
                    result.failed.push(...(chunk.failed ?? []));
                    offset = chunk.next_offset ?? null;
                    // The bar stays hidden until the first chunk answers with the player count
                    if (chunk.total) this.syncProgress = { done: offset ?? chunk.total, total: chunk.total };
                }
            } finally {
                this.syncProgress = null;
            }
            return result;
        }
    }
});
