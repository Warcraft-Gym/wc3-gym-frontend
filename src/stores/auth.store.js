import { defineStore } from 'pinia';

import { fetchWrapper, router } from '@/helpers';

const backendUrl = `${import.meta.env.VITE_BACKEND_URL}`

let clerk = null;  // Clerk's useAuth(), handed over by App.vue where composables are legal

export const useAuthStore = defineStore({
    id: 'auth',
    state: () => ({
        user: JSON.parse(localStorage.getItem('user')),  // the legacy admin-token session only
        me: JSON.parse(localStorage.getItem('me')),
        returnUrl: null
    }),
    getters: {
        isAdmin: (s) => s.me?.role === 'admin',
        isCaptain: (s) => s.me?.role === 'captain' || s.me?.role === 'admin'
    },
    actions: {
        useClerkAuth(auth) {
            clerk = auth;
        },
        // break-glass admin-token login, reached only from /login?legacy=1
        async login(token) {
            this.user = await fetchWrapper.post(`${backendUrl}/login`, { token });
            this.me = { role: 'admin' };  // the admin token is an admin session by definition
            localStorage.setItem('user', JSON.stringify(this.user));
            localStorage.setItem('me', JSON.stringify(this.me));
            router.push(this.returnUrl || '/');
        },
        // the legacy token wins; every other session sends the Clerk session JWT
        async token() {
            return this.user?.access_token || (clerk ? await clerk.getToken.value() : null);
        },
        async fetchMe() {
            this.me = await fetchWrapper.get(`${backendUrl}/me`);
            localStorage.setItem('me', JSON.stringify(this.me));
            return this.me;
        },
        clear() {
            this.user = null;
            this.me = null;
            localStorage.removeItem('user');
            localStorage.removeItem('me');
        },
        async logout() {
            if (!this.user) await clerk?.signOut.value();  // the legacy token has no Clerk session
            this.clear();
            router.push('/login');
        }
    }
});
