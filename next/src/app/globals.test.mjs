import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const SRC = new URL('../', import.meta.url).pathname;

function tsxFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? tsxFiles(join(dir, e.name)) : e.name.endsWith('.tsx') ? [join(dir, e.name)] : [],
  );
}

// `.card` in globals.css sets its own background and sits outside every layer, so it beats a
// `bg-*` utility on the same element. The element then carries the ink of a ground it never draws.
test('a card draws its own background, so no card also asks for one', () => {
  for (const file of tsxFiles(SRC)) {
    for (const [, classes] of readFileSync(file, 'utf8').matchAll(/className="([^"]*\bcard\b[^"]*)"/g)) {
      const ground = classes.match(/\bbg-[a-z][\w-]*/);
      assert.ok(!ground, `"${ground}" on a card in ${file} never draws: .card wins`);
    }
  }
});
