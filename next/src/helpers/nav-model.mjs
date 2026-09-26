// The app's links, built from /me. A person wears up to three hats at once: a player (a roster
// row), a captain (a seat) and an admin. The nav draws the links of every hat the person wears:
// Home and their teams first, then the shared pages, then the admin area.

/** The shared pages, grouped as the bar's menus and the drawer's sections. */
export const BROWSE = [
  {
    title: 'Season',
    icon: 'mdi-trophy-outline',
    items: [
      { title: 'Standings', to: '/report' },
      { title: 'Upcoming Games', to: '/upcoming' },
      { title: 'Teams', to: '/teams' },
      { title: 'Players', to: '/players' },
      { title: 'Ladder Grind', to: '/ladder' },
    ],
  },
  {
    title: 'Fantasy',
    icon: 'mdi-cards-outline',
    items: [
      { title: 'Leaderboard', to: '/fantasy' },
      { title: 'My Fantasy Team', to: '/fantasy-registration' },
    ],
  },
  {
    title: 'Events',
    icon: 'mdi-calendar-star',
    items: [
      { title: 'Leagues', to: '/leagues' },
      { title: 'Events', to: '/events' },
      { title: 'KOTH Board', to: '/koth/dashboard' },
    ],
  },
];

/** Where a team entry points. The captain hub replaces this link in its own step. */
export const teamPath = (teamId, seasonId) => `/team/${teamId}/season/${seasonId}`;

/** One entry per team the person plays for or captains in a running season, newest season first.
 *  A seat and a roster row of the same team and season are one entry, marked as captained. */
export function myTeams(me) {
  const seasons = me?.seasons ?? [];
  const seasonOf = (id) => seasons.find((season) => Number(season.id) === Number(id));
  const entries = new Map();
  const add = (teamId, seasonId, captain) => {
    if (teamId == null || seasonId == null) return;
    const key = `${teamId}:${seasonId}`;
    const season = seasonOf(seasonId);
    const known = entries.get(key);
    // the roster row names the team; a seat alone names it only when it is the current season's
    const name = known?.teamName
      ?? (Number(season?.team?.id) === Number(teamId) ? season.team.name : null)
      ?? (Number(me?.team?.id) === Number(teamId) && Number(me?.season_id) === Number(seasonId) ? me.team.name : null);
    entries.set(key, {
      teamId: Number(teamId),
      seasonId: Number(seasonId),
      teamName: name,
      seasonName: season?.name ?? `Season ${seasonId}`,
      captain: Boolean(known?.captain || captain),
    });
  };
  for (const seat of me?.seats ?? []) add(seat.team_id, seat.season_id, true);
  for (const season of seasons) if (season.team) add(season.team.id, season.id, false);
  return [...entries.values()]
    .sort((a, b) => b.seasonId - a.seasonId)
    .map((entry) => ({
      ...entry,
      title: `${entry.teamName ?? 'My Team'} · ${entry.seasonName}`,
      to: teamPath(entry.teamId, entry.seasonId),
    }));
}

/** The whole nav for one session. `canSee(path)` answers whether the session reaches a route. */
export function buildNav(me, canSee) {
  const browse = BROWSE.map((group) => ({ ...group, items: group.items.filter((item) => canSee(item.to)) }))
    .filter((group) => group.items.length);
  return {
    home: canSee('/') ? { title: 'Home', to: '/' } : null,
    teams: me ? myTeams(me) : [],
    browse,
    admin: canSee('/admin') ? { title: 'Admin', to: '/admin' } : null,
  };
}

/** The phone's bottom tabs: Home, My Team, Season and More, each only when it has somewhere to go.
 *  More always stands last; it opens the drawer that holds every other link.
 *  @returns {{ key: string, title: string, icon: string, to: string | null }[]} */
export function phoneTabs(nav) {
  const season = nav.browse.find((group) => group.title === 'Season');
  return [
    nav.home ? { key: 'home', title: 'Home', icon: 'mdi-home-outline', to: nav.home.to } : null,
    nav.teams.length ? { key: 'team', title: 'My Team', icon: 'mdi-shield-account-outline', to: nav.teams.length === 1 ? nav.teams[0].to : null } : null,
    season ? { key: 'season', title: 'Season', icon: 'mdi-trophy-outline', to: season.items[0].to } : null,
    { key: 'more', title: 'More', icon: 'mdi-menu', to: null },
  ].filter(Boolean);
}

/** Whether a link is the page on screen: the exact path, or a page under it (never under Home). */
export const isActive = (to, path) => to === path || (to !== '/' && path.startsWith(`${to}/`));
