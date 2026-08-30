import { defineStore } from 'pinia';
import { fetchWrapper } from '@/helpers';

const backendUrl = `${import.meta.env.VITE_BACKEND_URL}`;

export const useConfigStore = defineStore({
    id: 'configStore',
    state: () => ({
        settings: [],
        w3cConfig: null,
        isLoading: false,
        error: null
    }),
    actions: {
        async fetchSettings() {
            this.isLoading = true;
            this.error = null;
            try {
                const response = await fetchWrapper.get(`${backendUrl}/config/settings`);
                this.settings = response.settings || [];
                return this.settings;
            } catch (error) {
                this.error = error;
                throw error;
            } finally {
                this.isLoading = false;
            }
        },

        async fetchW3cConfig() {
            const response = await fetchWrapper.get(`${backendUrl}/config/w3c`);
            this.w3cConfig = response;
            return response;
        },

        async fetchSetting(key) {
            this.isLoading = true;
            this.error = null;
            try {
                const setting = await fetchWrapper.get(`${backendUrl}/config/settings/${key}`);
                return setting;
            } catch (error) {
                this.error = error;
                throw error;
            } finally {
                this.isLoading = false;
            }
        },

        async updateSettings(settingsObj) {
            this.isLoading = true;
            this.error = null;
            try {
                const response = await fetchWrapper.put(`${backendUrl}/config/settings`, { settings: settingsObj });
                // Refresh settings after update
                await this.fetchSettings();
                return response;
            } catch (error) {
                this.error = error;
                throw error;
            } finally {
                this.isLoading = false;
            }
        },

        async fetchKothNightbotToken() {
            this.isLoading = true;
            this.error = null;
            try {
                const response = await fetchWrapper.getSecure(`${backendUrl}/config/koth/nightbot-token`);
                return response;
            } catch (error) {
                this.error = error;
                throw error;
            } finally {
                this.isLoading = false;
            }
        },

        async fetchDiscordRoleReport() {
            return await fetchWrapper.get(`${backendUrl}/config/discord-roles`);
        },

        // Without user_ids the backend syncs every account the report flags
        async syncDiscordRoles(user_ids) {
            return await fetchWrapper.post(`${backendUrl}/config/discord-roles/sync`, user_ids ? { user_ids } : {});
        },

        async fetchAdmins() {
            return await fetchWrapper.get(`${backendUrl}/config/admins`);
        },

        async addAdmin({ discord_id, name }) {
            return await fetchWrapper.post(`${backendUrl}/config/admins`, { discord_id, name });
        },

        async removeAdmin(discord_id) {
            await fetchWrapper.delete(`${backendUrl}/config/admins/${discord_id}`);
        },

        async fetchDiscordGuildRoles() {
            return await fetchWrapper.get(`${backendUrl}/config/discord-guild-roles`);
        },

        async fetchDiscordRoleBindings() {
            return await fetchWrapper.get(`${backendUrl}/config/discord-role-bindings`);
        },

        async createDiscordRoleBinding(binding) {
            return await fetchWrapper.post(`${backendUrl}/config/discord-role-bindings`, binding);
        },

        async updateDiscordRoleBinding(id, binding) {
            return await fetchWrapper.put(`${backendUrl}/config/discord-role-bindings/${id}`, binding);
        },

        async deleteDiscordRoleBinding(id) {
            await fetchWrapper.delete(`${backendUrl}/config/discord-role-bindings/${id}`);
        },

        async generateKothNightbotToken() {
            this.isLoading = true;
            this.error = null;
            try {
                const response = await fetchWrapper.post(`${backendUrl}/config/koth/nightbot-token`, {});
                return response;
            } catch (error) {
                this.error = error;
                throw error;
            } finally {
                this.isLoading = false;
            }
        }
    }
});
