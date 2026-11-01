import assert from 'node:assert';
import test from 'node:test';

import { ALL_MODES, mapSearchUrl, missingPicturesNote, modeChoices, playedAs, unreachedNote } from './map-sources.mjs';

test('every source answering says nothing', () => {
  assert.strictEqual(unreachedNote([{ source: 'warcraft3.info', unreached: [] }, { unreached: [] }]), null);
  assert.strictEqual(unreachedNote([]), null);
  assert.strictEqual(unreachedNote(null), null);
});

test('a source that could not be read names the one the pictures come from', () => {
  const rows = [
    { source: 'Liquipedia', unreached: ['warcraft3.info'] },
    { source: 'Liquipedia', unreached: ['warcraft3.info'] },
    { source: null, unreached: ['warcraft3.info'] },
  ];

  assert.strictEqual(
    unreachedNote(rows),
    'warcraft3.info could not be reached, so the pictures come from Liquipedia. A map without a short name gets its initials.',
  );
});

test('no source answering says the new maps have no picture', () => {
  const rows = [{ source: null, unreached: ['warcraft3.info', 'Liquipedia'] }];

  assert.strictEqual(
    unreachedNote(rows),
    'warcraft3.info and Liquipedia could not be reached, so new maps have no picture. A map without a short name gets its initials.',
  );
});

test('an import where every map has a picture says nothing', () => {
  assert.strictEqual(missingPicturesNote([{ name: 'Echo Isles', image: 'https://store.test/echo.png' }]), null);
  assert.strictEqual(missingPicturesNote([]), null);
});

test('an import names the maps it left without a picture', () => {
  const one = [{ name: 'Echo Isles', image: 'https://store.test/echo.png' }, { name: 'Turtle Rock', image: null }];
  const two = [{ name: 'Amazonia' }, { name: 'Turtle Rock', image: null }];

  assert.strictEqual(missingPicturesNote(one), 'Imported, but Turtle Rock has no picture. Import again to try once more, or an admin can upload one on the Maps page.');
  assert.strictEqual(missingPicturesNote(two), 'Imported, but Amazonia, Turtle Rock have no picture. Import again to try once more, or an admin can upload one on the Maps page.');
});

const LISTED = [
  { name: 'Echo Isles', modes: '1v1' },
  { name: 'Twisted Meadows', modes: '1v1,2v2' },
  { name: 'Crown Lobby', modes: 'ffa' },
  { name: 'Odd Page', modes: null },
];

test('a filter keeps the rows played as its mode, and all of them with none chosen', () => {
  assert.deepStrictEqual(playedAs(LISTED, '2v2').map((row) => row.name), ['Twisted Meadows']);
  assert.deepStrictEqual(playedAs(LISTED, '1v1').map((row) => row.name), ['Echo Isles', 'Twisted Meadows']);
  assert.strictEqual(playedAs(LISTED, ALL_MODES).length, 4);
});

test('a filter offers the modes its rows hold, in the order of the app', () => {
  assert.deepStrictEqual(modeChoices(LISTED, ALL_MODES).map((mode) => mode.value), [ALL_MODES, '1v1', '2v2', 'ffa']);
});

test('a filter keeps offering the mode chosen when a search left none of it', () => {
  assert.deepStrictEqual(modeChoices([], '4v4').map((mode) => mode.title), ['All', '4v4']);
});

test('a map is looked up on the site by its name, whatever its name holds', () => {
  assert.strictEqual(mapSearchUrl('Echo Isles v2'), 'https://warcraft3.info/maps?q=Echo%20Isles%20v2');
  assert.strictEqual(mapSearchUrl('Rock & Roll?'), 'https://warcraft3.info/maps?q=Rock%20%26%20Roll%3F');
});
