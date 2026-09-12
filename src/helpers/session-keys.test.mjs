import { test } from 'node:test';
import assert from 'node:assert/strict';
import { clearSession } from './session-keys.mjs';

const memoryStore = () => {
  const data = new Map();
  return {
    data,
    getItem: (k) => (data.has(k) ? data.get(k) : null),
    setItem: (k, v) => data.set(k, String(v)),
    removeItem: (k) => data.delete(k),
  };
};

test('clearing a session drops the view-as role with me and user', () => {
  const store = memoryStore();
  store.setItem('me', '{"role":"admin"}');
  store.setItem('user', '{"access_token":"t"}');
  store.setItem('viewAs', '{"role":"guest"}');
  store.setItem('clerk_key', 'pk_test_1');
  clearSession(store);
  assert.equal(store.getItem('viewAs'), null);
  assert.equal(store.getItem('me'), null);
  assert.equal(store.getItem('user'), null);
});

test('the Clerk key itself survives, so the next load compares against it', () => {
  const store = memoryStore();
  store.setItem('clerk_key', 'pk_test_1');
  clearSession(store);
  assert.equal(store.getItem('clerk_key'), 'pk_test_1');
});
