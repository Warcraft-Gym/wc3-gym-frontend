import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { NATIONS, withNations, findCountry } from './countries.mjs';

const flagpack = dirname(createRequire(import.meta.url).resolve('flagpack/package.json'));
const base = [{ name: 'Senegal', a2: 'SN' }, { name: 'Germany', a2: 'DE' }, { name: 'Saudi Arabia', a2: 'SA' }];

test('the nations join the list, sorted by name', () => {
  assert.deepEqual(withNations(base).map((c) => c.name), [
    'England', 'Germany', 'Northern Ireland', 'Saudi Arabia', 'Scotland', 'Senegal', 'Wales',
  ]);
});

test('every nation has a flagpack flag', () => {
  for (const { a2 } of NATIONS) {
    assert.ok(existsSync(join(flagpack, 'flags', '4x3', `${a2.toLowerCase()}.svg`)), a2);
  }
});

test('a code finds its country in any case, or nothing', () => {
  const list = withNations(base);
  assert.equal(findCountry(list, 'GB-SCT').name, 'Scotland');
  assert.equal(findCountry(list, 'gb-sct').name, 'Scotland');
  assert.equal(findCountry(list, 'de').name, 'Germany');
  assert.equal(findCountry(list, 'XX'), null);
  assert.equal(findCountry(list, undefined), null);
});
