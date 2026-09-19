/* eslint-disable @typescript-eslint/no-explicit-any */
import { backendUrl, fetchWrapper } from "@/helpers";

const store = {
  async updateSeries(series: any) {
    await fetchWrapper.put(`${backendUrl}/series/${series.id}`, series);
  },
  async createSeries(series: any) {
    await fetchWrapper.post(`${backendUrl}/series`, series);
  },
  // The casts of a series; every write answers the series' casts
  async claimSeries(seriesId: number, channel_url: string, vod_url: string | null = null) {
    return await fetchWrapper.post(`${backendUrl}/series/${seriesId}/casts`, { channel_url, vod_url });
  },
  async updateCast(seriesId: number, castId: number, channel_url: string) {
    return await fetchWrapper.put(`${backendUrl}/series/${seriesId}/casts/${castId}`, { channel_url });
  },
  async setCastVod(seriesId: number, castId: number, vod_url: string | null) {
    return await fetchWrapper.put(`${backendUrl}/series/${seriesId}/casts/${castId}/vod`, { vod_url });
  },
  async unclaimSeries(seriesId: number, castId: number) {
    await fetchWrapper.delete(`${backendUrl}/series/${seriesId}/casts/${castId}`);
  },
  async lastCastChannel() {
    return (await fetchWrapper.get(`${backendUrl}/casts/last`)).channel_url;
  },
  async deleteSeries(series_id: number) {
    await fetchWrapper.delete(`${backendUrl}/series/${series_id}`);
  },
  // The caller hands in the rows it drew; the page is free once every delete answers
  async deleteAllSeries(series: any[]) {
    await Promise.all(series.map((s) => fetchWrapper.delete(`${backendUrl}/series/${s.id}`)));
  },

  // Draft Series Actions
  async createDraftSeries(draftSeries: any) {
    return await fetchWrapper.post(`${backendUrl}/draft-series`, draftSeries);
  },
  async updateDraftSeries(draftSeries: any) {
    return await fetchWrapper.put(`${backendUrl}/draft-series/${draftSeries.id}`, draftSeries);
  },
  async deleteDraftSeries(draft_series_id: number) {
    await fetchWrapper.delete(`${backendUrl}/draft-series/${draft_series_id}`);
  },
  async getDraftSeriesByMatchId(match_id: number) {
    return await fetchWrapper.get(`${backendUrl}/draft-series/match/${match_id}`);
  },
  async deleteAllDraftSeriesForMatch(match_id: number) {
    await fetchWrapper.delete(`${backendUrl}/draft-series/match/${match_id}`);
  },
  async promoteDraftSeries(draft_series_id: number) {
    return await fetchWrapper.post(`${backendUrl}/draft-series/${draft_series_id}/promote`);
  },
  async getSeriesByMatchId(match_id: number) {
    return await fetchWrapper.post(`${backendUrl}/series/search?query=match_id == ${match_id}`);
  },
  // One player's series in one season, filtered on the server
  async playerSeries(season_id: number, user_id: number) {
    const query = encodeURIComponent(`player1_id == ${user_id} or player2_id == ${user_id}`);
    return await fetchWrapper.post(`${backendUrl}/events/${season_id}/series/search?query=${query}`);
  },
  async searchSeriesBySeason(season_id: number, search?: string) {
    const suffix = search ? `?query=${search}` : "";
    return await fetchWrapper.post(`${backendUrl}/events/${season_id}/series/search${suffix}`);
  },
};

export const useSeriesStore = () => store;
