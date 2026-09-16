/* eslint-disable @typescript-eslint/no-explicit-any */
import { backendUrl, fetchWrapper } from "@/helpers";

const store = {
  async fetchPlayers() {
    return await fetchWrapper.getAll(`${backendUrl}/users`);
  },
  async getPlayer(player_id: number | string) {
    return await fetchWrapper.get(`${backendUrl}/users/${encodeURIComponent(player_id)}`);
  },
  // Every event this player took part in, of every kind, and every opponent they met
  async playerHistory(player_id: number) {
    return await fetchWrapper.get(`${backendUrl}/users/${player_id}/history`);
  },
  async updatePlayer(player: any) {
    await fetchWrapper.put(`${backendUrl}/users/${player.id}`, player);
  },
  // One request for the whole allocation: the cuts and {player_id: tier}, unlisted players lose theirs
  async updateFantasyTiers(seasonId: number, cuts: any, tiers: any) {
    await fetchWrapper.put(`${backendUrl}/events/${seasonId}/fantasy/tiers`, { cuts, tiers });
  },
  async createPlayer(player: any) {
    await fetchWrapper.post(`${backendUrl}/users`, player);
  },
  // The ban warns on every entrant row of every event; it refuses no signup
  async banPlayer(player_id: number) {
    await fetchWrapper.put(`${backendUrl}/users/${player_id}/ban`);
  },
  async deletePlayer(player_id: number) {
    await fetchWrapper.delete(`${backendUrl}/users/${player_id}`);
  },
  async syncW3CPlayer(player_id: number) {
    return await fetchWrapper.post(`${backendUrl}/users/${player_id}/w3c-sync`);
  },
  // The synced row replaces the one the page holds, or joins the end when the page never read it
  patchPlayers(players: any[], updated: any) {
    const i = players.findIndex((p) => p.id === updated.id);
    return i === -1 ? [...players, updated] : players.map((p) => (p.id === updated.id ? updated : p));
  },
  async searchByDiscordId(discordId: string) {
    return await fetchWrapper.post(`${backendUrl}/users/search?query=discordId == ${discordId}`);
  },
};

export const usePlayerStore = () => store;
