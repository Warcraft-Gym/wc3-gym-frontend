import { defineStore } from 'pinia';
import { fetchWrapper } from '@/helpers';

const backendUrl = `${import.meta.env.VITE_BACKEND_URL}`;

export const useKothStore = defineStore({
    id: 'kothStore',
    state: () => ({
        events: [],
        activeEvent: null,
        signups: [],
        kings: {},
        isLoading: false,
    }),
    actions: {
        // ============ Event Actions ============
        async fetchAllEvents() {
            try {
                this.isLoading = true;
                this.events = await fetchWrapper.get(`${backendUrl}/koth/events`);
            } finally {
                this.isLoading = false;
            }
        },

        async createEvent(eventData) {
            const newEvent = await fetchWrapper.post(`${backendUrl}/koth/events`, eventData);
            this.events.push(newEvent);
            return newEvent;
        },

        async updateEvent(eventId, eventData) {
            const updatedEvent = await fetchWrapper.put(`${backendUrl}/koth/events/${eventId}`, eventData);
            const index = this.events.findIndex(e => e.id === eventId);
            if (index !== -1) {
                this.events[index] = updatedEvent;
            }
            if (this.activeEvent && this.activeEvent.id === eventId) {
                this.activeEvent = updatedEvent;
            }
            return updatedEvent;
        },

        async activateEvent(eventId) {
            const activatedEvent = await fetchWrapper.post(`${backendUrl}/koth/events/${eventId}/activate`);
            // Update all events to reflect new active status
            await this.fetchAllEvents();
            this.activeEvent = activatedEvent;
            return activatedEvent;
        },

        async deleteEvent(eventId) {
            await fetchWrapper.delete(`${backendUrl}/koth/events/${eventId}`);
            this.events = this.events.filter(e => e.id !== eventId);
            if (this.activeEvent && this.activeEvent.id === eventId) {
                this.activeEvent = null;
            }
        },

        // ============ Signup Actions ============
        async fetchSignups(eventId) {
            try {
                this.isLoading = true;
                this.signups = await fetchWrapper.get(`${backendUrl}/koth/events/${eventId}/signups`);
                return this.signups;
            } finally {
                this.isLoading = false;
            }
        },

        async createSignup(signupData) {
            // Admin endpoint - requires JWT authentication
            const newSignups = await fetchWrapper.post(`${backendUrl}/koth/signups/admin`, signupData);
            this.signups.push(...newSignups);
            return newSignups;
        },

        // The logged-in player: the backend reads his battle tag from his profile
        async signupMe(races) {
            const newSignups = await fetchWrapper.post(`${backendUrl}/koth/signups/me`, { races });
            this.signups.push(...newSignups);
            return newSignups;
        },
        async withdrawMe(race = null) {
            // the caller refetches the signups; this list has no reliable own-row key
            const url = race ? `${backendUrl}/koth/signups/me?race=${encodeURIComponent(race)}` : `${backendUrl}/koth/signups/me`;
            await fetchWrapper.delete(url);
        },

        async createPublicSignup(signupData) {
            // Public endpoint - uses GET with query parameters and KOTH_NIGHTBOT_TOKEN
            const params = new URLSearchParams({
                token: signupData.token,
                battletag: signupData.battle_tag,
            });
            
            if (signupData.twitch_username) {
                params.append('twitch', signupData.twitch_username);
            }
            if (signupData.race) {
                params.append('race', signupData.race);
            }
            
            const response = await fetchWrapper.get(`${backendUrl}/koth/signup?${params.toString()}`);
            return response;
        },

        async deleteSignup(signupId) {
            await fetchWrapper.delete(`${backendUrl}/koth/signups/${signupId}`);
            this.signups = this.signups.filter(s => s.id !== signupId);
        },

        async setKing(signupId) {
            const updatedSignup = await fetchWrapper.post(`${backendUrl}/koth/signups/${signupId}/king`);
            // Update signups to reflect new king status
            const bracket = updatedSignup.bracket;
            this.signups = this.signups.map(s => {
                if (s.bracket === bracket && s.id !== signupId) {
                    return { ...s, is_king: 0 };
                } else if (s.id === signupId) {
                    return updatedSignup;
                }
                return s;
            });
            return updatedSignup;
        },

        async unsetKing(signupId) {
            const updatedSignup = await fetchWrapper.delete(`${backendUrl}/koth/signups/${signupId}/king`);
            const index = this.signups.findIndex(s => s.id === signupId);
            if (index !== -1) {
                this.signups[index] = updatedSignup;
            }
            return updatedSignup;
        },

        // ============ Utility Actions ============
        async fetchBracketKings(eventId) {
            try {
                this.kings = await fetchWrapper.get(`${backendUrl}/koth/events/${eventId}/kings`);
                return this.kings;
            } catch (error) {
                this.kings = {};
                throw error;
            }
        },

        // ============ Helper Methods ============
        getSignupsByBracket(bracket) {
            return this.signups
                .filter(s => s.bracket === bracket && s.is_active === 1)
                .sort((a, b) => b.mmr - a.mmr);
        },

        // One entry per player in a bracket, kings excluded. A player who signed up with
        // several races carries one signup per race, his best MMR first.
        getBracketPlayers(bracket) {
            const players = new Map();
            for (const signup of this.getSignupsByBracket(bracket)) {
                if (signup.is_king === 1) continue;
                const battleTag = signup.battle_tag.trim().toLowerCase();
                const player = players.get(battleTag);
                if (player) {
                    player.signups.push(signup);
                } else {
                    players.set(battleTag, {
                        battleTag,
                        name: signup.twitch_username || signup.battle_tag,
                        country: signup.country,
                        signups: [signup],
                    });
                }
            }
            return [...players.values()];
        },

        getBracketThresholdText(event) {
            if (!event) return {};
            return {
                1: `< ${event.bracket_1_threshold} MMR`,
                2: `${event.bracket_1_threshold} - ${event.bracket_2_threshold - 1} MMR`,
                3: `≥ ${event.bracket_2_threshold} MMR`
            };
        }
    }
});
