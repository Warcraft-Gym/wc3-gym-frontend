import { defineStore } from 'pinia';

import { fetchWrapper } from '@/helpers';

const backendUrl = `${import.meta.env.VITE_BACKEND_URL}`

export const usePlayerStore = defineStore({
    id: 'playerStore',
    state: () => ({
        // initialize state from local storage to enable user to stay logged in
        players: [], // Store user data
        isLoading: false, // Track loading state
    }),
    actions: {
        async fetchPlayers() {
            try{
                this.isLoading = true; // Set loading to true
                const resp = await fetchWrapper.getAll(`${backendUrl}/users`);
                this.players = resp

            } finally {
                this.isLoading = false; // Set loading to false once complete
            }
        },
        async getPlayer(player_id) {
            return await fetchWrapper.get(`${backendUrl}/users/${player_id}`);
        },
        async updatePlayer(player) {
            const playerId = player.id;
            await fetchWrapper.put(`${backendUrl}/users/${playerId}`, player);
        },
        // One request for the whole allocation: {player_id: tier}, unlisted players lose theirs
        async updateFantasyTiers(seasonId, tiers) {
            await fetchWrapper.put(`${backendUrl}/fantasy/tiers?season_id=${seasonId}`, tiers);
        },
        async createPlayer(player) {
            await fetchWrapper.post(`${backendUrl}/users`, player);
        },
        async deletePlayer(player_id) {
            await fetchWrapper.delete(`${backendUrl}/users/${player_id}`);
        },
        async syncW3CPlayer(player_id) {
            const updated = await fetchWrapper.post(`${backendUrl}/users/${player_id}/w3c-sync`);
            const i = this.players.findIndex(p => p.id === updated.id);
            if (i === -1) this.players.push(updated); else this.players.splice(i, 1, updated);
            return updated;
        },
        async searchByDiscordId(discordId) {
            return await fetchWrapper.post(`${backendUrl}/users/search?query=discordId == ${discordId}`);
        }
    }
});
