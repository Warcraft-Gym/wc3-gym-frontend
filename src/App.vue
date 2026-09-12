<script setup>
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';
import { onMounted, onUnmounted, computed, ref, watch, watchEffect } from 'vue';
import { useAuth } from '@clerk/vue';
import { useDisplay, useTheme } from 'vuetify';
import { useAuthStore, useSeasonStore, useTeamStore } from '@/stores';
import { canSeeRole, homePath, themeMode, setThemeMode, activeTheme } from '@/helpers';
import { saveReturnUrl, takeReturnUrl } from '@/helpers/return-url.mjs';
import { myProfilePath } from '@/helpers/players';
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
    await router.isReady().catch(() => {});  // wait for the first navigation (route is the start location until then); a failed guard must not skip /me
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

// the nav links are drawn for a session on any route that does not opt out with meta.nav
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
const roleLabel = computed(() => (me.value?.superadmin ? 'Super Admin' : me.value?.role?.replace(/^./, c => c.toUpperCase())));

// a guest has no player page, so his menu item stays on /profile
const profileTo = computed(() => myProfilePath(me.value));
const identity = computed(() => [me.value?.name, roleLabel.value].filter(Boolean).join(' · '));

// view-as: an admin sees the app as a lower role; the legacy token session cannot
const canViewAs = computed(() => me.value?.actual_role === 'admin' && !authStore.user);
const viewDialog = ref(false);
const viewRole = ref('member');
const viewSeats = ref([]);  // "<teamId>:<seasonId>" per chosen seat, the shape the header sends
const seatItems = ref([]);
// every team of every season /me lists, so an admin can hold a seat in more than one season
const openViewAs = async () => {
    viewDialog.value = true;
    viewRole.value = authStore.viewAs?.role ?? 'member';  // the dialog opens on the view in force
    viewSeats.value = (authStore.viewAs?.seats ?? []).map(seat => `${seat.teamId}:${seat.seasonId}`);
    const teamStore = useTeamStore();
    const seasons = me.value?.seasons ?? [];
    const rosters = await Promise.all(seasons.map(season => teamStore.getTeamsSeasonBasic(season.id).catch(() => [])));
    seatItems.value = seasons.flatMap((season, i) => rosters[i].map((team, j) => ({
        title: `${team.name} · ${season.name}`,
        value: `${team.id}:${season.id}`,
        team: team.name,
        season: season.name,
        first: j === 0,
    })));
};
const applyViewAs = () => {
    viewDialog.value = false;
    const seats = viewSeats.value.map(seat => {
        const item = seatItems.value.find(row => row.value === seat);
        const [teamId, seasonId] = seat.split(':');
        return { teamId: Number(teamId), seasonId: Number(seasonId), team: item?.team, season: item?.season };
    });
    authStore.setViewAs(viewRole.value === 'captain' ? { role: 'captain', seats } : { role: viewRole.value });
};
// the banner names each seat the admin chose; a seat stored before this shape falls back to /me
const viewAsLabel = computed(() => {
    const role = authStore.viewAs?.role?.replace(/^./, c => c.toUpperCase()) ?? '';
    const seats = (authStore.viewAs?.seats ?? []).map(seat => {
        const entry = me.value?.seasons?.find(season => Number(season.id) === seat.seasonId);
        const team = seat.team ?? entry?.team?.name;
        return team && `${team} (${seat.season ?? entry?.name})`;
    }).filter(Boolean);
    return seats.length ? `${role} · ${seats.join(', ')}` : role;
});
</script>

