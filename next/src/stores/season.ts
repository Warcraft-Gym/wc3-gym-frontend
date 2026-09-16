/* eslint-disable @typescript-eslint/no-explicit-any */
import { backendUrl, fetchWrapper } from "@/helpers";
import { findSeason, seasonSlug } from "@/helpers/season-slug.mjs";
import { asSeason } from "@/helpers/season-phase.mjs";
import { box, useBox } from "./box";

type Season = Record<string, any>;
type SeasonState = { seasons: Season[]; current_season: Season; selectedSeasonId: number | null };

// selectedSeasonId is the season every Fantasy page shows; SeasonSelect sets it
export const seasonBox = box<SeasonState>({ seasons: [], current_season: {}, selectedSeasonId: null });
const patch = (part: Partial<SeasonState>) => seasonBox.set({ ...seasonBox.get(), ...part });

// The league list, read once.
let leagues: Season[] = [];

// A GNL season is the gnl-kind event of the GNL league
export const gnlLeague = async () => {
  if (!leagues.length) leagues = await fetchWrapper.get(`${backendUrl}/leagues`);
  const league = leagues.find((row) => row.kind === "gnl");
  if (!league) throw new Error("The GNL league is not configured.");
  return league;
};

const members = ({ seasons, current_season, selectedSeasonId }: SeasonState) => {
  const fetchSeasons = async () => {
    const league = await gnlLeague();
    const resp = await fetchWrapper.get(`${backendUrl}/events?league_id=${league.id}&kind=gnl`);
    const rows = resp.sort((a: Season, b: Season) => a.id - b.id).map(asSeason);
    patch({ seasons: rows });
    return rows;
  };
  return {
    seasons,
    current_season,
    selectedSeasonId,
    setSelectedSeasonId: (id: number | null) => patch({ selectedSeasonId: id }),
    // A URL key (slug or bare id) to the season id, once the list is loaded
    seasonIdOf: (key: string | number) => findSeason(seasons, key)?.id ?? null,
    slugOf: (id: number | string) => {
      const season = seasons.find((s) => s.id === Number(id));
      return season ? seasonSlug(season) : String(id);
    },
    async ensureSeasons() {
      if (!seasonBox.get().seasons.length) await fetchSeasons();
    },
    fetchSeasons,
    async fetchSeason(season_id: number | string) {
      const season = asSeason(await fetchWrapper.get(`${backendUrl}/events/${season_id}`));
      patch({ current_season: season });
      return season;
    },
    async updateSeason(season: Season) {
      await fetchWrapper.put(`${backendUrl}/events/${season.id}`, season);
    },
    async createSeason(season: Season) {
      const league = await gnlLeague();
      return asSeason(await fetchWrapper.post(`${backendUrl}/events`, { ...season, league_id: league.id }));
    },
    async deleteSeason(season_id: number) {
      await fetchWrapper.delete(`${backendUrl}/events/${season_id}`);
    },
    async addTeamsToSeason(season_id: number, team_ids: number[]) {
      await fetchWrapper.post(`${backendUrl}/events/${season_id}/teams`, { team_ids });
    },
    async addMapsToSeason(season_id: number, map_ids: number[]) {
      await fetchWrapper.post(`${backendUrl}/events/${season_id}/maps`, { map_ids });
    },
    async removeMapsFromSeason(season_id: number, map_ids: number[]) {
      await fetchWrapper.delete(`${backendUrl}/events/${season_id}/maps`, { map_ids });
    },
    async setSeasonMapOrder(season_id: number, map_ids: number[]) {
      await fetchWrapper.put(`${backendUrl}/events/${season_id}/maps/order`, { map_ids });
    },
    async setSeasonRound(season_id: number, data: any) {
      await fetchWrapper.put(`${backendUrl}/events/${season_id}/rounds`, data);
    },
    async fetchLadderMapImport(season_id: number) {
      return await fetchWrapper.get(`${backendUrl}/events/${season_id}/maps/ladder-import`);
    },
    async importLadderMaps(season_id: number, names: string[]) {
      await fetchWrapper.post(`${backendUrl}/events/${season_id}/maps/ladder-import`, { names });
    },
    async fetchAchievementCatalogue() {
      return await fetchWrapper.get(`${backendUrl}/achievements`);
    },
    async fetchSeasonAchievements(season_id: number) {
      return await fetchWrapper.get(`${backendUrl}/events/${season_id}/achievements`);
    },
    async saveSeasonAchievements(season_id: number, rows: any) {
      return await fetchWrapper.put(`${backendUrl}/events/${season_id}/achievements`, rows);
    },
    async addUserSignup(season_id: number, user_ids: number[], race: string) {
      return await fetchWrapper.post(`${backendUrl}/events/${season_id}/signups`, { user_ids, race });
    },
    async removeUserSignup(season_id: number, user_ids: number[]) {
      return await fetchWrapper.delete(`${backendUrl}/events/${season_id}/signups`, { user_ids });
    },
    async updateSeasonSignup(season_id: number, user_id: number, data: any) {
      return await fetchWrapper.put(`${backendUrl}/events/${season_id}/signups/${user_id}`, data);
    },
    async fetchSeasonLadderPlayers(season_id: number) {
      return await fetchWrapper.get(`${backendUrl}/events/${season_id}/ladder/players`);
    },
    async fetchSeasonSignups(season_id: number) {
      return await fetchWrapper.get(`${backendUrl}/events/${season_id}/signups`);
    },
    async uploadSeasonFile(season_id: number | null, season_name: string | null, file: File) {
      let url = null;
      if (season_id != null) url = `${backendUrl}/import?season_id=${season_id}`;
      else if (season_name != null && season_name !== "") url = `${backendUrl}/import?season_name=${season_name}`;
      else return false;
      const formData = new FormData();
      formData.append("file", file);
      await fetchWrapper.fileUpload(url, formData);
      return true;
    },
    async exportSeason(season_id: number) {
      const response = await fetchWrapper.postBinary(`${backendUrl}/export?season_id=${season_id}`);
      // Get the filename from Content-Disposition header or use default
      const contentDisposition = response.headers.get("Content-Disposition");
      let filename = `season_${season_id}.xlsx`;
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?(.+)"?/);
        if (filenameMatch) filename = filenameMatch[1];
      }
      const blob = await response.blob();
      return { blob, filename };
    },
  };
};

export const useSeasonStore = () => members(seasonBox.get());

/** The same members, redrawn when the season list or the choice changes. */
export const useSeason = () => members(useBox(seasonBox));
