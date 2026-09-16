import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

// each Pinia store and the module that ports it
const PORTS = {
  'availability.store.js': 'availability.ts',
  'config.store.js': 'config.ts',
  'event.store.js': 'event.ts',
  'fantasy.store.js': 'fantasy.ts',
  'map.store.js': 'map.ts',
  'match.store.js': 'match.ts',
  'player.store.js': 'player.ts',
  'player_career_stats.store.js': 'player_career_stats.ts',
  'series.store.js': 'series.ts',
  'team.store.js': 'team.ts',
};

// every action is written `async name(`, on both sides, so one pattern reads both
const names = (text) => [...text.matchAll(/async (\w+)\(/g)].map((match) => match[1]);
const source = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');

// node loads no TypeScript, so the check reads the source of both sides
for (const [vue, ported] of Object.entries(PORTS)) {
  test(`${ported} answers every action of ${vue}`, () => {
    const actions = names(source(`../../../src/stores/${vue}`));
    const text = source(`./${ported}`);
    const have = new Set(names(text));
    assert.ok(actions.length > 0, `${vue} lists no action`);
    for (const action of actions) assert.ok(have.has(action), `${ported} is missing ${action}`);
    assert.match(text, /^export const use\w+Store = \(\) => store;$/m);
  });
}
