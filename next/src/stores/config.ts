/* eslint-disable @typescript-eslint/no-explicit-any */
import { backendUrl, fetchWrapper } from "@/helpers";

const store = {
  async fetchSettings() {
    const response = await fetchWrapper.get(`${backendUrl}/config/settings`);
    return response.settings || [];
  },
  async fetchW3cConfig() {
    return await fetchWrapper.get(`${backendUrl}/config/w3c`);
  },
  async fetchSetting(key: string) {
    return await fetchWrapper.get(`${backendUrl}/config/settings/${key}`);
  },
  async updateSettings(settingsObj: any) {
    return await fetchWrapper.put(`${backendUrl}/config/settings`, { settings: settingsObj });
  },
  async fetchKothNightbotToken() {
    return await fetchWrapper.get(`${backendUrl}/config/koth/nightbot-token`);
  },
  async fetchDiscordRoleReport() {
    return await fetchWrapper.get(`${backendUrl}/config/discord-roles`);
  },
  // An empty body syncs every account the report flags; user_ids or role_ids narrow it
  async syncDiscordRoles(body: any = {}) {
    return await fetchWrapper.post(`${backendUrl}/config/discord-roles/sync`, body);
  },
  async fetchAdmins() {
    return await fetchWrapper.get(`${backendUrl}/config/admins`);
  },
  async addAdmin({ discord_id, name }: { discord_id: string; name: string }) {
    return await fetchWrapper.post(`${backendUrl}/config/admins`, { discord_id, name });
  },
  async removeAdmin(discord_id: string) {
    await fetchWrapper.delete(`${backendUrl}/config/admins/${discord_id}`);
  },
  async fetchDiscordGuildRoles() {
    return await fetchWrapper.get(`${backendUrl}/config/discord-guild-roles`);
  },
  // A hidden role stays out of the Not bound column; the app never touches it
  async hideDiscordRole(discord_role: string) {
    return await fetchWrapper.post(`${backendUrl}/config/discord-hidden-roles`, { discord_role });
  },
  async unhideDiscordRole(discord_role: string) {
    await fetchWrapper.delete(`${backendUrl}/config/discord-hidden-roles/${discord_role}`);
  },
  // The groups of people a binding can point at, counted over the scope: the current season, one season, or every season
  async fetchDiscordRoleGroups({ season_id, scope }: { season_id: number | null; scope: string }) {
    return await fetchWrapper.get(`${backendUrl}/config/discord-role-groups?season_id=${season_id}&scope=${scope}`);
  },
  async fetchDiscordRoleBindings() {
    return await fetchWrapper.get(`${backendUrl}/config/discord-role-bindings`);
  },
  async createDiscordRoleBinding(binding: any) {
    return await fetchWrapper.post(`${backendUrl}/config/discord-role-bindings`, binding);
  },
  async updateDiscordRoleBinding(id: number, binding: any) {
    return await fetchWrapper.put(`${backendUrl}/config/discord-role-bindings/${id}`, binding);
  },
  async deleteDiscordRoleBinding(id: number) {
    await fetchWrapper.delete(`${backendUrl}/config/discord-role-bindings/${id}`);
  },
  async generateKothNightbotToken() {
    return await fetchWrapper.post(`${backendUrl}/config/koth/nightbot-token`, {});
  },
};

export const useConfigStore = () => store;
