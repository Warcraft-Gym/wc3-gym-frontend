import { defineStore } from 'pinia';
import { fetchWrapper, pageQuery } from '@/helpers';
import { authHeader } from '@/helpers/fetch-wrapper';

const backendUrl = `${import.meta.env.VITE_BACKEND_URL}`;

// The public write routes: the body carries ?token= callers, the bearer carries a session
async function publicWrite(method, url, payload) {
    const headers = await authHeader(method, url);
    if (payload) headers['Content-Type'] = 'application/json';

    const response = await fetch(url, { method, headers, body: payload && JSON.stringify(payload) });
    if (!response.ok) throw await response.json();
    return method === 'DELETE' ? undefined : response.json();
}

export const useFantasyStore = defineStore({
    id: 'fantasy',
    state: () => ({
        teams: [],
        bets: [],
        totalBets: 0,
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
            return await fetchWrapper.post(`${backendUrl}/fantasy/teams/${teamId}/players`, { player_ids: playerIds });
        },

        async removePlayers(teamId, playerIds) {
            return await fetchWrapper.delete(`${backendUrl}/fantasy/teams/${teamId}/players`, { player_ids: playerIds });
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
                if (limit === -1) {  // 'All': walk the server pages, which keeps the server order
                    const allUrl = `${backendUrl}/fantasy/bets/search?query=${encodeURIComponent(query)}&${pageQuery({ sort, order })}`;
                    this.bets = await fetchWrapper.postAll(allUrl);
                    this.totalBets = this.bets.length;
                    return this.bets;
                }

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

        // Public endpoints: a ?token= link, or the session bearer when the member is signed in
        async public_getUserInfo(token) {
            const url = token ? `${backendUrl}/user-info?token=${token}` : `${backendUrl}/user-info`;
            const response = await fetch(url, { headers: await authHeader('GET', url) });
            if (!response.ok) {
                throw new Error('Invalid or expired token');
            }
            return await response.json();
        },

        async public_createFantasyTeam(payload) {
            return publicWrite('POST', `${backendUrl}/fantasy-team`, payload);
        },

        async public_createBet(payload) {
            return publicWrite('POST', `${backendUrl}/fantasy-bet`, payload);
        },

        async public_updateBet(betId, payload) {
            return publicWrite('PUT', `${backendUrl}/fantasy-bet/${betId}`, payload);
        },

        async public_deleteBet(betId, token) {
            const query = token ? `?token=${token}` : '';
            await publicWrite('DELETE', `${backendUrl}/fantasy-bet/${betId}${query}`);
        },

        async getTeamScoreBreakdown(teamId, seasonId) {
            return await fetchWrapper.get(`${backendUrl}/fantasy/teams/${teamId}/season/${seasonId}/breakdown`);
        }
    }
});
