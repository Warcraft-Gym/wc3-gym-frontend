<script setup>
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';
import { onMounted, onUnmounted, computed, ref, watch } from 'vue';
import { useAuth } from '@clerk/vue';
import { useDisplay } from 'vuetify';
import { useAuthStore, useTeamStore } from '@/stores';
import { canSeeRole } from '@/helpers';
import w3cLogo from '@/assets/media/w3c-logo.png';

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
    const session = await authStore.fetchMe().catch((e) => { authStore.loginError = e.message; return null; });
    if (!session) {
        await authStore.logout();
        return;
    }
    if (route.path === '/login') {
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

// one link tree drawn as the bar's menus on desktop and as the drawer on phones
const NAV = [
    { title: 'Home', to: '/' },
    { title: 'GNL', to: '/seasons', items: [
        { title: 'Seasons', to: '/seasons' },
        { title: 'Players', to: '/players' },
        { title: 'Teams', to: '/teams' },
        { title: '1v1 Maps', to: '/maps' },
        { title: 'Player Stats', to: '/player-stats' },
        { title: 'Season Report', to: '/report' },
        { title: 'Ladder', to: '/ladder', icon: w3cLogo },
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
];
const nav = computed(() => NAV.filter(g => canSee(g.to)).map(g => (g.items ? { ...g, items: g.items.filter(i => canSee(i.to)) } : g)));
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
            <v-app-bar-title>GNL APP</v-app-bar-title>
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
                                        <RouterLink :to="item.to" :class="{ 'd-inline-flex align-baseline': item.icon }"><img v-if="item.icon" :src="item.icon" style="height: 1.4em; transform: translateY(3%)" alt="W3C" class="mr-1">{{ item.title }}</RouterLink>
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
                            <v-list-item :title="me?.name" :subtitle="roleLabel" prepend-icon="mdi-account" to="/profile" />
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
        </v-main>
        <v-footer v-if="showBar" class="justify-end text-caption py-1" color="transparent">
            <RouterLink to="/credits" class="text-grey text-decoration-none">Credits</RouterLink>
        </v-footer>
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
    background-color: rgba(0, 0, 0, 0.05);
}

.nav-dropdown a.active {
    background-color: rgba(var(--v-theme-primary), 0.12);
    color: rgb(var(--v-theme-primary));
}
</style>