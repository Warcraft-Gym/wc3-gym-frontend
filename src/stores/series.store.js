import { defineStore } from 'pinia';

import { fetchWrapper } from '@/helpers';

const backendUrl = `${import.meta.env.VITE_BACKEND_URL}`

export const useSeriesStore = defineStore({
    id: 'seriesStore',
    state: () => ({
        // initialize state from local storage to enable user to stay logged in
        series: [], // Store published series data
        draftSeries: [], // Store draft series data
        isLoading: false, // Track loading state
    }),
    actions: {
        async updateSeries(series) {
            const seriesId = series.id;
            const updatedSeries = await fetchWrapper.put(`${backendUrl}/series/${seriesId}`, series);
        },
        async createSeries(series) {
            const updatedSeries = await fetchWrapper.post(`${backendUrl}/series`, series);
        },
        async deleteSeries(series_id) {
            await fetchWrapper.delete(`${backendUrl}/series/${series_id}`);
        },
        async deleteAllSeries() {
            this.series.forEach(async(s) => {
                await fetchWrapper.delete(`${backendUrl}/series/${s.id}`);                
            });
        },
        
        // Draft Series Actions
        async createDraftSeries(draftSeries) {
            const created = await fetchWrapper.post(`${backendUrl}/draft-series`, draftSeries);
            return created;
        },
        async updateDraftSeries(draftSeries) {
            const draftSeriesId = draftSeries.id;
            const updated = await fetchWrapper.put(`${backendUrl}/draft-series/${draftSeriesId}`, draftSeries);
            return updated;
        },
        async deleteDraftSeries(draft_series_id) {
            await fetchWrapper.delete(`${backendUrl}/draft-series/${draft_series_id}`);
        },
        async getDraftSeriesByMatchId(match_id) {
            try {
                this.isLoading = true;
                this.draftSeries = await fetchWrapper.get(`${backendUrl}/draft-series/match/${match_id}`);
            } finally {
                this.isLoading = false;
            }
        },
        async deleteAllDraftSeriesForMatch(match_id) {
            await fetchWrapper.delete(`${backendUrl}/draft-series/match/${match_id}`);
        },
        async promoteDraftSeries(draft_series_id) {
            const promoted = await fetchWrapper.post(`${backendUrl}/draft-series/${draft_series_id}/promote`);
            return promoted;
        },
        
        async searchSeries(search) {
            try{
                this.isLoading = true; // Set loading to true
                const resp = await fetchWrapper.post(`${backendUrl}/series/search?query=${search}`);
                this.series =  resp
            } finally {
                this.isLoading = false; // Set loading to false once complete
            }
        },
        async getSeriesByMatchId(match_id) {
            try{
                this.isLoading = true; // Set loading to true
                const search = `match_id == ${match_id}`
                const resp = await fetchWrapper.post(`${backendUrl}/series/search?query=${search}`);
                this.series =  resp
            } finally {
                this.isLoading = false; // Set loading to false once complete
            }
        },
        async searchSeriesBySeason(season_id, search) {
            try{
                this.isLoading = true; // Set loading to true
                if (search){
                    this.series = await fetchWrapper.post(`${backendUrl}/series/season/${season_id}/search?query=${search}`);
                } else {
                    this.series = await fetchWrapper.post(`${backendUrl}/series/season/${season_id}/search`);
                }
            } finally {
                this.isLoading = false; // Set loading to false once complete
            }
        },
        async searchSeriesBySeasonAndPlayday(season_id, playday, search) {
            try{
                this.isLoading = true; // Set loading to true
                if (search){
                    this.series = await fetchWrapper.post(`${backendUrl}/series/season/${season_id}/playday/${playday}/search?query=${search}`);
                } else {
                    this.series = await fetchWrapper.post(`${backendUrl}/series/season/${season_id}/playday/${playday}/search`);
                }
            } finally {
                this.isLoading = false; // Set loading to false once complete
            }
        },
        async fetchSeriesBySeason(season_id) {
            try {
                this.isLoading = true;
                this.series = await fetchWrapper.get(`${backendUrl}/series/season/${season_id}`);
                return this.series;
            } finally {
                this.isLoading = false;
            }
        }
    }
});
