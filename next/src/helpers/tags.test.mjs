import test from 'node:test';
import assert from 'node:assert/strict';
import { addTagError, bnetNote, canConfirmMerge, isListFilter, listFilterQuery, otherTags, playedAsTag, tagSourceLine, tagSourceRest, tagsActiveFirst } from './tags.mjs';

// A season row shows "as TAG" only when it was played under a tag the person no longer shows
test('played as shows only when the tag differs from the current one', () => {
  assert.equal(playedAsTag('MangoIsNice#1230', 'BeLit#11855'), 'MangoIsNice#1230');
  assert.equal(playedAsTag('BeLit#11855', 'BeLit#11855'), null);
  assert.equal(playedAsTag('belit#11855', 'BeLit#11855'), null);
  assert.equal(playedAsTag(null, 'BeLit#11855'), null);
  assert.equal(playedAsTag('', 'BeLit#11855'), null);
});

test('the active tag leads, then the newest sighting', () => {
  const tags = [
    { id: 1, tag: 'Old#1', active: false, last_seen: '2020-01-01' },
    { id: 2, tag: 'New#2', active: false, last_seen: '2026-08-01' },
    { id: 3, tag: 'Main#3', active: true, last_seen: '2024-01-01' },
  ];
  assert.deepEqual(tagsActiveFirst(tags).map((row) => row.id), [3, 2, 1]);
  assert.deepEqual(otherTags({ battleTag: 'Main#3', tags }).map((row) => row.tag), ['New#2', 'Old#1']);
  assert.deepEqual(otherTags({ battleTag: 'Main#3' }), []);
});

test('the source line reads verified, source and dates in words', () => {
  assert.equal(
    tagSourceLine({ verified: false, source: 'sheet', first_seen: '2020-04-12T00:00:00Z', last_seen: null }),
    'Unverified. From the GNL sheets, first seen April 2020',
  );
  assert.equal(tagSourceLine({ verified: true, source: 'unknown' }), 'Verified.');
  assert.equal(tagSourceRest({ verified: false, source: 'signup', first_seen: '2020-04-12T00:00:00Z' }), 'From a signup, first seen April 2020');
  assert.equal(tagSourceRest({ verified: true, source: 'unknown' }), '');
});

// A refusal that names the tag goes under the field, as the signup form does
test('a 409 and a 404 on "I also played as" show under the field', () => {
  const refused = Object.assign(new Error('BeLit#11855 belongs to another player. Ask an admin to move it.'), { status: 409 });
  assert.deepEqual(addTagError(refused), { field: 'BeLit#11855 belongs to another player. Ask an admin to move it.', page: null });
  const missing = Object.assign(new Error('W3Champions has no player MangoIsNce#1230.'), { status: 404 });
  assert.equal(addTagError(missing).field, 'W3Champions has no player MangoIsNce#1230.');
  const broken = Object.assign(new Error('HTTP 500'), { status: 500 });
  assert.deepEqual(addTagError(broken), { field: null, page: 'HTTP 500' });
});

test('the merge confirm stays off while anything stops it', () => {
  assert.equal(canConfirmMerge(null), false);
  assert.equal(canConfirmMerge({ stops: ['Both hold a Season 12 signup'], removes: [], moves: [] }), false);
  assert.equal(canConfirmMerge({ stops: [], removes: ['3 duplicate ladder matches'], moves: [] }), true);
});

test('the server-side show-only entries send their list filter', () => {
  assert.equal(listFilterQuery('no_discord'), 'no_discord=true');
  assert.equal(listFilterQuery('claimed'), 'tag_source=claim');
  assert.equal(listFilterQuery('low_games'), null);
  assert.equal(isListFilter('claimed'), true);
  assert.equal(isListFilter('no_stats'), false);
});

test('a Battle.net error return names its reason, an unknown reason reads the general failure', () => {
  assert.equal(bnetNote('error', 'denied'), 'You cancelled on Battle.net.');
  assert.equal(bnetNote('error', 'taken'), 'That Battle.net account or tag belongs to another player. Ask an admin.');
  assert.equal(bnetNote('error', 'state'), 'Linking failed. Try again.');
  assert.equal(bnetNote('error', null), 'Linking failed. Try again.');
  assert.equal(bnetNote('eyJhbGciOi.token', null), null);
  assert.equal(bnetNote(null, null), null);
});
