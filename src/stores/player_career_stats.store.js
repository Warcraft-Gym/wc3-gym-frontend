import { defineStore } from 'pinia';
import { backendUrl, fetchWrapper } from '@/helpers';

export const usePlayerCareerStatsStore = defineStore({
    id: 'playerCareerStats',
    state: () => ({
        stats: []
    }),
    actions: {
        // Every career row; the players page joins them onto the player list
        async fetchAll() {
            this.stats = await fetchWrapper.getAll(`${backendUrl}/stats/career`);
            return this.stats;
        },
        async update(id, data) {
            return await fetchWrapper.put(`${backendUrl}/stats/career/${id}`, data);
        },
        async delete(id) {
            return await fetchWrapper.delete(`${backendUrl}/stats/career/${id}`);
        }
    }
});
