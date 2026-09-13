import { defineStore } from 'pinia';

import { backendUrl, fetchWrapper } from '@/helpers';

// The leagues and their events. A league is what repeats, an event is one run of it,
// and a GNL season is the gnl-kind event of the GNL league. Reads are open, writes admin.
export const useEventStore = defineStore({
    id: 'eventStore',
    state: () => ({
        leagues: [],
        league: null,
        events: [],
        event: null,
    }),
    actions: {
        async fetchLeagues() {
            this.leagues = await fetchWrapper.get(`${backendUrl}/leagues`);
            return this.leagues;
        },
        // One league answers its own events, newest first
        async fetchLeague(league_id) {
            this.league = await fetchWrapper.get(`${backendUrl}/leagues/${league_id}`);
            return this.league;
        },
        async createLeague(league) {
            return await fetchWrapper.post(`${backendUrl}/leagues`, league);
        },
        async updateLeague(league_id, league) {
            return await fetchWrapper.put(`${backendUrl}/leagues/${league_id}`, league);
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
        async updateEvent(event_id, event) {
            return await fetchWrapper.put(`${backendUrl}/events/${event_id}`, event);
        },
        // The stages are written for the whole event at once: their positions must stay 1..n
        async setStages(event_id, stages) {
            return await fetchWrapper.put(`${backendUrl}/events/${event_id}/stages`, stages);
        },
        // The divisions are written for the whole event at once, in position order
        async setDivisions(event_id, divisions) {
            return await fetchWrapper.put(`${backendUrl}/events/${event_id}/divisions`, divisions);
        },
        async fetchEntrants(event_id) {
            return await fetchWrapper.get(`${backendUrl}/events/${event_id}/entrants`);
        },
        // The rounds and the series of one stage, with the feeder graph the bracket draws
        async fetchStage(event_id, stage_id) {
            return await fetchWrapper.get(`${backendUrl}/events/${event_id}/stages/${stage_id}/series`);
        },
        async fetchStandings(event_id, stage_id) {
            return await fetchWrapper.get(`${backendUrl}/events/${event_id}/stages/${stage_id}/standings`);
        },
        // Writes every series of the stage from its locked seeds, per division
        async generateStage(event_id, stage_id) {
            return await fetchWrapper.post(`${backendUrl}/events/${event_id}/stages/${stage_id}/generate`);
        },
        // Moves the top entrants of a finished stage into the next stage
        async advanceStage(event_id, stage_id) {
            return await fetchWrapper.post(`${backendUrl}/events/${event_id}/stages/${stage_id}/advance`);
        },
        // A cleared score reopens the bracket below; force allows it past a later result
        async scoreSeries(series_id, scores, force = false) {
            const query = force ? '?force=true' : '';
            return await fetchWrapper.put(`${backendUrl}/series/${series_id}${query}`, scores);
        },
        // A series no game was played for: a walkover or a forfeit, with the side that takes it
        async awardSeries(series_id, result_kind, winner) {
            return await fetchWrapper.put(`${backendUrl}/series/${series_id}/result-kind`, { result_kind, winner });
        },
    }
});
