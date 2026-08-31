import { defineStore } from 'pinia';

import { fetchWrapper } from '@/helpers';

const backendUrl = `${import.meta.env.VITE_BACKEND_URL}`

export const useMapStore = defineStore({
    id: 'mapStore',
    state: () => ({
        // initialize state from local storage to enable user to stay logged in
        maps: [], // Store user data
    }),
    actions: {
        async fetchMaps() {
            try{
                this.isLoading = true; // Set loading to true
                const resp = await fetchWrapper.get(`${backendUrl}/maps`);
                this.maps = resp

            } finally {
                this.isLoading = false; // Set loading to false once complete
            }
        },
        async updateMap(map) {
            const mapId = map.id;
            await fetchWrapper.put(`${backendUrl}/maps/${mapId}`, map);
        },
        async createMap(map) {
            return await fetchWrapper.post(`${backendUrl}/maps`, map);
        },
        async uploadMapImage(map_id, file) {
            const formData = new FormData();
            formData.append("image", file);
            await fetchWrapper.fileUpload(`${backendUrl}/maps/${map_id}/image`, formData);
        },
        async deleteMap(map_id) {
            await fetchWrapper.delete(`${backendUrl}/maps/${map_id}`);
        },
    }
});
