import { defineStore } from 'pinia';

import { fetchWrapper } from '@/helpers';
import { shrinkTeamImage } from '@/helpers/team-image';

const backendUrl = `${import.meta.env.VITE_BACKEND_URL}`

export const useTeamStore = defineStore({
    id: 'teamStore',
    state: () => ({
        // initialize state from local storage to enable user to stay logged in
        teams: [], // Store teams data
        team: [],
        isLoading: false, // Track loading state
    }),
    actions: {
        async fetchTeamsBySeason(season_id) {
            try{
                this.isLoading = true; // Set loading to true
                const resp = await fetchWrapper.get(`${backendUrl}/teams/season/${season_id}`);
                this.teams =  resp
            } finally {
                this.isLoading = false; // Set loading to false once complete
            }
        },
        async fetchTeamsBySeasonBasic(season_id) {
            try{
                this.isLoading = true; // Set loading to true
                const resp = await fetchWrapper.get(`${backendUrl}/teams/season/${season_id}/basic`);
                this.teams =  resp
            } finally {
                this.isLoading = false; // Set loading to false once complete
            }
        },
        async fetchTeams() {
            this.teams = await fetchWrapper.get(`${backendUrl}/teams`);
        },
        async getTeams() {
            return await fetchWrapper.get(`${backendUrl}/teams`);
        },
        async getTeamsBasic() {
            return await fetchWrapper.get(`${backendUrl}/teams/basic`);
        },
        async getTeamDetails(team_id) {
            return await fetchWrapper.get(`${backendUrl}/teams/${team_id}`);
        },
        async getTeamDetailsSeason(team_id, season_id) {
            return await fetchWrapper.get(`${backendUrl}/teams/${team_id}/seasons/${season_id}`);
        },
        async uploadTeamImage(team_id, file){
            const formData = new FormData();
            formData.append("image", await shrinkTeamImage(file), "icon.png");
            await fetchWrapper.fileUpload(`${backendUrl}/teams/${team_id}/image`, formData);
        },
        async fetchTeamBySeason(team_id, season_id) {
            try{
                this.isLoading = true; // Set loading to true
                const resp = await fetchWrapper.get(`${backendUrl}/teams/${team_id}/seasons/${season_id}`);
                this.team =  resp
            } finally {
                this.isLoading = false; // Set loading to false once complete
            }
        },
        async updateTeam(team) {
            const teamId = team.id;
            const updatedTeam = await fetchWrapper.put(`${backendUrl}/teams/${teamId}`, team);
            return updatedTeam;
        },
        async createTeam(team) {
            const newTeam = await fetchWrapper.post(`${backendUrl}/teams`, team);
            return newTeam;
        },
        async deleteTeam(team_id) {
            await fetchWrapper.delete(`${backendUrl}/teams/${team_id}`);
        },
        async searchTeams(search) {
            try{
                this.isLoading = true; // Set loading to true
                const resp = await fetchWrapper.post(`${backendUrl}/teams/search?query=${search}`);
                this.teams =  resp
            } finally {
                this.isLoading = false; // Set loading to false once complete
            }
        },
        async addPlayersToTeamForSeason(team_id, season_id, player_ids) {
            const updatedTeam = await fetchWrapper.post(`${backendUrl}/teams/${team_id}/seasons/${season_id}/players`, {'player_ids': player_ids});
        },
        async removePlayersFromTeamForSeason(team_id, season_id, player_ids) {
            const updatedTeam = await fetchWrapper.delete(`${backendUrl}/teams/${team_id}/seasons/${season_id}/players`, {'player_ids': player_ids});
        },
        async syncPlayersW3C(team_id, season_id) {
            return await fetchWrapper.post(`${backendUrl}/teams/${team_id}/seasons/${season_id}/w3c-sync`);
        },
        async syncSeasonW3C(season_id) {
            return await fetchWrapper.post(`${backendUrl}/seasons/${season_id}/w3c-sync`);
        },
        async setCoaches(team_id, season_id, coach_ids) {
            const updatedTeam = await fetchWrapper.put(`${backendUrl}/teams/${team_id}/seasons/${season_id}/coaches`, {'coach_ids': coach_ids});
            return updatedTeam;
        },
    }
});
