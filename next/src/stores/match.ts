/* eslint-disable @typescript-eslint/no-explicit-any */
import { backendUrl, fetchWrapper } from "@/helpers";

const store = {
  async fetchMatchDetails(matchId: number) {
    return await fetchWrapper.get(`${backendUrl}/matches/${matchId}`);
  },
  // one file per game played, a public store URL each
  async getMatchReplays(matchId: number) {
    return await fetchWrapper.get(`${backendUrl}/matches/${matchId}/replays`);
  },
  // Move one game's replay to another game of the same series; a target that holds a replay
  // swaps with it. The answer is every replay of that series, in game order.
  async moveSeriesReplay(seriesId: number, gameNo: number, toGame: number) {
    return await fetchWrapper.put(`${backendUrl}/player-series/${seriesId}/replays/${gameNo}/move/${toGame}`);
  },
  async updateMatch(match: any) {
    await fetchWrapper.put(`${backendUrl}/matches/${match.id}`, match);
  },
  async createMatch(match: any) {
    await fetchWrapper.post(`${backendUrl}/matches`, match);
  },
  async deleteMatch(match_id: number) {
    await fetchWrapper.delete(`${backendUrl}/matches/${match_id}`);
  },
  async searchMatchesBySeason(season_id: number) {
    return await fetchWrapper.post(`${backendUrl}/matches/search?query=season_id == ${season_id}`);
  },
  async searchMatchesBySeasonAndPlayday(season_id: number, playday: number) {
    return await fetchWrapper.post(`${backendUrl}/matches/search?query=season_id == ${season_id} and playday == ${playday}`);
  },
};

export const useMatchStore = () => store;
