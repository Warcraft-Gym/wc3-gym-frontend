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
