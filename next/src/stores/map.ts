/* eslint-disable @typescript-eslint/no-explicit-any */
import { backendUrl, fetchWrapper } from "@/helpers";

const store = {
  // The pool allows stale-while-revalidate, so fresh adds a query no cache holds for a re-read after a write
  async fetchMaps(fresh = false) {
    return await fetchWrapper.get(`${backendUrl}/maps${fresh ? `?t=${Date.now()}` : ""}`);
  },
  async updateMap(map: any) {
    await fetchWrapper.put(`${backendUrl}/maps/${map.id}`, map);
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
  async fetchLadderMapImport() {
    return await fetchWrapper.get(`${backendUrl}/maps/ladder-import`);
  },
  async importLadderMaps(names: string[]) {
    await fetchWrapper.post(`${backendUrl}/maps/ladder-import`, { names });
  },
};

export const useMapStore = () => store;
