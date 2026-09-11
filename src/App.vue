<script setup>
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';
import { onMounted, onUnmounted, computed, ref, watch, watchEffect } from 'vue';
import { useAuth } from '@clerk/vue';
import { useDisplay, useTheme } from 'vuetify';
import { useAuthStore, useSeasonStore, useTeamStore } from '@/stores';
import { canSeeRole, homePath, themeMode, setThemeMode, activeTheme } from '@/helpers';
import { saveReturnUrl, takeReturnUrl } from '@/helpers/return-url.mjs';
import PlayerPanel from '@/components/PlayerPanel.vue';
import w3cLogo from '@/assets/media/w3c-logo.png';
import w3cLogoWhite from '@/assets/media/w3c-logo-white.png';

const authStore = useAuthStore();
const seasonStore = useSeasonStore();
const { me } = storeToRefs(authStore);
const route = useRoute();
const router = useRouter();

// Light, dark, or the operating system setting. The choice is kept in localStorage.
const THEMES = [
    { value: 'light', title: 'Light', icon: 'mdi-white-balance-sunny' },
    { value: 'dark', title: 'Dark', icon: 'mdi-weather-night' },
    { value: 'system', title: 'System', icon: 'mdi-theme-light-dark' },
];
const vuetifyTheme = useTheme();
watchEffect(() => { vuetifyTheme.global.name.value = activeTheme(); });
// The dark-ink W3C mark is made for the light theme; the dark theme takes the white original.
const w3cMark = computed(() => (vuetifyTheme.global.current.value.dark ? w3cLogoWhite : w3cLogo));
const themeIcon = computed(() => THEMES.find(t => t.value === themeMode.value)?.icon || 'mdi-theme-light-dark');

// Clerk owns the session; the fetch wrapper reads its token through the store
const clerk = useAuth();
authStore.useClerkAuth(clerk);

