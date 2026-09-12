import { defineStore } from 'pinia';

import { backendUrl, fetchWrapper } from '@/helpers';

// Leagues and their events (#36). An event carries its stages, divisions and phase;
// entrants, series and the Discord post hang off their own routes.
export const useEventStore = defineStore({
    id: 'eventStore',
    state: () => ({
        leagues: [],
        events: [],
        event: null,
    }),
    actions: {
        async fetchLeagues() {
            this.leagues = await fetchWrapper.get(`${backendUrl}/leagues`);
            return this.leagues;
        },
        async createLeague(league) {
            return await fetchWrapper.post(`${backendUrl}/leagues`, league);
        },
        async fetchEvents(league_id = null) {
            const query = league_id ? `?league_id=${league_id}` : '';
            this.events = await fetchWrapper.get(`${backendUrl}/events${query}`);
            return this.events;
        },
        async fetchEvent(event_id) {
            this.event = await fetchWrapper.get(`${backendUrl}/events/${event_id}`);
            return this.event;
        },
        async createEvent(event) {
            return await fetchWrapper.post(`${backendUrl}/events`, event);
        },
        async fetchEntrants(event_id) {
            return await fetchWrapper.get(`${backendUrl}/events/${event_id}/entrants`);
        },
        // Divisions and seeds are written for the whole event at once: the admin moves
        // several rows before he saves, and one body keeps the seeds inside a division whole
        async saveEntrants(event_id, entrants) {
            return await fetchWrapper.put(`${backendUrl}/events/${event_id}/entrants`, {
                entrants: entrants.map(({ id, division_id, seed }) => ({ id, division_id, seed })),
            });
        },
        async saveDivisions(event_id, divisions) {
            return await fetchWrapper.put(`${backendUrl}/events/${event_id}/divisions`, { divisions });
        },
        async fetchStageSeries(event_id, stage_id) {
            return await fetchWrapper.get(`${backendUrl}/events/${event_id}/stages/${stage_id}/series`);
        },
        async generateStage(event_id, stage_id) {
            return await fetchWrapper.post(`${backendUrl}/events/${event_id}/stages/${stage_id}/generate`);
        },
        async advanceStage(event_id, stage_id) {
            return await fetchWrapper.post(`${backendUrl}/events/${event_id}/stages/${stage_id}/advance`);
        },
        async postToDiscord(event_id) {
            return await fetchWrapper.post(`${backendUrl}/events/${event_id}/discord-post`);
        },
        async removeDiscordPost(event_id) {
            await fetchWrapper.delete(`${backendUrl}/events/${event_id}/discord-post`);
        },
    }
});
