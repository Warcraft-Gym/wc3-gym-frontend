import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildNav, isActive, myTeams, phoneTabs } from './nav-model.mjs';
import { ADMIN_PATHS, activeAdminPath, inAdminFrame } from './admin-nav.mjs';

// The route table is TypeScript, so the test reads its path and role pairs as text
const ROUTES = [...readFileSync(new URL('../lib/routes.ts', import.meta.url), 'utf8')
  .matchAll(/\{ path: "([^"]+)", meta: \{ role: "(\w+)"/g)].map(([, path, role]) => ({ path, role }));
const RANK = { public: 0, guest: 1, member: 2, captain: 3, admin: 4 };
const same = (pattern, path) => {
  const a = pattern.split('/');
  const b = path.split('/');
  return a.length === b.length && a.every((seg, i) => seg.startsWith(':') || seg === b[i]);
};
const roleOf = (path) => ROUTES.find((route) => same(route.path, path))?.role ?? 'public';
const canSeeAs = (role) => (path) => RANK[role || 'member'] >= RANK[roleOf(path)];

const S19 = { id: 19, name: 'Season 19', team: null };
const S18 = { id: 18, name: 'Season 18', team: null };
const orcs = { id: 3, name: 'Orcs' };
const elves = { id: 5, name: 'Elves' };

const player = { role: 'member', user: { id: 7 }, seats: [], seasons: [{ ...S19, team: orcs }] };
const captainAndPlayer = { role: 'captain', user: { id: 7 }, seats: [{ team_id: 3, season_id: 19 }], seasons: [{ ...S19, team: orcs, captain: true }] };
const twoSeats = {
  role: 'captain', user: { id: 7 },
  seats: [{ team_id: 3, season_id: 19 }, { team_id: 5, season_id: 18 }],
  seasons: [{ ...S19, team: orcs, captain: true }, { ...S18, captain: true }],
};
const adminOnly = { role: 'admin', actual_role: 'admin', user: null, superadmin: true, seats: [], seasons: [S19] };
const adminAndPlayer = { role: 'admin', actual_role: 'admin', user: { id: 7 }, seats: [], seasons: [{ ...S19, team: orcs }] };
const allThree = { role: 'admin', actual_role: 'admin', user: { id: 7 }, seats: [{ team_id: 5, season_id: 18 }], seasons: [{ ...S19, team: orcs }, { ...S18, captain: true }] };
const guest = { role: 'guest', user: null, seats: [], seasons: [S19] };

test('a player sees Home, their team and the shared pages, and no Admin', () => {
  const nav = buildNav(player, canSeeAs(player.role));
  assert.deepEqual(nav.home, { title: 'Home', to: '/' });
  assert.deepEqual(nav.teams.map((t) => t.title), ['Orcs · Season 19']);
  assert.equal(nav.teams[0].to, '/team/3/season/19');
  assert.equal(nav.teams[0].captain, false);
  assert.deepEqual(nav.browse.map((g) => g.title), ['Season', 'Fantasy', 'Events']);
  assert.equal(nav.admin, null);
});

test('a captain who also plays for the team gets one entry, marked captained', () => {
  const teams = myTeams(captainAndPlayer);
  assert.equal(teams.length, 1);
  assert.equal(teams[0].captain, true);
  assert.equal(teams[0].title, 'Orcs · Season 19');
});

test('a captain of two seasons gets both teams, newest season first', () => {
  const teams = myTeams(twoSeats);
  assert.deepEqual(teams.map((t) => [t.teamId, t.seasonId, t.captain]), [[3, 19, true], [5, 18, true]]);
  // the seat names no team, so the entry falls back to the plain label
  assert.equal(teams[1].title, 'My Team · Season 18');
});

test('the current season seat takes its team name from /me', () => {
  const teams = myTeams({ ...twoSeats, team: elves, season_id: 18 });
  assert.equal(teams[1].title, 'Elves · Season 18');
});

test('an admin with no player row sees Admin and no team', () => {
  const nav = buildNav(adminOnly, canSeeAs(adminOnly.role));
  assert.deepEqual(nav.admin, { title: 'Admin', to: '/admin' });
  assert.deepEqual(nav.teams, []);
});

test('an admin who plays sees their team and Admin', () => {
  const nav = buildNav(adminAndPlayer, canSeeAs(adminAndPlayer.role));
  assert.deepEqual(nav.teams.map((t) => t.title), ['Orcs · Season 19']);
  assert.ok(nav.admin);
});

test('an admin who plays and captains sees both teams and Admin', () => {
  const nav = buildNav(allThree, canSeeAs(allThree.role));
  assert.deepEqual(nav.teams.map((t) => [t.title, t.captain]), [['Orcs · Season 19', false], ['My Team · Season 18', true]]);
  assert.ok(nav.admin);
});

test('an admin viewing as a captain sees the viewed seats and no Admin', () => {
  const viewing = { ...allThree, role: 'captain', seats: [{ team_id: 3, season_id: 19 }] };
  const nav = buildNav(viewing, canSeeAs(viewing.role));
  assert.equal(nav.admin, null);
  assert.equal(nav.teams.find((t) => t.seasonId === 19).captain, true);
});

test('a guest sees only the public pages', () => {
  const nav = buildNav(guest, canSeeAs(guest.role));
  assert.equal(nav.home, null);
  assert.deepEqual(nav.teams, []);
  assert.equal(nav.admin, null);
  assert.deepEqual(nav.browse.map((g) => g.items.map((i) => i.to)), [['/report'], ['/leagues', '/events', '/koth/dashboard']]);
});

test('the phone tabs keep Home, My Team, Season and More, dropping what has nowhere to go', () => {
  assert.deepEqual(phoneTabs(buildNav(player, canSeeAs('member'))).map((t) => [t.key, t.to]),
    [['home', '/'], ['team', '/team/3/season/19'], ['season', '/report'], ['more', null]]);
  // two teams: the tab opens the picker instead of a page
  assert.equal(phoneTabs(buildNav(twoSeats, canSeeAs('captain'))).find((t) => t.key === 'team').to, null);
  assert.deepEqual(phoneTabs(buildNav(adminOnly, canSeeAs('admin'))).map((t) => t.key), ['home', 'season', 'more']);
  assert.deepEqual(phoneTabs(buildNav(guest, canSeeAs('guest'))).map((t) => t.key), ['season', 'more']);
});

test('a link is active on its own page and the pages under it, Home only on itself', () => {
  assert.ok(isActive('/report', '/report'));
  assert.ok(isActive('/report', '/report/18'));
  assert.ok(!isActive('/', '/report'));
  assert.ok(!isActive('/fantasy', '/fantasy-registration'));
});

test('every admin sidebar link names a route the table knows', () => {
  for (const to of ADMIN_PATHS) assert.ok(ROUTES.some((route) => same(route.path, to)), `${to} is not in routes.ts`);
  assert.equal(roleOf('/admin'), 'admin');
});

test('the admin frame holds the admin home, the listed pages and the admin-only pages', () => {
  assert.ok(inAdminFrame('/admin', false));
  assert.ok(inAdminFrame('/config/access', false));
  assert.ok(inAdminFrame('/koth/nights/4', true));
  assert.ok(!inAdminFrame('/report', false));
  assert.equal(activeAdminPath('/events/new'), '/events/new');
  assert.equal(activeAdminPath('/events/12/admin'), '/events');
  assert.equal(activeAdminPath('/seasons/18/maps'), '/seasons');
  assert.equal(activeAdminPath('/report'), null);
});
