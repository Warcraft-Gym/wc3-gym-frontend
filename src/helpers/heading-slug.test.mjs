import { test } from 'node:test';
import assert from 'node:assert/strict';
import { headingSlug } from './heading-slug.mjs';

test('the slug matches the anchors the guide links to', () => {
  assert.equal(headingSlug('Configuration (/config)'), 'configuration-config');
  assert.equal(headingSlug('Seasons & Rounds'), 'seasons--rounds');
  assert.equal(headingSlug('  Player Signups  '), 'player-signups');
});
