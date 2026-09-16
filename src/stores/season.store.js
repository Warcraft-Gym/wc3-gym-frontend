import { defineStore } from 'pinia';
import { findSeason, seasonSlug } from '@/helpers/season-slug.mjs';
import { asSeason } from '@/helpers/season-phase.mjs';

import { backendUrl, fetchWrapper } from '@/helpers';
import { useEventStore } from './event.store.js';

export const useSeasonStore = defineStore({
    id: 'seasonStore',
    state: () => ({
        // initialize state from local storage to enable user to stay logged in
        seasons: [], // Store user data
        current_season: {},
        selectedSeasonId: null  // the season every Fantasy page shows; SeasonSelect sets it
    }),
    getters: {
        // A URL key (slug or bare id) to the season id, once the list is loaded
        seasonIdOf: (state) => (key) => findSeason(state.seasons, key)?.id ?? null,
        slugOf: (state) => (id) => {
            const season = state.seasons.find((s) => s.id === Number(id));
            return season ? seasonSlug(season) : String(id);
        }
    },
    actions: {
        async gnlLeague() {
            const eventStore = useEventStore();
            if (!eventStore.leagues.length) await eventStore.fetchLeagues();
            const league = eventStore.leagues.find((row) => row.kind === 'gnl');
            if (!league) throw new Error('The GNL league is not configured.');
            return league;
        },
        async ensureSeasons() {
            if (!this.seasons.length) await this.fetchSeasons();
        },
        async fetchSeasons() {
            const league = await this.gnlLeague();
            const resp = await fetchWrapper.get(`${backendUrl}/events?league_id=${league.id}&kind=gnl`);
            this.seasons = resp.sort((a, b) => a.id - b.id).map(asSeason);
            return this.seasons;
        },
        async fetchSeason(season_id){
            const event = await fetchWrapper.get(`${backendUrl}/events/${season_id}`);
            this.current_season = asSeason(event);
            return this.current_season;
        },
        async updateSeason(season) {
            const seasonId = season.id;
            await fetchWrapper.put(`${backendUrl}/events/${seasonId}`, season);
        },
        async createSeason(season) {
            const league = await this.gnlLeague();
            const createdSeason = await fetchWrapper.post(`${backendUrl}/events`, { ...season, league_id: league.id });
            return asSeason(createdSeason);
        },
        async deleteSeason(season_id) {
            await fetchWrapper.delete(`${backendUrl}/events/${season_id}`);
        },
        async addTeamsToSeason(season_id, team_ids) {
            await fetchWrapper.post(`${backendUrl}/events/${season_id}/teams`, {'team_ids': team_ids});
        },
        async addMapsToSeason(season_id, map_ids) {
            await fetchWrapper.post(`${backendUrl}/events/${season_id}/maps`, {'map_ids': map_ids});
        },
        async removeMapsFromSeason(season_id, map_ids) {
            await fetchWrapper.delete(`${backendUrl}/events/${season_id}/maps`, {'map_ids': map_ids});
        },
        async setSeasonMapOrder(season_id, map_ids) {
            await fetchWrapper.put(`${backendUrl}/events/${season_id}/maps/order`, {'map_ids': map_ids});
        },
        async setSeasonRound(season_id, data) {
            await fetchWrapper.put(`${backendUrl}/events/${season_id}/rounds`, data);
        },
        async fetchLadderMapImport(season_id) {
            return await fetchWrapper.get(`${backendUrl}/events/${season_id}/maps/ladder-import`);
        },
        async importLadderMaps(season_id, names) {
            await fetchWrapper.post(`${backendUrl}/events/${season_id}/maps/ladder-import`, {'names': names});
        },
        async fetchAchievementCatalogue() {
            return await fetchWrapper.get(`${backendUrl}/achievements`);
        },
        async fetchSeasonAchievements(season_id) {
            return await fetchWrapper.get(`${backendUrl}/events/${season_id}/achievements`);
        },
        async saveSeasonAchievements(season_id, rows) {
            return await fetchWrapper.put(`${backendUrl}/events/${season_id}/achievements`, rows);
        },
        async addUserSignup(season_id, user_ids, race) {
            const updated = await fetchWrapper.post(`${backendUrl}/events/${season_id}/signups`, {'user_ids': user_ids, race});
            return updated;
        },
        async removeUserSignup(season_id, user_ids) {
            const updated = await fetchWrapper.delete(`${backendUrl}/events/${season_id}/signups`, {'user_ids': user_ids});
            return updated;
        },
        async updateSeasonSignup(season_id, user_id, data) {
            return await fetchWrapper.put(`${backendUrl}/events/${season_id}/signups/${user_id}`, data);
        },
        async fetchSeasonLadderPlayers(season_id) {
            return await fetchWrapper.get(`${backendUrl}/events/${season_id}/ladder/players`);
        },
        async fetchSeasonSignups(season_id) {
            const signups = await fetchWrapper.get(`${backendUrl}/events/${season_id}/signups`);
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
