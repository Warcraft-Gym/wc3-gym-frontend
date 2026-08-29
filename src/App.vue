<script setup>
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';
import { onMounted, onUnmounted, computed, watch } from 'vue';
import { useAuth } from '@clerk/vue';
import { useAuthStore } from '@/stores';
import { canSeeRole } from '@/helpers';

const authStore = useAuthStore();
const { me } = storeToRefs(authStore);
const route = useRoute();
const router = useRouter();

// Clerk owns the session; the fetch wrapper reads its token through the store
const clerk = useAuth();
authStore.useClerkAuth(clerk);

// /me carries the role, name and avatar the nav draws
watch([clerk.isLoaded, clerk.isSignedIn], async ([loaded, signedIn]) => {
    if (!loaded || authStore.user) return;  // the legacy admin token owns its own session
    if (!signedIn) {
        authStore.clear();
        if (route.meta.role !== 'public') router.push('/login');
        return;
    }
    const session = await authStore.fetchMe().catch(() => null);
    if (session && route.path === '/login') {
        router.push(session.role === 'admin' ? (authStore.returnUrl || '/') : '/profile');
    }
}, { immediate: true });

const isReadonly = computed(() =>
    route.query.readonly === '1' || route.query.readonly === 'true'
);

let resizeObserver = null;

const sendHeight = () => {
    window.parent.postMessage(
        { type: 'gnl-iframe-height', height: document.documentElement.scrollHeight },
        '*'
    );
};

onMounted(() => {
    if (isReadonly.value) {
        resizeObserver = new ResizeObserver(sendHeight);
        resizeObserver.observe(document.body);
    }
});

onUnmounted(() => {
    resizeObserver?.disconnect();
});

// the nav is drawn for a session on any route that does not opt out with meta.nav
const showNavLinks = computed(() => !!me.value && route.meta.nav !== false);
const showBar = computed(() => route.meta.bar !== false && !isReadonly.value);

// a link is drawn only when the session role reaches the target route's meta.role
const canSee = (path) => canSeeRole(me.value?.role, router.resolve(path).meta.role);

const avatarUrl = computed(() => me.value?.avatar || null); // /me already answers the CDN URL
const initials = computed(() => (me.value?.name || '?').slice(0, 2).toUpperCase());
const roleLabel = computed(() => me.value?.role?.replace(/^./, c => c.toUpperCase()));
</script>

