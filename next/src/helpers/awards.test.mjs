import assert from 'node:assert/strict';
import { test } from 'node:test';

import { awardList, placeIcon, placeMedal, placeTitle, placings } from './awards.mjs';

const TABLE = [
  {
    division_id: 1,
    division_name: 'Gold',
    rows: [
      { position: 1, entrant_id: 11, name: 'Blackrock' },
      { position: 2, entrant_id: 12, name: 'Frostwolf' },
      { position: 3, entrant_id: 13, name: 'Warsong' },
      { position: 4, entrant_id: 14, name: 'Stormwind' },
    ],
  },
  { division_id: 2, division_name: 'Silver', rows: [{ position: 1, entrant_id: 21, name: 'Ironforge' }] },
];

test('a place carries the name the award row holds', () => {
  assert.deepEqual(
    [1, 2, 3, 4, 12].map(placeTitle),
    ['Champion', 'Runner-up', 'Third', 'Placed 4', 'Placed 12'],
  );
});

test('the first three places wear a medal and the rest wear none', () => {
  assert.deepEqual([1, 2, 3, 4].map(placeMedal), ['medal-gold', 'medal-silver', 'primary', null]);
  assert.equal(placeIcon(1), 'mdi-trophy');
  assert.equal(placeIcon(2), 'mdi-medal');
});

test('every entrant of the table reads its place, division by division', () => {
  const places = placings(TABLE);
  assert.deepEqual(places[11], { place: 1, title: 'Champion' });
  assert.deepEqual(places[14], { place: 4, title: 'Placed 4' });
  assert.deepEqual(places[21], { place: 1, title: 'Champion' }, 'a division awards its own champion');
  assert.equal(places[99], undefined);
});

test('an empty table awards nobody', () => {
  assert.deepEqual(placings([]), {});
  assert.deepEqual(awardList([{ division_id: 1, rows: [] }]), []);
});

test('the finish confirm names who takes each place', () => {
  const rows = awardList(TABLE);
  assert.equal(rows.length, 5);
  assert.deepEqual(rows[0], { key: '1:11', division: 'Gold', name: 'Blackrock', place: 1, title: 'Champion' });
  assert.deepEqual(rows.at(-1).name, 'Ironforge');
});
