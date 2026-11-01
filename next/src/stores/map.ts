/* eslint-disable @typescript-eslint/no-explicit-any */
import { backendUrl, fetchWrapper } from "@/helpers";

const store = {
  // Every map, past the default page. The pool allows stale-while-revalidate, so fresh adds a query no cache holds for a re-read after a write
  async fetchMaps(fresh = false) {
    return await fetchWrapper.get(`${backendUrl}/maps?limit=500${fresh ? `&t=${Date.now()}` : ""}`);
  },
  async updateMap(map: any) {
    await fetchWrapper.put(`${backendUrl}/maps/${map.id}`, map);
  },
  // A custom game's map by its name: the app's map of that name, or a new one an organizer adds
  async addCustomMap(name: string) {
    return await fetchWrapper.post(`${backendUrl}/maps/custom`, { name });
  },
  async createMap(map: any) {
    return await fetchWrapper.post(`${backendUrl}/maps`, map);
  },
  async uploadMapImage(map_id: number, file: File) {
    const formData = new FormData();
    formData.append("image", file);
    await fetchWrapper.fileUpload(`${backendUrl}/maps/${map_id}/image`, formData);
  },
  async deleteMap(map_id: number) {
    await fetchWrapper.delete(`${backendUrl}/maps/${map_id}`);
  },
  // The ladder pool of one W3Champions game mode, 1v1 unless named
  async fetchLadderMapImport(mode: string = "1v1") {
    return await fetchWrapper.get(`${backendUrl}/maps/ladder-import${mode === "1v1" ? "" : `?mode=${mode}`}`);
  },
  // Creates, renames and pictures the named maps of one ladder, 1v1 unless named
  async importLadderMaps(names: string[], mode: string = "1v1") {
    await fetchWrapper.post(`${backendUrl}/maps/ladder-import${mode === "1v1" ? "" : `?mode=${mode}`}`, { names });
  },
  // The sites an admin can take maps from
  async fetchMapSources() {
    return await fetchWrapper.get(`${backendUrl}/maps/sources`);
  },
  async fetchSourceMaps(key: string, q = "") {
    return await fetchWrapper.get(`${backendUrl}/maps/sources/${key}${q ? `?q=${encodeURIComponent(q)}` : ""}`);
  },
  // Adds the picked maps of a site, at most 10 per call
  async importSourceMaps(key: string, maps: { name: string; modes: string | null }[]) {
    return await fetchWrapper.post(`${backendUrl}/maps/sources/${key}`, { maps });
  },
};

export const useMapStore = () => store;
