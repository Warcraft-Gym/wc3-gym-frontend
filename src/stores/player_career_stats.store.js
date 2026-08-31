import { defineStore } from 'pinia';
import { fetchWrapper, pageQuery } from '@/helpers';

const backendUrl = `${import.meta.env.VITE_BACKEND_URL}`;

export const usePlayerCareerStatsStore = defineStore({
    id: 'playerCareerStats',
    state: () => ({
        stats: [],
        totalStats: 0,
        isLoading: false
    }),
    actions: {
        async fetchPage({ limit, offset, search, sort, order }) {
            this.isLoading = true;
            try {
                if (limit === -1) {  // 'All': walk the server pages, which keeps the server order
                    this.stats = await fetchWrapper.getAll(`${backendUrl}/stats/career?${pageQuery({ search, sort, order })}`);
                    this.totalStats = this.stats.length;
                    return this.stats;
                }

                const query = pageQuery({ limit, offset, search, sort, order });
                const { items, total } = await fetchWrapper.getPage(`${backendUrl}/stats/career?${query}`);
                this.stats = items || [];
                this.totalStats = total ?? this.stats.length;
                return this.stats;
            } finally {
                this.isLoading = false;
            }
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
            return await fetchWrapper.fileUpload(`${backendUrl}/stats/career/import-csv`, formData);
        }
    }
});
