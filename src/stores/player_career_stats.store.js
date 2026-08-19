import { defineStore } from 'pinia';
import { fetchWrapper } from '@/helpers';

const backendUrl = `${import.meta.env.VITE_BACKEND_URL}`;

export const usePlayerCareerStatsStore = defineStore({
    id: 'playerCareerStats',
    state: () => ({
        stats: [],
        totalStats: 0,
        isLoading: false
    }),
    actions: {
        async fetchPage({ limit, offset }) {
            this.isLoading = true;
            try {
                const url = `${backendUrl}/stats/career?limit=${limit}&offset=${offset}`;
                const { items, total } = await fetchWrapper.getPage(url);
                this.stats = items || [];
                this.totalStats = total ?? this.stats.length;
                return this.stats;
            } finally {
                this.isLoading = false;
            }
        },
        async getById(id) {
            return await fetchWrapper.get(`${backendUrl}/stats/career/${id}`);
        },
        async update(id, data) {
            return await fetchWrapper.put(`${backendUrl}/stats/career/${id}`, data);
        },
        async delete(id) {
            return await fetchWrapper.delete(`${backendUrl}/stats/career/${id}`);
        },
        async importCsv(file) {
            const formData = new FormData();
            formData.append('file', file);
            return await fetchWrapper.postFile(`${backendUrl}/stats/career/import-csv`, formData);
        }
    }
});
