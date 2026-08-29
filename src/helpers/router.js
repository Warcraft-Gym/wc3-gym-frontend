import { createRouter, createWebHashHistory } from 'vue-router';

import { useAuthStore } from '@/stores';
import { HomeView, LoginView, ProfileView, PlayersView, SeasonsView, SeasonDetailsView, MatchDetailsView, SeasonTeamDetailsView, SeasonTeamAssignView, MapsView, TeamsView, PublicSignupView, PlayerDashboardView, ConfigView, FantasyLeaderboardView, FantasyBetsView, FantasyDashboardView, FantasyTiersView, UserGuideView, KothView, KothDashboard, PlayerCareerStatsView, SeasonReportView, RandomStatsView, LadderView } from '@/views';

// meta.role: the lowest session role the route accepts; meta.nav / meta.bar = false hide the links / app bar
const RANK = { public: 0, guest: 1, member: 2, coach: 3, admin: 4 };

// a session with no role claim is a member, which is what the admin-token login mints
export const canSeeRole = (role, need) => RANK[role || 'member'] >= RANK[need || 'public'];
export const router = createRouter({
    history: createWebHashHistory(),
    linkActiveClass: 'active',
    routes: [
        { path: '/', component: HomeView, meta: { role: 'admin' } },
        { path: '/login', component: LoginView, meta: { role: 'public' } },
        { path: '/profile', component: ProfileView, meta: { role: 'guest' } },
        { path: '/seasons', component: SeasonsView, meta: { role: 'guest' } },
        { path: '/signup', component: PublicSignupView, meta: { role: 'public', nav: false } },
        { path: '/player-dashboard', component: PlayerDashboardView, meta: { role: 'public', nav: false } },
        { path: '/fantasy-registration', component: FantasyDashboardView, meta: { role: 'public' } },
        { path: '/players', component: PlayersView, meta: { role: 'guest' } },
        { path: '/seasons/:id', component: SeasonDetailsView, meta: { role: 'guest' } },
        { path: '/seasons/:id/assign', component: SeasonTeamAssignView, meta: { role: 'admin' } },
        { path: '/match/:id', component: MatchDetailsView, meta: { role: 'guest' } },
        { path: '/team/:id/season/:season_id', component: SeasonTeamDetailsView, meta: { role: 'guest' } },
        { path: '/maps', component: MapsView, meta: { role: 'admin' } },
        { path: '/teams', component: TeamsView, meta: { role: 'guest' } },
        { path: '/config', component: ConfigView, meta: { role: 'admin' } },
        { path: '/fantasy', component: FantasyLeaderboardView, meta: { role: 'member' } },
        { path: '/fantasy/bets', component: FantasyBetsView, meta: { role: 'admin' } },
        { path: '/fantasy/tiers', component: FantasyTiersView, meta: { role: 'admin' } },
        { path: '/koth', component: KothView, meta: { role: 'admin' } },
        { path: '/koth/dashboard', component: KothDashboard, meta: { role: 'public', nav: false, bar: false } },
        { path: '/user-guide', component: UserGuideView, meta: { role: 'admin' } },
        { path: '/player-stats', component: PlayerCareerStatsView, meta: { role: 'guest' } },
        { path: '/report', component: SeasonReportView, meta: { role: 'public' } },
        { path: '/report/:id', component: SeasonReportView, meta: { role: 'public' } },
        { path: '/ladder', component: LadderView, meta: { role: 'guest' } },
        { path: '/random-stats', component: RandomStatsView, meta: { role: 'public', nav: false, bar: false } }
    ]
});

router.beforeEach((to) => {
    if (to.meta.role === 'public') return;

    const auth = useAuthStore();
    if (!auth.me) {
        auth.returnUrl = to.fullPath;
        return '/login';
    }
    if (!canSeeRole(auth.me.role, to.meta.role)) {
        return '/profile';
    }
});