<template>
    <v-app> 
    <v-app-bar v-if="showBar">
            <v-app-bar-nav-icon v-if="showNavLinks && smAndDown" aria-label="Menu" :aria-expanded="drawer" @click="drawer = !drawer" />
            <v-app-bar-title>
                <RouterLink to="/report" class="app-title">GNL APP</RouterLink>
            </v-app-bar-title>
            <template v-slot:append>
                <nav v-if="showNavLinks && !smAndDown" class="inline-nav" aria-label="Main">
                    <template v-for="group in nav" :key="group.to">
                        <v-menu v-if="group.items" offset-y>
                            <template v-slot:activator="{ props }">
                                <v-btn v-bind="props" class="nav-link" variant="text" append-icon="mdi-chevron-down">{{ group.title }}</v-btn>
                            </template>
                            <v-list class="nav-dropdown">
                                <v-list-item v-for="item in group.items" :key="item.to">
                                    <RouterLink :to="item.to" :class="{ 'd-inline-flex align-baseline': item.mark }"><img v-if="item.mark" :src="w3cMark" style="height: 1.4em; transform: translateY(3%)" alt="W3C" class="mr-1">{{ item.title }}</RouterLink>
                                </v-list-item>
                            </v-list>
                        </v-menu>
                        <v-btn v-else :to="group.to" class="nav-link" variant="text">{{ group.title }}</v-btn>
                    </template>
                </nav>
                <!-- the session menu sits outside the link tree, so a meta.nav route keeps it -->
                <v-menu v-if="me" offset-y>
                    <template v-slot:activator="{ props }">
                        <v-btn v-bind="props" icon variant="text" :aria-label="`Account menu, ${identity}`">
                            <v-avatar size="36" color="primary">
                                <v-img v-if="avatarUrl" :src="avatarUrl" alt="" />
                                <span v-else>{{ initials }}</span>
                            </v-avatar>
                        </v-btn>
                    </template>
                    <v-list>
                        <v-list-item :title="me.name" :subtitle="roleLabel">
                            <template v-slot:prepend>
                                <v-avatar size="36" color="primary" class="mr-3">
                                    <v-img v-if="avatarUrl" :src="avatarUrl" alt="" />
                                    <span v-else>{{ initials }}</span>
                                </v-avatar>
                            </template>
                        </v-list-item>
                        <v-divider />
                        <v-list-item title="Profile" prepend-icon="mdi-account" :to="profileTo" />
                        <v-list-item v-if="me?.user" title="Availability" prepend-icon="mdi-calendar-month" to="/availability" />
                        <template v-if="canViewAs">
                            <v-divider />
                            <v-list-item prepend-icon="mdi-eye-outline" title="View as…" @click="openViewAs" />
                        </template>
                        <v-divider />
                        <v-list-item prepend-icon="mdi-logout" title="Logout" @click="authStore.logout()" />
                    </v-list>
                </v-menu>
                <!-- a signed-out visitor lands on the public pages; this is his way in -->
                <v-btn v-if="!me" to="/login" variant="text">Sign in</v-btn>
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
                    Viewing as {{ viewAsLabel }}
                    <template v-slot:append>
                        <v-btn size="small" variant="outlined" @click="authStore.setViewAs(null)">Exit</v-btn>
                    </template>
                </v-alert>
                <v-dialog v-model="viewDialog" max-width="400">
                    <v-card title="View as">
                        <v-card-text class="d-flex flex-column ga-4">
                            <v-btn-toggle v-model="viewRole" mandatory variant="outlined" color="primary" divided class="w-100">
                                <v-btn value="guest" class="flex-grow-1">Guest</v-btn>
                                <v-btn value="member" class="flex-grow-1">Member</v-btn>
                                <v-btn value="captain" class="flex-grow-1">Captain</v-btn>
                            </v-btn-toggle>
                            <v-select v-if="viewRole === 'captain'" v-model="viewSeats" :items="seatItems" multiple chips variant="outlined" label="Seats" hide-details>
                                <template v-slot:item="{ props, item }">
                                    <v-list-subheader v-if="item.raw.first">{{ item.raw.season }}</v-list-subheader>
                                    <v-list-item v-bind="props" />
                                </template>
                            </v-select>
                        </v-card-text>
                        <v-card-actions>
                            <v-spacer />
                            <v-btn @click="viewDialog = false">Cancel</v-btn>
                            <v-btn color="primary" :disabled="viewRole === 'captain' && !viewSeats.length" @click="applyViewAs">View</v-btn>
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
            <RouterLink to="/credits" class="text-medium-emphasis text-decoration-none">Credits</RouterLink>
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
    align-items: center;
}

.nav-link {
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