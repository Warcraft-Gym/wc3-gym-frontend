import test from 'node:test';
import assert from 'node:assert/strict';
import { publicSignupBody } from './koth.mjs';

// The backend model declares client_token and the route wants a twitch name, so
// a body missing either never reaches the signup code (422, then 400).
test('the open signup body carries a token, both names and the event', () => {
  assert.deepEqual(
    publicSignupBody({ event_id: 7, twitch_username: 'grubby', battle_tag: 'Grubby#1234', race: 'orc' }),
    { client_token: '', event_id: 7, twitch_username: 'grubby', battle_tag: 'Grubby#1234', race: 'orc' },
  );
});

test('a missing race is null and a missing event is null, never undefined', () => {
  const body = publicSignupBody({ battle_tag: 'Grubby#1234' });
  assert.deepEqual(body, { client_token: '', event_id: null, twitch_username: '', battle_tag: 'Grubby#1234', race: null });
  assert.equal(JSON.parse(JSON.stringify(body)).client_token, '');
});
