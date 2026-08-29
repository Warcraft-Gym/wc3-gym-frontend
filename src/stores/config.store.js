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
