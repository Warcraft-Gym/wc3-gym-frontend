import { defineStore } from 'pinia';

import { backendUrl, fetchWrapper } from '@/helpers';
import { shrinkTeamImage } from '@/helpers/team-image';
import { useSeasonStore } from './season.store.js';

export const useTeamStore = defineStore({
    id: 'teamStore',
    state: () => ({
        // initialize state from local storage to enable user to stay logged in
        teams: [], // Store teams data
        team: [],
        isLoading: false, // Track loading state
    }),
    actions: {
        async gnlLeagueId() {
            return (await useSeasonStore().gnlLeague()).id;
        },
        async fetchTeamsBySeason(season_id) {
            try{
                this.isLoading = true; // Set loading to true
                const resp = await fetchWrapper.get(`${backendUrl}/events/${season_id}/teams`);
                this.teams =  resp
            } finally {
                this.isLoading = false; // Set loading to false once complete
            }
        },
        async fetchTeamsBySeasonBasic(season_id) {
            try{
                this.isLoading = true; // Set loading to true
                const resp = await fetchWrapper.get(`${backendUrl}/events/${season_id}/teams/basic`);
                this.teams =  resp
            } finally {
                this.isLoading = false; // Set loading to false once complete
            }
        },
        async fetchTeams() {
            const leagueId = await this.gnlLeagueId();
            this.teams = await fetchWrapper.get(`${backendUrl}/leagues/${leagueId}/teams`);
        },
        async getTeamsBasic() {
            const leagueId = await this.gnlLeagueId();
            return await fetchWrapper.get(`${backendUrl}/leagues/${leagueId}/teams/basic`);
        },
        async getTeam(team_id) {
            const leagueId = await this.gnlLeagueId();
            return await fetchWrapper.get(`${backendUrl}/leagues/${leagueId}/teams/${team_id}`);
        },
        async getTeamsSeasonBasic(season_id) {
            return await fetchWrapper.get(`${backendUrl}/events/${season_id}/teams/basic`);
        },
        async getTeamDetailsSeason(team_id, season_id) {
            return await fetchWrapper.get(`${backendUrl}/events/${season_id}/teams/${team_id}`);
        },
        async uploadTeamImage(team_id, file, league_id = null){
            const formData = new FormData();
            formData.append("image", await shrinkTeamImage(file), "icon.png");
            const leagueId = league_id ?? await this.gnlLeagueId();
            await fetchWrapper.fileUpload(`${backendUrl}/leagues/${leagueId}/teams/${team_id}/image`, formData);
        },
        async fetchTeamBySeason(team_id, season_id) {
            try{
                this.isLoading = true; // Set loading to true
                const resp = await fetchWrapper.get(`${backendUrl}/events/${season_id}/teams/${team_id}`);
                this.team =  resp
            } finally {
                this.isLoading = false; // Set loading to false once complete
            }
        },
        async updateTeam(team) {
            const teamId = team.id;
            const leagueId = team.league_id ?? await this.gnlLeagueId();
            const updatedTeam = await fetchWrapper.put(`${backendUrl}/leagues/${leagueId}/teams/${teamId}`, team);
            return updatedTeam;
        },
        async createTeam(team) {
            const leagueId = team.league_id ?? await this.gnlLeagueId();
            const newTeam = await fetchWrapper.post(`${backendUrl}/leagues/${leagueId}/teams`, team);
            return newTeam;
        },
        async deleteTeam(team_id, league_id = null) {
            const leagueId = league_id ?? await this.gnlLeagueId();
            await fetchWrapper.delete(`${backendUrl}/leagues/${leagueId}/teams/${team_id}`);
        },
        async addPlayersToTeamForSeason(team_id, season_id, player_ids) {
            await fetchWrapper.post(`${backendUrl}/events/${season_id}/teams/${team_id}/players`, {'player_ids': player_ids});
        },
        async removePlayersFromTeamForSeason(team_id, season_id, player_ids) {
            await fetchWrapper.delete(`${backendUrl}/events/${season_id}/teams/${team_id}/players`, {'player_ids': player_ids});
        },
        async syncPlayersW3C(team_id, season_id) {
            return await fetchWrapper.post(`${backendUrl}/events/${season_id}/teams/${team_id}/ladder-sync`);
        },
        async setCaptains(team_id, season_id, captain_ids) {
            const updatedTeam = await fetchWrapper.put(`${backendUrl}/events/${season_id}/teams/${team_id}/captains`, {'captain_ids': captain_ids});
            return updatedTeam;
        },
    }
});
