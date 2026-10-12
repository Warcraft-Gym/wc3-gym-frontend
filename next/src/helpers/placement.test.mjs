import test from 'node:test';
import assert from 'node:assert/strict';
import { placeLabels, placementColumns, placementGroups, placesTitle } from './placement.mjs';

const row = (id, round, from, to) => ({ id, round_id: round, place_from: from, place_to: to });

test('a range of places reads as one place or as its two ends', () => {
  assert.equal(placesTitle(5, 8), 'Places 5–8');
  assert.equal(placesTitle(3, 3), 'Place 3');
});

test('a round splits into its groups, the best places first', () => {
  const groups = placementGroups([row(3, 2, 5, 8), row(1, 2, 1, 4), row(4, 2, 5, 8), row(2, 2, 1, 4)]);
  assert.deepEqual(groups.map((group) => [group.title, group.series.map((one) => one.id)]), [
    ['Places 1–4', [1, 2]],
    ['Places 5–8', [3, 4]],
  ]);
});

test('the final joins the last round at its top', () => {
  const cols = placementColumns([
    { key: 1, name: 'Round 1', series: [row(1, 1, 1, 4), row(2, 1, 1, 4)] },
    { key: 2, name: 'Last round', series: [row(4, 2, 3, 4)] },
    { key: 3, name: 'Final', series: [row(3, 3, 1, 2)] },
  ]);
  assert.deepEqual(cols.map((column) => column.name), ['Round 1', 'Last round']);
  assert.deepEqual(cols[1].groups.map((group) => [group.title, !!group.final]), [
    ['Places 1–2', true],
    ['Places 3–4', false],
  ]);
});

test('a shared place reads as its range', () => {
  assert.deepEqual(placeLabels([{ position: 1 }, { position: 2 }, { position: 3 }, { position: 3 }, { position: 5 }]), ['1', '2', '3–4', '3–4', '5']);
});