<template>
    <v-app> 
    <v-app-bar v-if="showBar">
            <v-app-bar-title>GNL APP</v-app-bar-title>
            <template v-slot:append>
                <v-list v-show="showNavLinks" class="inline-nav" nav>
                    <v-list-item v-if="canSee('/')" class="nav-link-item">
                        <RouterLink to="/" class="nav-link">Home</RouterLink>
                    </v-list-item>
                    <v-list-item class="nav-link-item">
                        <RouterLink to="/profile" class="nav-link">Profile</RouterLink>
                    </v-list-item>
                    <v-menu offset-y>
                        <template v-slot:activator="{ props }">
                            <v-list-item v-bind="props" class="gnl-menu-activator">
                                <a class="nav-link">
                                    GNL
                                    <v-icon size="small" class="ml-1">mdi-chevron-down</v-icon>
                                </a>
                            </v-list-item>
                        </template>
                        <v-list class="gnl-dropdown">
                            <v-list-item>
                                <RouterLink to="/seasons">Seasons</RouterLink>
                            </v-list-item>
                            <v-list-item>
                                <RouterLink to="/players">Players</RouterLink>
                            </v-list-item>
                            <v-list-item>
                                <RouterLink to="/teams">Teams</RouterLink>
                            </v-list-item>
                            <v-list-item v-if="canSee('/maps')">
                                <RouterLink to="/maps">Maps</RouterLink>
                            </v-list-item>
                            <v-list-item>
                                <RouterLink to="/player-stats">Player Stats</RouterLink>
                            </v-list-item>
                            <v-list-item>
                                <RouterLink to="/report">Season Report</RouterLink>
                            </v-list-item>
                            <v-list-item>
                                <RouterLink to="/ladder">W3C Ladder</RouterLink>
                            </v-list-item>
                        </v-list>
                    </v-menu>
                    <v-menu v-if="canSee('/fantasy')" offset-y>
                        <template v-slot:activator="{ props }">
                            <v-list-item v-bind="props" class="fantasy-menu-activator">
                                <a class="nav-link">
                                    Fantasy
                                    <v-icon size="small" class="ml-1">mdi-chevron-down</v-icon>
                                </a>
                            </v-list-item>
                        </template>
                        <v-list class="fantasy-dropdown">
                            <v-list-item>
                                <RouterLink to="/fantasy">Leaderboard</RouterLink>
                            </v-list-item>
                            <v-list-item>
                                <RouterLink to="/fantasy-registration">My Fantasy Team</RouterLink>
                            </v-list-item>
                            <v-list-item v-if="canSee('/fantasy/bets')">
                                <RouterLink to="/fantasy/bets">Manage Bets</RouterLink>
                            </v-list-item>
                            <v-list-item v-if="canSee('/fantasy/tiers')">
                                <RouterLink to="/fantasy/tiers">Player Tiers</RouterLink>
                            </v-list-item>
                        </v-list>
                    </v-menu>
                    <v-list-item v-if="canSee('/koth')" class="nav-link-item">
                        <RouterLink to="/koth" class="nav-link">KOTH</RouterLink>
                    </v-list-item>
                    <v-menu v-if="canSee('/config')" offset-y>
                        <template v-slot:activator="{ props }">
                            <v-list-item v-bind="props" class="config-menu-activator">
                                <a class="nav-link">
                                    Config
                                    <v-icon size="small" class="ml-1">mdi-chevron-down</v-icon>
                                </a>
                            </v-list-item>
                        </template>
                        <v-list class="config-dropdown">
                            <v-list-item>
                                <RouterLink to="/config">Settings</RouterLink>
                            </v-list-item>
                            <v-list-item>
                                <RouterLink to="/config/discord-roles">Discord Roles</RouterLink>
                            </v-list-item>
                        </v-list>
                    </v-menu>
                    <v-list-item v-if="canSee('/user-guide')" class="nav-link-item">
                        <RouterLink to="/user-guide" class="nav-link">User Guide</RouterLink>
                    </v-list-item>
                    <v-menu offset-y>
                        <template v-slot:activator="{ props }">
                            <v-list-item v-bind="props" class="nav-link-item">
                                <v-avatar size="36" color="primary">
                                    <v-img v-if="avatarUrl" :src="avatarUrl" alt="" />
                                    <span v-else>{{ initials }}</span>
                                </v-avatar>
                            </v-list-item>
                        </template>
                        <v-list>
                            <v-list-item :title="me?.name" :subtitle="roleLabel" />
                            <v-divider />
                            <v-list-item prepend-icon="mdi-logout" title="Logout" @click="authStore.logout()" />
                        </v-list>
                    </v-menu>
                </v-list>               
            </template>
        </v-app-bar>  

        <v-main>                  
            <v-container>              
                <RouterView />
            </v-container>  
        </v-main>   
    </v-app>
</template>

<style>
@import '@/assets/base.css';

.inline-nav {
    display: flex;
}

.inline-nav .v-list-item {
    margin: 0 !important;
}

.nav-link-item {
    cursor: pointer;
}

.nav-link-item .nav-link {
    display: flex;
    align-items: center;
    text-decoration: none;
    color: #1976d2;
}

.gnl-menu-activator,
.config-menu-activator {
    cursor: pointer;
}

.gnl-menu-activator .nav-link,
.config-menu-activator .nav-link {
    display: flex;
    align-items: center;
    text-decoration: none;
    color: #1976d2;
}

.gnl-dropdown,
.config-dropdown {
    min-width: 180px;
}

.gnl-dropdown .v-list-item,
.config-dropdown .v-list-item {
    padding: 0;
}

.gnl-dropdown a,
.config-dropdown a {
    display: block;
    width: 100%;
    padding: 8px 16px;
    text-decoration: none;
    color: inherit;
}

.gnl-dropdown a:hover,
.config-dropdown a:hover {
    background-color: rgba(0, 0, 0, 0.05);
}

.fantasy-menu-activator {
    cursor: pointer;
}

.fantasy-menu-activator .nav-link {
    display: flex;
    align-items: center;
    text-decoration: none;
    color: #1976d2;
}

.fantasy-dropdown {
    min-width: 180px;
}

.fantasy-dropdown .v-list-item {
    padding: 0;
}

.fantasy-dropdown a {
    display: block;
    width: 100%;
    padding: 8px 16px;
    text-decoration: none;
    color: inherit;
}

.fantasy-dropdown a:hover {
    background-color: rgba(0, 0, 0, 0.04);
}

.fantasy-dropdown a.active {
    background-color: rgba(var(--v-theme-primary), 0.12);
    color: rgb(var(--v-theme-primary));
}
</style>