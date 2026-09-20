/* eslint-disable @typescript-eslint/no-explicit-any */
import { backendUrl, fetchWrapper } from "@/helpers";

// Every route answers the rows of the players it touched, so the views keep what they read
const store = {
  async fetchTeamAvailability(team_id: number, season_id: number) {
    return await fetchWrapper.get(`${backendUrl}/events/${season_id}/teams/${team_id}/availability`);
  },
  // { season_id?, playday, available }; a null available clears the week
  async setPlayerAvailability(answer: any) {
    return await fetchWrapper.put(`${backendUrl}/player-availability`, answer);
  },
  // { season_id?, available }; every round that has not ended, a null available clears them
  async setAllPlayerAvailability(answer: any) {
    return await fetchWrapper.put(`${backendUrl}/player-availability/all`, answer);
  },
  // { user_id, playday, available }
  async setTeamAvailability(team_id: number, season_id: number, answer: any) {
    return await fetchWrapper.put(`${backendUrl}/events/${season_id}/teams/${team_id}/availability`, answer);
  },
  // { user_id, available }; one call writes every round of the event that has not ended
  async setTeamAvailabilityAll(team_id: number, season_id: number, answer: any) {
    return await fetchWrapper.put(`${backendUrl}/events/${season_id}/teams/${team_id}/availability/all`, answer);
  },
};

export const useAvailabilityStore = () => store;
export { store as availabilityStore };
