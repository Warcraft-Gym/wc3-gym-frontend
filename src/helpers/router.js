import { createRouter, createWebHashHistory } from 'vue-router';

import { useAuthStore } from '@/stores';
import { HomeView, LoginView, PlayersView, SeasonsView, SeasonDetailsView, MatchDetailsView, SeasonTeamDetailsView, SeasonTeamAssignView, MapsView, TeamsView, PublicSignupView, PlayerDashboardView, ConfigView, FantasyLeaderboardView, FantasyBetsView, FantasyDashboardView, FantasyTiersView, UserGuideView, KothView, KothDashboard, PlayerCareerStatsView, SeasonReportView, RandomStatsView, LadderView } from '@/views';

export const router = createRouter({
    history: createWebHashHistory(),
    linkActiveClass: 'active',
    routes: [
        { path: '/', component: HomeView },
        { path: '/login', component: LoginView },
        { path: '/seasons', component: SeasonsView },
        { path: '/signup', component: PublicSignupView },
        { path: '/player-dashboard', component: PlayerDashboardView },
        { path: '/fantasy-registration', component: FantasyDashboardView },
        { path: '/players', component: PlayersView },
        { path: '/seasons/:id', component: SeasonDetailsView },
        { path: '/seasons/:id/assign', component: SeasonTeamAssignView },
        { path: '/match/:id', component: MatchDetailsView},
        { path: '/team/:id/season/:season_id', component: SeasonTeamDetailsView},
        { path: '/maps', component: MapsView},
        { path: '/teams', component: TeamsView},
        { path: '/config', component: ConfigView},
        { path: '/fantasy', component: FantasyLeaderboardView},
        { path: '/fantasy/bets', component: FantasyBetsView},
        { path: '/fantasy/tiers', component: FantasyTiersView},
        { path: '/koth', component: KothView},
        { path: '/koth/dashboard', component: KothDashboard},
        { path: '/user-guide', component: UserGuideView},
        { path: '/player-stats', component: PlayerCareerStatsView},
        { path: '/report', component: SeasonReportView},
        { path: '/report/:id', component: SeasonReportView},
        { path: '/ladder', component: LadderView},
        { path: '/random-stats', component: RandomStatsView },
        
    ]
});

router.beforeEach(async (to) => {
    // redirect to login page if not logged in and trying to access a restricted page
    const publicPages = ['/login','/signup','/signup-token','/player-dashboard','/fantasy-registration','/koth/dashboard','/random-stats'];
    const authRequired = !publicPages.includes(to.path) && !to.path.startsWith('/report');
    const auth = useAuthStore();

    if (authRequired && !auth.user) {
        auth.returnUrl = to.fullPath;
        return '/login';
    }
    if(authRequired && auth.user && auth.isTokenExpired(auth.user.access_token)) {
        if (auth.isTokenExpired(auth.user.refresh_token)) {
            auth.returnUrl = to.fullPath;
            return '/login';
        } else {
            auth.refresh(auth.user.refresh_token);
        }
    }
});
