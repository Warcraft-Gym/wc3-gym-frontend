import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// fetch-wrapper.js reaches the store through the `@/` alias, which plain node does not resolve,
// so the one rule this file checks is read out of the source.
const source = readFileSync(new URL('./fetch-wrapper.js', import.meta.url), 'utf8');
const edgeCached = new RegExp(source.match(/^const EDGE_CACHED = \/(.+)\/;$/m)[1]);

test('the open reads the edge caches send no bearer', () => {
  for (const url of ['/api/events/12/ladder', '/api/home/series', '/api/koth/board', '/api/koth/nights/10/board']) {
    assert.equal(edgeCached.test(url), true, url);
  }
});

test('a read with a query of its own misses the pattern, so it carries the bearer and skips the cache', () => {
  // the dashboard after a signup and the run page after a write both read back with `?t=`
  assert.equal(edgeCached.test('/api/koth/board?t=1758380000000'), false);
  assert.equal(edgeCached.test('/api/koth/nights/10/board?t=1758380000000'), false);
  assert.equal(edgeCached.test('/api/koth/nights'), false);
  assert.equal(edgeCached.test('/api/events/12'), false);
});

test('the open league, map, config, player and team reads are edge cached', () => {
  for (const url of [
    '/api/leagues', '/api/maps', '/api/config/w3c', '/api/config/settings/fantasy_bet_points_value',
    '/api/events/12/ladder/players', '/api/users/3/ladder', '/api/users/3/ladder?season_id=2', '/api/users/3/history',
    '/api/events/12/teams', '/api/events/12/teams/basic', '/api/events/12/teams/7',
    '/api/leagues/1/teams', '/api/leagues/1/teams/basic', '/api/leagues/1/teams/7',
  ]) {
    assert.equal(edgeCached.test(url), true, url);
  }
});

test('caller-dependent reads and other queries keep the bearer', () => {
  for (const url of [
    '/api/leagues/5', '/api/events/5', '/api/events', '/api/config/settings', '/api/maps/ladder-import',
    '/api/users/3/ladder?t=123', '/api/users/3/ladder?season_id=2&t=123', '/api/events/12/teams?t=123',
    '/api/events/12/teams/7/availability', '/api/config/discord-roles',
  ]) {
    assert.equal(edgeCached.test(url), false, url);
  }
});

test('only a non-admin GET skips the bearer', () => {
  assert.match(source, /if \(method === 'GET' && EDGE_CACHED\.test\(url\) && !store\.isAdmin\) return \{\};/);
});
