/* eslint-disable @typescript-eslint/no-explicit-any */
import { backendUrl, fetchWrapper } from "@/helpers";

// The edge may serve a running read up to 720 s old (s-maxage 120 + stale 600), so this tab reads past it that long after its own series write
const EDGE_STALE_MS = 720_000;
let wroteAt = -Infinity;
const wrote = () => {
  wroteAt = Date.now();
};
const afterWrite = () => (Date.now() - wroteAt < EDGE_STALE_MS ? `?t=${Date.now()}` : "");

const store = {
  async updateSeries(series: any) {
    wrote();
    await fetchWrapper.put(`${backendUrl}/series/${series.id}`, series);
  },
  // Takes a reported result back, for whoever may report it; the replays stay
  async clearSeriesResult(seriesId: number) {
    wrote();
    return await fetchWrapper.delete(`${backendUrl}/series/${seriesId}/result`);
  },
  async createSeries(series: any) {
    wrote();
    await fetchWrapper.post(`${backendUrl}/series`, series);
  },
  // The casts of a series; every write answers the series' casts
  async claimSeries(seriesId: number, channel_url: string, vod_url: string | null = null) {
    wrote();
    return await fetchWrapper.post(`${backendUrl}/series/${seriesId}/casts`, { channel_url, vod_url });
  },
  async updateCast(seriesId: number, castId: number, channel_url: string) {
    wrote();
    return await fetchWrapper.put(`${backendUrl}/series/${seriesId}/casts/${castId}`, { channel_url });
  },
  async setCastVod(seriesId: number, castId: number, vod_url: string | null) {
    wrote();
    return await fetchWrapper.put(`${backendUrl}/series/${seriesId}/casts/${castId}/vod`, { vod_url });
  },
  async unclaimSeries(seriesId: number, castId: number) {
    wrote();
    await fetchWrapper.delete(`${backendUrl}/series/${seriesId}/casts/${castId}`);
  },
  // The home hub's one read, public and edge cached, so it is sent without a bearer unless this tab just wrote a series
  async homeSeries() {
    return await fetchWrapper.get(`${backendUrl}/home/series${afterWrite()}`);
  },
  // every booked series still to play, each with its claims; open and edge cached like the hub
  async upcomingSeries() {
    return await fetchWrapper.get(`${backendUrl}/home/series/upcoming${afterWrite()}`);
  },
  async lastCastChannel() {
    return (await fetchWrapper.get(`${backendUrl}/casts/last`)).channel_url;
  },
  async deleteSeries(series_id: number) {
    wrote();
    await fetchWrapper.delete(`${backendUrl}/series/${series_id}`);
  },
  // The caller hands in the rows it drew; the page is free once every delete answers
  async deleteAllSeries(series: any[]) {
    wrote();
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
    wrote();
    return await fetchWrapper.post(`${backendUrl}/draft-series/${draft_series_id}/promote`);
  },
  // What a replacement draft removes when it is published; read only when the confirm opens
  async getDraftReplaces(draft_series_id: number) {
    return await fetchWrapper.get(`${backendUrl}/draft-series/${draft_series_id}/replaces`);
  },

  // Round draft board: one read fills the board, and a read after a write refetches it and refreshes the browser's copy
  async getDraftBoard(match_id: number, fresh = false) {
    return await fetchWrapper.get(`${backendUrl}/matches/${match_id}/draft-board`, undefined, fresh ? { cache: "reload" } : undefined);
  },
  async getDraftState(match_id: number, fresh = false) {
    return await fetchWrapper.get(`${backendUrl}/draft-series/match/${match_id}/state`, undefined, fresh ? { cache: "reload" } : undefined);
  },
  // The viewer's own team only; every other caller reads 403
  async markDraftSeen(match_id: number, team_id: number) {
    await fetchWrapper.put(`${backendUrl}/draft-series/match/${match_id}/teams/${team_id}/seen`);
  },
  async setDraftReady(match_id: number, team_id: number, ready: boolean) {
    await fetchWrapper.put(`${backendUrl}/draft-series/match/${match_id}/teams/${team_id}/ready`, { ready });
  },
  // The working largest MMR difference of this match; null resets it to the stage value
  async setDraftMaxMmrDifference(match_id: number, max_mmr_difference: number | null) {
    await fetchWrapper.put(`${backendUrl}/draft-series/match/${match_id}/max-mmr-difference`, { max_mmr_difference });
  },
  // The meetings of two players, read only when a captain opens the head to head
  async playerMeetings(user_a: number, user_b: number) {
    return await fetchWrapper.get(`${backendUrl}/users/${user_a}/meetings/${user_b}`);
  },
  // One match's series; a read after a write refetches it and refreshes the browser's copy, which a later plain read serves
  async getSeriesByMatchId(season_id: number, match_id: number, fresh = false) {
    return await fetchWrapper.get(`${backendUrl}/events/${season_id}/series?match_id=${match_id}`, undefined, fresh ? { cache: "reload" } : undefined);
  },
  // One player's series in one season, filtered on the server
  async playerSeries(season_id: number, user_id: number) {
    return await fetchWrapper.get(`${backendUrl}/events/${season_id}/series?player_id=${user_id}`);
  },
  async searchSeriesBySeason(season_id: number, fantasyOnly?: boolean) {
    return await fetchWrapper.get(`${backendUrl}/events/${season_id}/series${fantasyOnly ? "?is_fantasy_match=true" : ""}`);
  },
};

export const useSeriesStore = () => store;
