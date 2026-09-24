/* eslint-disable @typescript-eslint/no-explicit-any */
import { backendUrl, fetchWrapper } from "@/helpers";

// One row of UserPublic.tags
export type PlayerTag = { id: number; tag: string; verified: boolean; active: boolean; source: string | null; first_seen: string | null; last_seen: string | null };
// What a merge check answers, each line in plain words
export type MergePreview = { stops: string[]; removes: string[]; moves: string[] };

const store = {
  async fetchPlayers() {
    return await fetchWrapper.getAll(`${backendUrl}/users`);
  },
  // The users one list filter selects, e.g. "no_discord=true"
  async fetchFilteredPlayers(query: string) {
    return await fetchWrapper.getAll(`${backendUrl}/users?${query}`);
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
  // The signed-in person's own tags; each answers the whole UserPublic
  async addMyTag(tag: string) {
    return await fetchWrapper.post(`${backendUrl}/users/me/tags`, { tag });
  },
  async makeMyTagActive(tagId: number) {
    return await fetchWrapper.put(`${backendUrl}/users/me/tags/${tagId}/active`);
  },
  async removeMyTag(tagId: number) {
    return await fetchWrapper.delete(`${backendUrl}/users/me/tags/${tagId}`);
  },
  // Admin: one tag row to another person, and one person folded into another
  async moveTag(userId: number, tagId: number, toUserId: number) {
    return await fetchWrapper.post(`${backendUrl}/users/${userId}/tags/${tagId}/move`, { to_user_id: toUserId });
  },
  async mergePlayer(userId: number, intoUserId: number, dryRun: boolean) {
    return await fetchWrapper.post(`${backendUrl}/users/${userId}/merge`, { into_user_id: intoUserId, dry_run: dryRun });
  },
  async searchByDiscordId(discordId: string) {
    return await fetchWrapper.post(`${backendUrl}/users/search?query=discordId == ${discordId}`);
  },
};

export const usePlayerStore = () => store;
