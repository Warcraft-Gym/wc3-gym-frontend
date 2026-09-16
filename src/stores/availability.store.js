import { defineStore } from 'pinia';

import { backendUrl, fetchWrapper } from '@/helpers';

// Every route answers the rows of the players it touched, so the views keep what they read
export const useAvailabilityStore = defineStore({
    id: 'availabilityStore',
    state: () => ({}),
    actions: {
        async fetchTeamAvailability(team_id, season_id) {
            return await fetchWrapper.get(`${backendUrl}/events/${season_id}/teams/${team_id}/availability`);
        },
        // { season_id?, playday, available }; a null available clears the week
        async setPlayerAvailability(answer) {
            return await fetchWrapper.put(`${backendUrl}/player-availability`, answer);
        },
        // { user_id, playday, available }
        async setTeamAvailability(team_id, season_id, answer) {
            return await fetchWrapper.put(`${backendUrl}/events/${season_id}/teams/${team_id}/availability`, answer);
        },
    }
});
