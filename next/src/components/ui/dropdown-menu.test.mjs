import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const SRC = new URL('../../', import.meta.url).pathname;

function tsxFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? tsxFiles(join(dir, e.name)) : e.name.endsWith('.tsx') ? [join(dir, e.name)] : [],
  );
}

// Base UI throws "MenuGroupContext is missing" when Menu.GroupLabel has no Menu.Group around it.
// The menu only renders when a reader opens it, so neither the build nor a type check sees the throw.
test('every dropdown menu label sits inside a group', () => {
  for (const file of tsxFiles(SRC)) {
    let depth = 0;
    for (const [tag] of readFileSync(file, 'utf8').matchAll(/<\/?DropdownMenu(?:Radio)?(?:Group|Label)\b/g)) {
      if (tag.endsWith('Label')) assert.ok(depth > 0, `DropdownMenuLabel outside a group in ${file}`);
      else depth += tag.startsWith('</') ? -1 : 1;
    }
  }
});
