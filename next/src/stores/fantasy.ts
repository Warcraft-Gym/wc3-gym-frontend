/* eslint-disable @typescript-eslint/no-explicit-any */
import { backendUrl, fetchWrapper, pageQuery, authHeader } from "@/helpers";

// The public write routes: the bearer carries the member's session
const publicWrite = async (method: string, url: string, payload?: any) => {
  const headers: Record<string, string> = await authHeader(method, url);
  if (payload) headers["Content-Type"] = "application/json";

  const response = await fetch(url, { method, headers, body: payload && JSON.stringify(payload) });
  if (!response.ok) throw await response.json();
  return method === "DELETE" ? undefined : response.json();
};

const store = {
  async fetchTeams() {
    return (await fetchWrapper.getAll(`${backendUrl}/fantasy/teams`)) || [];
  },
  async createTeam(team: any) {
    return await fetchWrapper.post(`${backendUrl}/fantasy/teams`, team);
  },
  async updateTeam(teamId: number, team: any) {
    return await fetchWrapper.put(`${backendUrl}/fantasy/teams/${teamId}`, team);
  },
  async deleteTeam(teamId: number) {
    await fetchWrapper.delete(`${backendUrl}/fantasy/teams/${teamId}`);
  },
  async addPlayers(teamId: number, playerIds: number[]) {
    return await fetchWrapper.post(`${backendUrl}/fantasy/teams/${teamId}/players`, { player_ids: playerIds });
  },
  async removePlayers(teamId: number, playerIds: number[]) {
    return await fetchWrapper.delete(`${backendUrl}/fantasy/teams/${teamId}/players`, { player_ids: playerIds });
  },
  async searchTeams(query: string) {
    return (await fetchWrapper.post(`${backendUrl}/fantasy/teams/search?query=${encodeURIComponent(query)}`)) || [];
  },
  async createBet(bet: any) {
    return await fetchWrapper.post(`${backendUrl}/fantasy/bets`, bet);
  },
  async updateBet(betId: number, bet: any) {
    return await fetchWrapper.put(`${backendUrl}/fantasy/bets/${betId}`, bet);
  },
  async deleteBet(betId: number) {
    await fetchWrapper.delete(`${backendUrl}/fantasy/bets/${betId}`);
  },
  // One page of bets; the server orders by id unless sort is given, and reports the total
  async searchBetsPage(query: string, { limit, offset, sort, order }: { limit?: number; offset?: number; sort?: string; order?: string }) {
    if (limit === -1) {
      // 'All': walk the server pages, which keeps the server order
      const allUrl = `${backendUrl}/fantasy/bets/search?query=${encodeURIComponent(query)}&${pageQuery({ sort, order })}`;
      const bets = await fetchWrapper.postAll(allUrl);
      return { bets, total: bets.length };
    }
    const url = `${backendUrl}/fantasy/bets/search?query=${encodeURIComponent(query)}&${pageQuery({ limit, offset, sort, order })}`;
    const { items, total } = await fetchWrapper.postPage(url);
    const bets = items || [];
    return { bets, total: total ?? bets.length };
  },
  // A search that does not touch the table state
  async queryBets(query: string) {
    return (await fetchWrapper.post(`${backendUrl}/fantasy/bets/search?query=${encodeURIComponent(query)}`)) || [];
  },
  async searchBets(query: string) {
    return (await fetchWrapper.post(`${backendUrl}/fantasy/bets/search?query=${encodeURIComponent(query)}`)) || [];
  },
  // Public endpoints: the session bearer names the member
  async public_getUserInfo() {
    const url = `${backendUrl}/user-info`;
    const response = await fetch(url, { headers: await authHeader("GET", url) });
    if (!response.ok) {
      throw new Error("Could not load your player data");
    }
    return await response.json();
  },
  async public_createFantasyTeam(payload: any) {
    return publicWrite("POST", `${backendUrl}/fantasy-team`, payload);
  },
  async public_createBet(payload: any) {
    return publicWrite("POST", `${backendUrl}/fantasy-bet`, payload);
  },
  async public_updateBet(betId: number, payload: any) {
    return publicWrite("PUT", `${backendUrl}/fantasy-bet/${betId}`, payload);
  },
  async public_deleteBet(betId: number) {
    await publicWrite("DELETE", `${backendUrl}/fantasy-bet/${betId}`);
  },
  async getTeamScoreBreakdown(teamId: number, seasonId: number) {
    return await fetchWrapper.get(`${backendUrl}/events/${seasonId}/fantasy/teams/${teamId}/breakdown`);
  },
};

export const useFantasyStore = () => store;
