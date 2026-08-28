<script setup>
import { RouterLink, RouterView, useRoute } from 'vue-router';
import { storeToRefs } from 'pinia';
import { onMounted, onUnmounted, computed } from 'vue';
import { useAuthStore } from '@/stores';

const authStore = useAuthStore();
const { user: authUser } = storeToRefs(authStore);
const route = useRoute();

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

// show navigation links only for authenticated users on non-public routes
const showNavLinks = () => {
    if (!authStore.user) return false;
    // hide on explicit public-only routes
    if (route.path === '/signup' || route.path === '/player-dashboard' || route.path === '/fantasy-registration' || route.path === '/koth/dashboard' || route.path === '/random-stats') return false;
    return true;
}
</script>

<template>
    <v-app> 
    <v-app-bar v-if="route.path !== '/koth/dashboard' && route.path !== '/random-stats' && route.query.readonly !== '1' && route.query.readonly !== 'true'">
            <v-app-bar-title>GNL APP</v-app-bar-title>
            <template v-slot:append>
                <v-list v-show="showNavLinks()" class="inline-nav" nav>
                    <v-list-item class="nav-link-item">
                        <RouterLink to="/" class="nav-link">Home</RouterLink>
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
                            <v-list-item>
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
                    <v-menu offset-y>
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
                                <RouterLink to="/fantasy/bets">Manage Bets</RouterLink>
                            </v-list-item>
                            <v-list-item>
                                <RouterLink to="/fantasy/tiers">Player Tiers</RouterLink>
                            </v-list-item>
                        </v-list>
                    </v-menu>
                    <v-list-item class="nav-link-item">
                        <RouterLink to="/koth" class="nav-link">KOTH</RouterLink>
                    </v-list-item>
                    <v-list-item class="nav-link-item">
                        <RouterLink to="/config" class="nav-link">Config</RouterLink>
                    </v-list-item>
                    <v-list-item class="nav-link-item">
                        <RouterLink to="/user-guide" class="nav-link">User Guide</RouterLink>
                    </v-list-item>
                    <v-list-item>
                        <v-btn 
                            append-icon="mdi-logout"
                            @click="authStore.logout()"
                            color="black"
                            variant="tonal">
                            Logout
                        </v-btn> 
                    </v-list-item>
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

.gnl-menu-activator {
    cursor: pointer;
}

.gnl-menu-activator .nav-link {
    display: flex;
    align-items: center;
    text-decoration: none;
    color: #1976d2;
}

.gnl-dropdown {
    min-width: 180px;
}

.gnl-dropdown .v-list-item {
    padding: 0;
}

.gnl-dropdown a {
    display: block;
    width: 100%;
    padding: 8px 16px;
    text-decoration: none;
    color: inherit;
}

.gnl-dropdown a:hover {
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