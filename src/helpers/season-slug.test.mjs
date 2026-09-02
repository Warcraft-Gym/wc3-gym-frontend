import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findSeason, seasonSlug } from './season-slug.mjs';

const seasons = [{ id: 2, name: 'GNL S17' }, { id: 4, name: ' GNL S18 ' }, { id: 7, name: 'KOTH #3 (Test)' }];

test('the slug is the folded name', () => {
  assert.equal(seasonSlug(seasons[0]), 'gnl-s17');
  assert.equal(seasonSlug(seasons[1]), 'gnl-s18');
  assert.equal(seasonSlug(seasons[2]), 'koth-3-test');
});

test('a key finds the season by slug, then by id', () => {
  assert.equal(findSeason(seasons, 'gnl-s17').id, 2);
  assert.equal(findSeason(seasons, 4).id, 4);
  assert.equal(findSeason(seasons, '4').id, 4);
  assert.equal(findSeason(seasons, 'gnl-s19'), null);
  assert.equal(findSeason(seasons, undefined), null);
});
