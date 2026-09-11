import { test } from 'node:test';
import assert from 'node:assert/strict';
import { profileState } from './profile.mjs';

test('a guest sees the join-the-Discord card', () => {
  assert.equal(profileState({ role: 'guest', user: null }), 'guest');
  assert.equal(profileState({ role: 'guest', user: { id: 7 } }), 'guest');
});

test('a member with no users row sees the signup form', () => {
  assert.equal(profileState({ role: 'member', user: null }), 'signup');
  assert.equal(profileState({ role: 'member' }), 'signup');
});

test('a member with a users row sees the dashboard', () => {
  assert.equal(profileState({ role: 'member', user: { id: 7 } }), 'dashboard');
  assert.equal(profileState({ role: 'admin', user: { id: 7 } }), 'dashboard');
});

test('nothing shows before /me loads', () => {
  assert.equal(profileState(null), null);
  assert.equal(profileState(undefined), null);
});
