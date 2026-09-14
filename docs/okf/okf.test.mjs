// The docs/okf bundle conforms to OKF v0.2 and is safe to publish: every concept
// has a type, index files carry no frontmatter (the root one only its version),
// every relative link and source path resolves, and no file holds an id, a
// credential or a hostname.
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import test from 'node:test';

const BUNDLE = dirname(new URL(import.meta.url).pathname);
const LINK = /\]\(([^)\s]+)\)/g;
const RESOURCE = /^\s*resource: (\S+)\s*$/gm;

function walk(dir) {
    return readdirSync(dir).flatMap((name) => {
        const path = join(dir, name);
        return statSync(path).isDirectory() ? walk(path) : path.endsWith('.md') ? [path] : [];
    });
}

function frontmatter(text) {
    if (!text.startsWith('---\n')) return null;
    const end = text.indexOf('\n---\n', 4);
    return end > 0 ? text.slice(4, end) : null;
}

for (const path of walk(BUNDLE)) {
    const name = relative(BUNDLE, path);
    const text = readFileSync(path, 'utf8');
    const base = path.split('/').pop();

    test(`${name} frontmatter`, () => {
        const fm = frontmatter(text);
        if (base === 'index.md') {
            const allowed = dirname(path) === BUNDLE ? 'okf_version: "0.2"' : null;
            assert.ok(fm === null || fm.trim() === allowed, 'index.md carries no frontmatter');
        } else if (base === 'log.md') {
            assert.equal(fm, null, 'log.md carries no frontmatter');
        } else {
            assert.ok(fm, 'a concept starts with a YAML block');
            assert.match(fm, /^type: \S/m, 'a concept names its type');
        }
    });

    test(`${name} links resolve`, () => {
        const targets = [...text.matchAll(LINK), ...text.matchAll(RESOURCE)].map((m) => m[1]);
        for (const target of targets) {
            if (/^(https?:|#|mailto:)/.test(target)) continue;
            if (!/^[./]/.test(target)) continue;  // a scope descriptor, not a path
            assert.ok(existsSync(join(dirname(path), target.split('#')[0])), `${target} does not resolve`);
        }
    });
}

// YAML reads a bare `a: b` value as a nested key, so a value that holds `: ` is quoted
const UNQUOTED_COLON = /^\s*(?:- )?[\w-]+: (?!["'[{|>]).*: /m;
const INDEX_ENTRY = /^\* \[[^\]]+\]\(([^)]+)\) - (.+)$/gm;
// The areas a concept may be tagged with; `type` already says what kind of file it is
const TAGS = new Set('pages components design router session stores events series fantasy koth teams players deploy testing tooling'.split(' '));

function description(path) {
    const found = /^description: (.+)$/m.exec(frontmatter(readFileSync(path, 'utf8')) ?? '');
    assert.ok(found, `${path} has no description`);
    const text = found[1].trim();
    return text.startsWith('"') ? text.slice(1, -1).replaceAll('\\"', '"') : text;
}

for (const path of walk(BUNDLE)) {
    const name = relative(BUNDLE, path);
    const base = path.split('/').pop();
    if (base === 'log.md') continue;

    if (base === 'index.md') {
        test(`${name} lists its directory`, () => {
            const listed = Object.fromEntries([...readFileSync(path, 'utf8').matchAll(INDEX_ENTRY)].map((m) => [m[1], m[2]]));
            for (const concept of readdirSync(dirname(path)).filter((f) => f.endsWith('.md') && f !== 'index.md' && f !== 'log.md')) {
                assert.ok(concept in listed, `${concept} is not in the index`);
                assert.equal(listed[concept], description(join(dirname(path), concept)), `the index line for ${concept} is not its description`);
            }
        });
        continue;
    }

    test(`${name} metadata`, () => {
        const fm = frontmatter(readFileSync(path, 'utf8')) ?? '';
        assert.match(fm, /^title: \S/m, 'a concept has a title');
        const tags = /^tags: \[(.*)\]$/m.exec(fm);
        assert.ok(tags, 'tags is a list');
        const unknown = tags[1].split(',').map((t) => t.trim()).filter((t) => !TAGS.has(t));
        assert.deepEqual(unknown, [], 'tags outside the vocabulary');
        description(path);
        const hit = UNQUOTED_COLON.exec(fm);
        assert.equal(hit, null, `quote the value: ${JSON.stringify(hit?.[0].trim())}`);
    });
}

// Content that must never appear in a public bundle: an id-shaped digit run, an
// email, a connection string, a token, a deployment hostname, an IP address.
const SENSITIVE = new RegExp(
    [
        '[0-9]{10,}',
        '[\\w.+-]+@[\\w-]+\\.[a-z]{2,}',
        '(postgres(ql)?|mysql|redis|mongodb)://',
        'eyJ[A-Za-z0-9_-]{10,}',
        '\\b(sk|pk|whsec|ghp|gho|github_pat)_[A-Za-z0-9]',
        'xox[bp]-',
        'Bearer [A-Za-z0-9._-]{20,}',
        '\\.(vercel\\.app|supabase\\.co|azurewebsites\\.net|ngrok\\.io)\\b',
        '\\b(\\d{1,3}\\.){3}\\d{1,3}\\b',
    ].join('|'),
    'i',
);

for (const path of walk(BUNDLE)) {
    const name = relative(BUNDLE, path);
    const text = readFileSync(path, 'utf8');
    test(`${name} holds nothing sensitive`, () => {
        const hit = SENSITIVE.exec(text);
        assert.equal(hit, null, `looks sensitive: ${JSON.stringify(hit?.[0])}`);
    });
}
