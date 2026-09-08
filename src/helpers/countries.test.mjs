import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { WITHOUT, withExtras, findCountry } from './countries.mjs';

const require = createRequire(import.meta.url);
const flagpack = dirname(require.resolve('flagpack/package.json'));
// flagpack draws a flag from a CSS class, so the stylesheet is what says a code renders
const css = readFileSync(join(flagpack, 'dist', 'flagpack.css'), 'utf8');
const drawn = new Set([...css.matchAll(/\.([a-z0-9-]+)\{background-image/g)].map((m) => m[1]));

const base = [{ name: 'Senegal', a2: 'SN' }, { name: 'Germany', a2: 'DE' }, { name: 'Antarctica', a2: 'AQ' }];

test('the extras join the list, the flagless codes leave it, sorted by name', () => {
  assert.deepEqual(withExtras(base).map((c) => c.name), [
    'England', 'Germany', 'Kosovo', 'Northern Ireland', 'Scotland', 'Senegal', 'Wales',
  ]);
});

test('every country the picker offers has a flag', () => {
  const countries = withExtras(require('country-code-info/data/countries.json'));
  assert.ok(countries.length > 200, `only ${countries.length} countries`);
  for (const { a2, name } of countries) {
    assert.ok(drawn.has(a2.toLowerCase()), `${name} (${a2}) has no flag`);
  }
});

test('a dropped code is dropped because it has no flag', () => {
  for (const code of WITHOUT) assert.equal(drawn.has(code.toLowerCase()), false, code);
});

test('a code finds its country in any case, or nothing', () => {
  const list = withExtras(base);
  assert.equal(findCountry(list, 'GB-SCT').name, 'Scotland');
  assert.equal(findCountry(list, 'gb-sct').name, 'Scotland');
  assert.equal(findCountry(list, 'XK').name, 'Kosovo');
  assert.equal(findCountry(list, 'de').name, 'Germany');
  assert.equal(findCountry(list, 'AQ'), null);
  assert.equal(findCountry(list, 'XX'), null);
  assert.equal(findCountry(list, undefined), null);
});
