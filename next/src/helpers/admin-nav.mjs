// The admin area's sections, in the order an admin works: the GNL first, then the app's settings,
// then the other events. Each section is reworked in its own step; until then its links point at
// today's pages, and a new event type is one more item in Other Events.

export const ADMIN_SECTIONS = [
  {
    title: 'Gym Newbie League',
    icon: 'mdi-trophy-outline',
    items: [
      { title: 'Seasons', to: '/seasons', icon: 'mdi-calendar-range', description: 'Create a season, open signups, set the current season' },
      { title: 'Teams', to: '/teams', icon: 'mdi-shield-outline', description: 'Add and edit the league teams' },
      { title: 'Maps', to: '/maps', icon: 'mdi-map-outline', description: 'Keep the map pool up to date' },
      { title: 'Players', to: '/players', icon: 'mdi-account-group-outline', description: 'Find, edit and merge players' },
      { title: 'Fantasy Tiers', to: '/fantasy/tiers', icon: 'mdi-podium', description: 'Put players into fantasy tiers' },
      { title: 'Fantasy Bets', to: '/fantasy/bets', icon: 'mdi-cash-multiple', description: 'Check and correct fantasy bets' },
    ],
  },
  {
    title: 'App Settings',
    icon: 'mdi-cog-outline',
    items: [
      { title: 'Settings', to: '/config', icon: 'mdi-tune-variant', description: 'General settings of the app' },
      { title: 'Discord', to: '/config/discord-roles', icon: 'mdi-account-key-outline', description: 'Link Discord roles and sync them' },
      { title: 'Access', to: '/config/access', icon: 'mdi-shield-key-outline', description: 'Choose who is an admin' },
      { title: 'User Guide', to: '/user-guide', icon: 'mdi-book-open-variant', description: 'How to run the tool, step by step' },
    ],
  },
  {
    title: 'Other Events',
    icon: 'mdi-calendar-star',
    items: [
      { title: 'KOTH Events', to: '/koth', icon: 'mdi-crown-outline', description: 'Run a King of the Hill event' },
      { title: 'Leagues', to: '/leagues', icon: 'mdi-trophy-variant-outline', description: 'The leagues and the events each one runs' },
      { title: 'Events', to: '/events', icon: 'mdi-calendar-star', description: 'All events and tournaments' },
      { title: 'New Event', to: '/events/new', icon: 'mdi-calendar-plus', description: 'Create a tournament or event' },
    ],
  },
];

export const ADMIN_PATHS = ADMIN_SECTIONS.flatMap((section) => section.items.map((item) => item.to));

/** Whether a page is drawn inside the admin frame: the admin home, a page the sidebar lists, or a
 *  page only an admin reaches (`adminOnly`, from the route table). */
export const inAdminFrame = (path, adminOnly) => path === '/admin' || ADMIN_PATHS.includes(path) || adminOnly;

// Pages outside the sections that an admin opens from one of them: a match and a series, reached
// from a season, and a team, overall or in a season. They keep the sidebar and mark their section.
const ADMIN_CONTEXT = [
  { prefix: '/match/', section: '/seasons' },
  { prefix: '/series/', section: '/seasons' },
  { prefix: '/team/', section: '/teams' },
];

/** The sidebar item a page belongs to: the longest listed path that is the page or a parent of it,
 *  else the section a match or a series page is opened from, else none. */
export function activeAdminPath(path) {
  return ADMIN_PATHS.filter((to) => to === path || path.startsWith(`${to}/`))
    .sort((a, b) => b.length - a.length)[0]
    ?? ADMIN_CONTEXT.find((context) => path.startsWith(context.prefix))?.section
    ?? null;
}

/** How the admin frame draws a page. The sidebar shows for the admin hat on the pages the Admin tab
 *  leads to: the admin area, every page under a section (a season, its draft, an event), a match or a
 *  series opened from a season, and a team page. Home and a player page keep the plain layout, and a
 *  player, a captain or an admin viewing as one never has the hat. The phone's "← Admin" link stays
 *  on the pages of the admin area, where it leads back to their home. */
export const adminFrame = (path, { adminHat, adminOnly }) => {
  const area = !!inAdminFrame(path, adminOnly);
  return {
    sidebar: !!adminHat && (area || activeAdminPath(path) !== null),
    backLink: !!adminHat && path !== '/admin' && area,
  };
};
