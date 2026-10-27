import { test } from 'node:test';
import assert from 'node:assert/strict';
import { canSignInAgain } from './session-recovery.mjs';

const discord = { user: { access_token: 't' }, me: { name: 'Player', role: 'member' }, viewAs: null };

test('a refused Discord session goes back to Discord', () => {
  assert.equal(canSignInAgain(discord), true);
});

test('the admin token, the dev login, a view-as switch and a session with no me sign out instead', () => {
  assert.equal(canSignInAgain({ ...discord, me: { ...discord.me, superadmin: true } }), false);
  assert.equal(canSignInAgain({ ...discord, user: { access_token: 't', dev: true } }), false);
  assert.equal(canSignInAgain({ ...discord, viewAs: { role: 'guest' } }), false);
  assert.equal(canSignInAgain({ ...discord, me: null }), false);
  assert.equal(canSignInAgain({ user: null, me: null, viewAs: null }), false);
});
