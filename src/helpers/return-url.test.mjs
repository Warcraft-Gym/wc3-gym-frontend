import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isSafePath, saveReturnUrl, takeReturnUrl } from './return-url.mjs';

const memoryStore = () => {
  const data = new Map();
  return {
    getItem: (k) => (data.has(k) ? data.get(k) : null),
    setItem: (k, v) => data.set(k, String(v)),
    removeItem: (k) => data.delete(k),
  };
};

test('an app path is safe', () => {
  for (const path of ['/', '/signup', '/player/12?season=gnl-s18#games', '/seasons/gnl-s18/assign']) {
    assert.equal(isSafePath(path), true, path);
  }
});

test('an off-site or malformed value is not safe', () => {
  for (const path of ['//evil.com', '///evil.com', 'https://evil.com', 'javascript:alert(1)', '/\\evil.com', '\\\\evil.com',
    '/\t/evil.com', '/\n/evil.com', 'evil.com', 'signup', '', null, undefined, 42]) {
    assert.equal(isSafePath(path), false, String(path));
  }
});

test('a saved path comes back once, then the fallback', () => {
  const store = memoryStore();
  saveReturnUrl('/signup', store);
  assert.equal(takeReturnUrl('/profile', store), '/signup');
  assert.equal(takeReturnUrl('/profile', store), '/profile');
});

test('an unsafe path is never saved', () => {
  const store = memoryStore();
  saveReturnUrl('//evil.com', store);
  assert.equal(store.getItem('returnUrl'), null);
  assert.equal(takeReturnUrl('/', store), '/');
});

test('an unsafe stored value gives the fallback and is cleared', () => {
  const store = memoryStore();
  store.setItem('returnUrl', 'https://evil.com');
  assert.equal(takeReturnUrl('/profile', store), '/profile');
  assert.equal(store.getItem('returnUrl'), null);
});
