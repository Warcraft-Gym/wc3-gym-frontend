import { defineStore } from 'pinia';

import { fetchWrapper } from '@/helpers';

const backendUrl = `${import.meta.env.VITE_BACKEND_URL}`

export const useSeasonStore = defineStore({
    id: 'seasonStore',
    state: () => ({
        // initialize state from local storage to enable user to stay logged in
        seasons: [], // Store user data
        current_season: {}
    }),
    actions: {
        async fetchSeasons() {
            const resp = await fetchWrapper.get(`${backendUrl}/seasons`);
            this.seasons =  resp
        },
        async fetchSeason(season_id){
            this.current_season = await fetchWrapper.get(`${backendUrl}/seasons/${season_id}`);
        },
        async updateSeason(season) {
            const seasonId = season.id;
            const updatedSeason = await fetchWrapper.put(`${backendUrl}/seasons/${seasonId}`, season);
        },
        async createSeason(season) {
            const createdSeason = await fetchWrapper.post(`${backendUrl}/seasons`, season);
            return createdSeason;
        },
        async deleteSeason(season_id) {
            await fetchWrapper.delete(`${backendUrl}/seasons/${season_id}`);
        },
        async addTeamsToSeason(season_id, team_ids) {
            const updatedTeam = await fetchWrapper.post(`${backendUrl}/seasons/addTeams/${season_id}`, {'team_ids': team_ids});
        },
        async removeTeamsFromSeason(season_id, team_ids) {
            const updatedTeam = await fetchWrapper.post(`${backendUrl}/seasons/removeTeams/${season_id}`, {'team_ids': team_ids});
        },
        async addMapsToSeason(season_id, map_ids) {
            const updatedTeam = await fetchWrapper.post(`${backendUrl}/seasons/addMaps/${season_id}`, {'map_ids': map_ids});
        },
        async removeMapsFromSeason(season_id, map_ids) {
            const updatedTeam = await fetchWrapper.post(`${backendUrl}/seasons/removeMaps/${season_id}`, {'map_ids': map_ids});
        },
        async addUserSignup(season_id, user_ids) {
            const updated = await fetchWrapper.post(`${backendUrl}/seasons/addUserSignup/${season_id}`, {'user_ids': user_ids});
            return updated;
        },
        async removeUserSignup(season_id, user_ids) {
            const updated = await fetchWrapper.post(`${backendUrl}/seasons/removeUserSignup/${season_id}`, {'user_ids': user_ids});
            return updated;
        },
        async fetchSeasonSignups(season_id) {
            const signups = await fetchWrapper.get(`${backendUrl}/seasons/${season_id}/signups`);
            return signups;
        },
        async uploadSeasonFile(season_id, season_name, file){
            let url = null
            if (season_id != null){
                url = `${backendUrl}/import?season_id=${season_id}`
            } else if (season_name != null && season_name != ''){
                url = `${backendUrl}/import?season_name=${season_name}`
            } else {
                return false;
            }
            const formData = new FormData();
            formData.append("file", file);
            await fetchWrapper.fileUpload(url, formData)
            return true;
        },
        async exportSeason(season_id) {
            // Use fetchWrapper for consistent authentication handling
            const response = await fetchWrapper.postBinary(`${backendUrl}/export?season_id=${season_id}`);
            
            // Get the filename from Content-Disposition header or use default
            const contentDisposition = response.headers.get('Content-Disposition');
            let filename = `season_${season_id}.xlsx`;
            if (contentDisposition) {
                const filenameMatch = contentDisposition.match(/filename="?(.+)"?/);
                if (filenameMatch) {
                    filename = filenameMatch[1];
                }
            }
            
            const blob = await response.blob();
            return { blob, filename };
        }
    }
});
