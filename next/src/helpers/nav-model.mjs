// The app's links, built from /me. A person wears up to three hats at once: a player (a roster
// row), a captain (a seat) and an admin. The nav holds only the places each hat works in: Home and
// My Stats for a player, My Team for a team's players and captains, Admin for an admin. Events is
// every member's: the cups and the other events to join, and an organizer runs theirs from there.
// Every shared page (standings, upcoming series, fantasy) is reached through the Home panels.
import { myProfilePath } from './players.mjs';

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
  const home = canSee('/') ? { title: 'Home', to: '/' } : null;
  return {
    home,
    // a player row has a dashboard; a guest's one page stays /profile, reached from the account menu
    stats: home && me?.user ? { title: 'My Stats', to: myProfilePath(me) } : null,
    teams: home && me ? myTeams(me) : [],
    events: home ? { title: 'Events', to: '/events' } : null,
    admin: canSee('/admin') ? { title: 'Admin', to: '/admin' } : null,
  };
}

/** The tabs, in the bar on a desktop and at the bottom of a phone: each only when the hat is worn.
 *  My Team has no page of its own when the person has several teams; it opens a picker.
 *  @returns {{ key: string, title: string, icon: string, to: string | null }[]} */
export function navTabs(nav) {
  return [
    nav.home ? { key: 'home', title: 'Home', icon: 'mdi-home-outline', to: nav.home.to } : null,
    nav.stats ? { key: 'stats', title: 'My Stats', icon: 'mdi-account-circle-outline', to: nav.stats.to } : null,
    nav.teams.length ? { key: 'team', title: 'My Team', icon: 'mdi-shield-account-outline', to: nav.teams.length === 1 ? nav.teams[0].to : null } : null,
    nav.events ? { key: 'events', title: 'Events', icon: 'mdi-trophy-outline', to: nav.events.to } : null,
    nav.admin ? { key: 'admin', title: 'Admin', icon: 'mdi-cog-outline', to: nav.admin.to } : null,
  ].filter(Boolean);
}

/** Whether a link is the page on screen: the exact path, or a page under it (never under Home). */
export const isActive = (to, path) => to === path || (to !== '/' && path.startsWith(`${to}/`));

// The community link is for a reader who is not a member yet: a visitor with no session, or a signed-in
// guest. A member never reads it, nor a session whose role is still loading, nor a stream.
export const showsJoinBanner = ({ hydrated, clean, user, me }) => !!hydrated && !clean && ((!user && !me) || me?.role === 'guest');
