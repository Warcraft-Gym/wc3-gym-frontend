import { defineStore } from 'pinia';
import { fetchWrapper, pageQuery } from '@/helpers';

const backendUrl = `${import.meta.env.VITE_BACKEND_URL}`;

export const useFantasyStore = defineStore({
    id: 'fantasy',
    state: () => ({
        teams: [],
        bets: [],
        totalBets: 0,
        currentTeam: null,
        isLoading: false
    }),
    actions: {
        async fetchTeams() {
            this.isLoading = true;
            try {
                const result = await fetchWrapper.getAll(`${backendUrl}/fantasy/teams`);
                this.teams = result || [];
                return this.teams;
            } finally {
                this.isLoading = false;
            }
        },

        async fetchTeam(teamId) {
            this.isLoading = true;
            try {
                this.currentTeam = await fetchWrapper.get(`${backendUrl}/fantasy/teams/${teamId}`);
                return this.currentTeam;
            } finally {
                this.isLoading = false;
            }
        },

        async createTeam(team) {
            return await fetchWrapper.post(`${backendUrl}/fantasy/teams`, team);
        },

        async updateTeam(teamId, team) {
            return await fetchWrapper.put(`${backendUrl}/fantasy/teams/${teamId}`, team);
        },

        async deleteTeam(teamId) {
            await fetchWrapper.delete(`${backendUrl}/fantasy/teams/${teamId}`);
            this.teams = this.teams.filter(t => t.id !== teamId);
        },

        async addPlayers(teamId, playerIds) {
            return await fetchWrapper.post(`${backendUrl}/fantasy/teams/addPlayers/${teamId}`, { player_ids: playerIds });
        },

        async removePlayers(teamId, playerIds) {
            return await fetchWrapper.post(`${backendUrl}/fantasy/teams/removePlayers/${teamId}`, { player_ids: playerIds });
        },

        async searchTeams(query) {
            this.isLoading = true;
            try {
                const result = await fetchWrapper.post(`${backendUrl}/fantasy/teams/search?query=${encodeURIComponent(query)}`);
                this.teams = result || [];
                return this.teams;
            } finally {
                this.isLoading = false;
            }
        },

        async fetchBet(betId) {
            return await fetchWrapper.get(`${backendUrl}/fantasy/bets/${betId}`);
        },

        async createBet(bet) {
            return await fetchWrapper.post(`${backendUrl}/fantasy/bets`, bet);
        },

        async updateBet(betId, bet) {
            return await fetchWrapper.put(`${backendUrl}/fantasy/bets/${betId}`, bet);
        },

        async deleteBet(betId) {
            await fetchWrapper.delete(`${backendUrl}/fantasy/bets/${betId}`);
            this.bets = this.bets.filter(b => b.id !== betId);
        },

        // One page of bets; the server orders by id unless sort is given, and reports the total
        async searchBetsPage(query, { limit, offset, sort, order }) {
            this.isLoading = true;
            try {
                const url = `${backendUrl}/fantasy/bets/search?query=${encodeURIComponent(query)}&${pageQuery({ limit, offset, sort, order })}`;
                const { items, total } = await fetchWrapper.postPage(url);
                this.bets = items || [];
                this.totalBets = total ?? this.bets.length;
                return this.bets;
            } finally {
                this.isLoading = false;
            }
        },

        // A search that does not touch the table state
        async queryBets(query) {
            const result = await fetchWrapper.post(`${backendUrl}/fantasy/bets/search?query=${encodeURIComponent(query)}`);
            return result || [];
        },

        async searchBets(query) {
            this.isLoading = true;
            try {
                const result = await fetchWrapper.post(`${backendUrl}/fantasy/bets/search?query=${encodeURIComponent(query)}`);
                this.bets = result || [];
                return this.bets;
            } finally {
                this.isLoading = false;
            }
        },

        // Public endpoints (token-based, no JWT required)
        async public_getUserInfo(token) {
            const response = await fetch(`${backendUrl}/user-info?token=${token}`);
            if (!response.ok) {
                throw new Error('Invalid or expired token');
            }
            return await response.json();
        },

        async public_createFantasyTeam(payload) {
            const response = await fetch(`${backendUrl}/fantasy-team`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw errorData;
            }
            
            return await response.json();
        },

        async public_createBet(payload) {
            const response = await fetch(`${backendUrl}/fantasy-bet`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw errorData;
            }
            
            return await response.json();
        },

        async public_updateBet(betId, payload) {
            const response = await fetch(`${backendUrl}/fantasy-bet/${betId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw errorData;
            }
            
            return await response.json();
        },

        async public_deleteBet(betId, token) {
            const response = await fetch(`${backendUrl}/fantasy-bet/${betId}?token=${token}`, {
                method: 'DELETE'
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw errorData;
            }
            
            return;
        },

        async getTeamScoreBreakdown(teamId, seasonId) {
            return await fetchWrapper.get(`${backendUrl}/fantasy/teams/${teamId}/season/${seasonId}/breakdown`);
        }
    }
});
