/* eslint-disable @typescript-eslint/no-explicit-any */
import { backendUrl, fetchWrapper } from "@/helpers";
import { shrinkTeamImage } from "@/helpers/team-image";
import { gnlLeague } from "./season";

const store = {
  async gnlLeagueId() {
    return (await gnlLeague()).id;
  },
  async fetchTeamsBySeason(season_id: number) {
    return await fetchWrapper.get(`${backendUrl}/events/${season_id}/teams`);
  },
  async fetchTeamsBySeasonBasic(season_id: number) {
    return await fetchWrapper.get(`${backendUrl}/events/${season_id}/teams/basic`);
  },
  async fetchTeams() {
    return await fetchWrapper.get(`${backendUrl}/leagues/${await store.gnlLeagueId()}/teams`);
  },
  async getTeamsBasic() {
    return await fetchWrapper.get(`${backendUrl}/leagues/${await store.gnlLeagueId()}/teams/basic`);
  },
  async getTeam(team_id: number) {
    return await fetchWrapper.get(`${backendUrl}/leagues/${await store.gnlLeagueId()}/teams/${team_id}`);
  },
  async getTeamsSeasonBasic(season_id: number) {
    return await fetchWrapper.get(`${backendUrl}/events/${season_id}/teams/basic`);
  },
  async getTeamDetailsSeason(team_id: number, season_id: number) {
    return await fetchWrapper.get(`${backendUrl}/events/${season_id}/teams/${team_id}`);
  },
  async uploadTeamImage(team_id: number, file: File, league_id: number | null = null) {
    const formData = new FormData();
    formData.append("image", await shrinkTeamImage(file), "icon.png");
    const leagueId = league_id ?? (await store.gnlLeagueId());
    await fetchWrapper.fileUpload(`${backendUrl}/leagues/${leagueId}/teams/${team_id}/image`, formData);
  },
  async fetchTeamBySeason(team_id: number, season_id: number) {
    return await fetchWrapper.get(`${backendUrl}/events/${season_id}/teams/${team_id}`);
  },
  async updateTeam(team: any) {
    const leagueId = team.league_id ?? (await store.gnlLeagueId());
    return await fetchWrapper.put(`${backendUrl}/leagues/${leagueId}/teams/${team.id}`, team);
  },
  async createTeam(team: any) {
    const leagueId = team.league_id ?? (await store.gnlLeagueId());
    return await fetchWrapper.post(`${backendUrl}/leagues/${leagueId}/teams`, team);
  },
  async deleteTeam(team_id: number, league_id: number | null = null) {
    const leagueId = league_id ?? (await store.gnlLeagueId());
    await fetchWrapper.delete(`${backendUrl}/leagues/${leagueId}/teams/${team_id}`);
  },
  async addPlayersToTeamForSeason(team_id: number, season_id: number, player_ids: number[]) {
    await fetchWrapper.post(`${backendUrl}/events/${season_id}/teams/${team_id}/players`, { player_ids });
  },
  async removePlayersFromTeamForSeason(team_id: number, season_id: number, player_ids: number[]) {
    await fetchWrapper.delete(`${backendUrl}/events/${season_id}/teams/${team_id}/players`, { player_ids });
  },
  async syncPlayersW3C(team_id: number, season_id: number) {
    return await fetchWrapper.post(`${backendUrl}/events/${season_id}/teams/${team_id}/ladder-sync`);
  },
  async setCaptains(team_id: number, season_id: number, captain_ids: number[]) {
    return await fetchWrapper.put(`${backendUrl}/events/${season_id}/teams/${team_id}/captains`, { captain_ids });
  },
};

export const useTeamStore = () => store;
