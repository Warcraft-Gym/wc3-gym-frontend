import { defineStore } from 'pinia';

import { fetchWrapper } from '@/helpers';

const backendUrl = `${import.meta.env.VITE_BACKEND_URL}`

// Every route answers the rows of the players it touched, so the views keep what they read
export const useAvailabilityStore = defineStore({
    id: 'availabilityStore',
    state: () => ({}),
    actions: {
        async fetchTeamAvailability(team_id, season_id) {
            return await fetchWrapper.get(`${backendUrl}/teams/${team_id}/seasons/${season_id}/availability`);
        },
        // { token?, season_id?, playday, available }; a null available clears the week
        async setPlayerAvailability(answer) {
            return await fetchWrapper.put(`${backendUrl}/player-availability`, answer);
        },
        // { user_id, playday, available }
        async setTeamAvailability(team_id, season_id, answer) {
            return await fetchWrapper.put(`${backendUrl}/teams/${team_id}/seasons/${season_id}/availability`, answer);
        },
    }
});
