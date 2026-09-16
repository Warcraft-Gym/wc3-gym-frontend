/* eslint-disable @typescript-eslint/no-explicit-any */
import { backendUrl, fetchWrapper } from "@/helpers";

const store = {
  // Every career row; the players page joins them onto the player list
  async fetchAll() {
    return await fetchWrapper.getAll(`${backendUrl}/stats/career`);
  },
  async update(id: number, data: any) {
    return await fetchWrapper.put(`${backendUrl}/stats/career/${id}`, data);
  },
  async delete(id: number) {
    return await fetchWrapper.delete(`${backendUrl}/stats/career/${id}`);
  },
};

export const usePlayerCareerStatsStore = () => store;
