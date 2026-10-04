import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SRC = fileURLToPath(new URL('../../', import.meta.url));

function tsxFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? tsxFiles(join(dir, e.name)) : e.name.endsWith('.tsx') ? [join(dir, e.name)] : [],
  );
}

// The opening tag up to its own `>`, skipping a `>` inside braces or quotes
function openingTag(text, from) {
  let depth = 0;
  let quote = null;
  for (let at = from; at < text.length; at++) {
    const char = text[at];
    if (quote) {
      if (char === quote) quote = null;
    } else if (char === '"' || char === "'" || char === '`') quote = char;
    else if (char === '{') depth++;
    else if (char === '}') depth--;
    else if (char === '>' && depth === 0) return text.slice(from, at + 1);
  }
  return text.slice(from);
}

// The base sets the width from 768 px up, and a caller's `sm:max-w-*` loses to it there: the dialog
// then opens 384 px wide whatever it asks for. A dialog names its width with `size`, and `compact` for a phone panel.
test('a dialog sets its width with size, never with a class', () => {
  for (const file of tsxFiles(SRC)) {
    const text = readFileSync(file, 'utf8');
    for (const { index } of text.matchAll(/<DialogContent\b/g)) {
      const tag = openingTag(text, index);
      const width = tag.match(/(?<![\w-])(?:[\w-]+:)*(?:max-w-|w-\[)[^\s"'`]*|dialogCompact/);
      assert.ok(!width, `"${width}" on a DialogContent in ${file}: set the width with size`);
    }
  }
});
