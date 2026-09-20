import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkInCounts, checkInStatus, setByText } from './check-in.mjs';

const answer = (user_id, playday, available, set_by_user_id = user_id, set_by_name = 'Peterian') =>
  ({ user_id, playday, available, blocked_out: false, set_by_user_id, set_by_name });

test('the four states read the way the design guide names them', () => {
  assert.equal(checkInStatus(answer(1, 3, true)).title, 'Checked in');
  assert.equal(checkInStatus(answer(1, 3, false)).title, 'Out');
  assert.equal(checkInStatus({ ...answer(1, 3, false), blocked_out: true, set_by_user_id: null }).title, 'Out (blocked times)');
  assert.equal(checkInStatus(undefined).title, 'No answer');
});

test('only a blocked row is derived, so only it refuses an edit', () => {
  assert.equal(checkInStatus({ blocked_out: true, available: false }).derived, true);
  assert.equal(checkInStatus(answer(1, 3, false)).derived, false);
});

test('the note names the setter, and says you for the reader who set it', () => {
  assert.equal(setByText(answer(1, 3, true, 9, 'Peterian'), 9), 'set by you');
  assert.equal(setByText(answer(1, 3, true, 9, 'Peterian'), 4), 'set by Peterian');
  assert.equal(setByText(undefined, 4), '');
  assert.equal(setByText({ blocked_out: true, available: false, set_by_user_id: null }, 4), '');
});

test('the counts hold one round of the roster and leave out an empty state', () => {
  const players = [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }];
  const rows = [answer(1, 3, true), answer(2, 3, false), { ...answer(3, 3, false), blocked_out: true }, answer(4, 2, true)];
  assert.equal(checkInCounts(players, rows, 3), '1 checked in · 2 out · 1 no answer');
  assert.equal(checkInCounts([{ id: 1 }], rows, 3), '1 checked in');
});
