import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isSafePath, saveReturnUrl, takeReturnUrl } from './return-url.mjs';

const SRC = fileURLToPath(new URL('../', import.meta.url));

function sourceFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? sourceFiles(join(dir, e.name)) : /\.(tsx?|mjs)$/.test(e.name) && !e.name.includes('.test.') ? [join(dir, e.name)] : [],
  );
}

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

// The saved path is read once, so a second reader after a sign-in finds it gone and sends the
// player home. The route guard alone leaves the login pages; "Continue as Super Admin" is the one
// other way off /admin-login, where the guard waits for the choice.
test('only the route guard and the admin choice take the saved path', () => {
  const takers = sourceFiles(SRC)
    .filter((file) => /takeReturnUrl\(/.test(readFileSync(file, 'utf8')))
    .map((file) => relative(SRC, file).replaceAll('\\', '/'))
    .sort();
  assert.deepEqual(takers, ['lib/guard.tsx', 'stores/auth.ts']);
  const auth = readFileSync(join(SRC, 'stores/auth.ts'), 'utf8');
  assert.deepEqual([...auth.matchAll(/^.*takeReturnUrl\(.*$/gm)].map(([line]) => line.trim()), ['const continueAsAdmin = () => navigate(takeReturnUrl("/"));']);
});