// /me carries the role, name and avatar the nav draws
watch([clerk.isLoaded, clerk.isSignedIn], async ([loaded, signedIn]) => {
    if (!loaded || authStore.user) return;  // the legacy admin token owns its own session
    await router.isReady();  // before the first navigation resolves, route is the start location with no meta.role
    if (!signedIn) {
        authStore.clear();
        if (route.meta.role !== 'public') {
            saveReturnUrl(route.fullPath);
            router.push('/login');
        }
        return;
    }
    const session = await authStore.fetchMe().catch((e) => { authStore.loginError = e.message; return null; });
    if (!session) {
        await authStore.logout();
        return;
    }
    seasonStore.ensureSeasons().catch(() => {});  // the menu links the current season by slug
    if (route.path === '/login') {
        router.push(takeReturnUrl(homePath(session.role)));
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

// one link tree drawn as the bar's menus on desktop and as the drawer on phones
const NAV = computed(() => [
    { title: 'Home', to: '/' },
    { title: 'GNL', to: '/report', items: [
        { title: 'Season Report', to: '/report' },
        { title: 'Upcoming', to: '/upcoming' },
        { title: 'Teams', to: '/teams' },
        { title: 'Ladder', to: '/ladder', mark: true },
        { title: 'Players', to: '/players' },
        ...(me.value?.season_id ? [{ title: 'Players (this season)', to: `/players?season=${seasonStore.slugOf(me.value.season_id)}` }] : []),
        { title: 'Seasons', to: '/seasons' },
        { title: '1v1 Maps', to: '/maps' },
    ] },
    { title: 'Fantasy', to: '/fantasy', items: [
        { title: 'Leaderboard', to: '/fantasy' },
        { title: 'My Fantasy Team', to: '/fantasy-registration' },
        { title: 'Manage Bets', to: '/fantasy/bets' },
        { title: 'Player Tiers', to: '/fantasy/tiers' },
    ] },
    { title: 'KOTH', to: '/koth' },
    { title: 'Config', to: '/config', items: [
        { title: 'Settings', to: '/config' },
        { title: 'Discord Roles', to: '/config/discord-roles' },
        { title: 'Access', to: '/config/access' },
    ] },
    { title: 'User Guide', to: '/user-guide' },
]);
const nav = computed(() => NAV.value.filter(g => canSee(g.to)).map(g => (g.items ? { ...g, items: g.items.filter(i => canSee(i.to)) } : g)));
const { smAndDown } = useDisplay();
const drawer = ref(false);
watch(() => route.path, () => { drawer.value = false; });

const avatarUrl = computed(() => me.value?.avatar || null); // /me already answers the CDN URL
const initials = computed(() => (me.value?.name || '?').slice(0, 2).toUpperCase());
const roleLabel = computed(() => {
    if (me.value?.superadmin) return 'Super Admin';
    const role = me.value?.role?.replace(/^./, c => c.toUpperCase());
    return me.value?.team ? `${role} · ${me.value.team.name}` : role;  // a captain is named with the team
});

// a guest reaches no dashboard, so his menu item stays on /profile
const dashboardPath = computed(() => (canSee('/player-dashboard') ? '/player-dashboard' : '/profile'));
const identity = computed(() => [me.value?.name, roleLabel.value].filter(Boolean).join(' · '));

// view-as: an admin sees the app as a lower role; the legacy token session cannot
const canViewAs = computed(() => me.value?.actual_role === 'admin' && !authStore.user);
const teamDialog = ref(false);
const teams = ref([]);
const chosenTeam = ref(null);
const pickCaptain = async () => {
    teams.value = await useTeamStore().getTeamsBasic();
    teamDialog.value = true;
};
const applyCaptain = () => {
    teamDialog.value = false;
    authStore.setViewAs({ role: 'captain', teamId: chosenTeam.value });
};
</script>

<template>
    <v-app> 
    <v-app-bar v-if="showBar">
            <v-app-bar-nav-icon v-if="showNavLinks && smAndDown" @click="drawer = !drawer" />
            <v-app-bar-title>
                <RouterLink to="/report" class="app-title">GNL APP</RouterLink>
            </v-app-bar-title>
            <template v-slot:append>
                <v-list v-show="showNavLinks" class="inline-nav" nav>
                    <template v-if="!smAndDown">
                        <template v-for="group in nav" :key="group.to">
                            <v-menu v-if="group.items" offset-y>
                                <template v-slot:activator="{ props }">
                                    <v-list-item v-bind="props" class="nav-link-item">
                                        <a class="nav-link">
                                            {{ group.title }}
                                            <v-icon size="small" class="ml-1">mdi-chevron-down</v-icon>
                                        </a>
                                    </v-list-item>
                                </template>
                                <v-list class="nav-dropdown">
                                    <v-list-item v-for="item in group.items" :key="item.to">
                                        <RouterLink :to="item.to" :class="{ 'd-inline-flex align-baseline': item.mark }"><img v-if="item.mark" :src="w3cMark" style="height: 1.4em; transform: translateY(3%)" alt="W3C" class="mr-1">{{ item.title }}</RouterLink>
                                    </v-list-item>
                                </v-list>
                            </v-menu>
                            <v-list-item v-else class="nav-link-item">
                                <RouterLink :to="group.to" class="nav-link">{{ group.title }}</RouterLink>
                            </v-list-item>
                        </template>
                    </template>
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
                            <v-list-item title="Player Dashboard" :subtitle="identity" prepend-icon="mdi-view-dashboard" :to="dashboardPath" />
                            <v-list-item v-if="canSee('/player-dashboard')" title="Edit Player Info" prepend-icon="mdi-pencil" :to="{ path: '/player-dashboard', query: { edit: 1 } }" />
                            <!-- /me names the captain's team, or the roster team of this season; a player on no roster sees no item -->
                            <v-list-item v-if="me?.team" title="My Team" prepend-icon="mdi-shield-account" :to="`/team/${me.team.id}`" />
                            <template v-if="canViewAs">
                                <v-divider />
                                <v-list-subheader>View as</v-list-subheader>
                                <v-list-item prepend-icon="mdi-eye-outline" title="Captain…" @click="pickCaptain" />
                                <v-list-item prepend-icon="mdi-eye-outline" title="Member" @click="authStore.setViewAs({ role: 'member' })" />
                                <v-list-item prepend-icon="mdi-eye-outline" title="Guest" @click="authStore.setViewAs({ role: 'guest' })" />
                            </template>
                            <v-divider />
                            <v-list-item prepend-icon="mdi-logout" title="Logout" @click="authStore.logout()" />
                        </v-list>
                    </v-menu>
                </v-list>
                <v-menu offset-y>
                    <template v-slot:activator="{ props }">
                        <v-btn v-bind="props" :icon="themeIcon" variant="text" aria-label="Theme" />
                    </template>
                    <v-list>
                        <v-list-item v-for="t in THEMES" :key="t.value" :title="t.title"
                            :prepend-icon="t.icon" :active="themeMode === t.value"
                            @click="setThemeMode(t.value)" />
                    </v-list>
                </v-menu>
            </template>
        </v-app-bar>
        <v-navigation-drawer v-if="showNavLinks && smAndDown" v-model="drawer" temporary>
            <v-list nav>
                <template v-for="group in nav" :key="group.to">
                    <v-list-group v-if="group.items" :value="group.to">
                        <template v-slot:activator="{ props }">
                            <v-list-item v-bind="props" :title="group.title" />
                        </template>
                        <v-list-item v-for="item in group.items" :key="item.to" :title="item.title" :to="item.to" />
                    </v-list-group>
                    <v-list-item v-else :title="group.title" :to="group.to" />
                </template>
            </v-list>
        </v-navigation-drawer>

        <!-- A dialog fills the screen on a phone -->
        <v-defaults-provider :defaults="{ VDialog: { fullscreen: smAndDown } }">
            <v-main>
                <v-alert v-if="authStore.viewAs" type="warning" density="compact" class="ma-2">
                    Viewing as {{ roleLabel }}
                    <template v-slot:append>
                        <v-btn size="small" variant="outlined" @click="authStore.setViewAs(null)">Exit</v-btn>
                    </template>
                </v-alert>
                <v-dialog v-model="teamDialog" max-width="400">
                    <v-card title="View as captain">
                        <v-card-text>
                            <v-select v-model="chosenTeam" :items="teams" item-title="name" item-value="id" label="Team" />
                        </v-card-text>
                        <v-card-actions>
                            <v-spacer />
                            <v-btn @click="teamDialog = false">Cancel</v-btn>
                            <v-btn color="primary" :disabled="!chosenTeam" @click="applyCaptain">Apply</v-btn>
                        </v-card-actions>
                    </v-card>
                </v-dialog>
                <v-container>
                    <RouterView />
                </v-container>
                <!-- A player name opens this over the page, so nothing typed is lost -->
                <PlayerPanel />
            </v-main>
        </v-defaults-provider>
        <v-footer v-if="showBar" class="justify-end text-caption py-1" color="transparent">
            <RouterLink to="/credits" class="text-grey text-decoration-none">Credits</RouterLink>
        </v-footer>
    </v-app>
</template>

<style>
@import '@/assets/base.css';

.app-title {
    color: inherit;
    text-decoration: none;
}

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
    color: rgb(var(--v-theme-primary));
}

.nav-dropdown {
    min-width: 180px;
}

.nav-dropdown .v-list-item {
    padding: 0;
}

.nav-dropdown a {
    display: block;
    width: 100%;
    padding: 8px 16px;
    text-decoration: none;
    color: inherit;
}

.nav-dropdown a:hover {
    background-color: rgba(var(--v-theme-on-surface), 0.05);
}

.nav-dropdown a.active {
    background-color: rgba(var(--v-theme-primary), 0.12);
    color: rgb(var(--v-theme-primary));
}
</style>