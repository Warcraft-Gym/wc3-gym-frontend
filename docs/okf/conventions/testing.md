---
type: Convention
title: Testing
description: Pure helpers have node tests beside them; a user-visible change is verified by rendering the real page, with known traps in worktrees.
resource: ../../../package.json
tags: [tests, node, playwright]
generated: { by: claude-code/claude-fable-5-1, at: 2026-09-14T10:00:00Z }
sources:
  - id: package
    resource: ../../../package.json
    title: The test script
  - id: palette-test
    resource: ../../../src/helpers/palette.test.mjs
    title: The contrast checks
---

# Unit tests

`npm test` runs `node --test` over `src/**/*.test.mjs` and `docs/**/*.test.mjs`. There are about forty. A helper that holds a rule gets a test file beside it, in node's own runner, with no framework. `palette.test.mjs` checks that every declared ink passes 4.5:1 on its fill, that form labels pass on the three surfaces, and that dark `error` stays apart from `loss`.

# Rendering is the real test

A grep of the built bundle proves a string compiled in; it says nothing about whether anyone sees it. For a user-visible change, drive the real page, assert the element's box and computed style, take a screenshot and look at it. Ask "would someone landing here see this", not "is it in the DOM".

Ways to get a page up, cheapest first:

1. Read-only pages: `VITE_PROXY_TARGET=<staging backend url> npx vite --port 5003`. The tracked `.env.example` value `/api` is proxied and the browser sees one origin.
2. Admin writes: run the backend locally with a test admin token against the shared staging database, build with `VITE_BACKEND_URL=http://localhost:8000`, sign in at `/admin-login`.
3. A branch with a backend migration: make the branch copy of the staging database from the backend worktree first; the backend project builds no branch previews.

# Traps in a worktree

- A worktree's `node_modules` is empty; node resolves up to the main checkout, so `npm test`, `npx vite` and `npm run build` work. Never `npm install` in a worktree.
- `npx vite` in dev mode inside a worktree refuses the Material Design Icons font (it lives outside the project root), so every icon renders as an empty box. That is the harness, not a bug. Build and serve `dist` with `npx vite preview` to see icons; note `vite preview` runs no `/api` proxy.
- After switching worktrees, restart `vite` with `--force`, or modules answer 504 Outdated Optimize Dep.

# What is not tested

Views have no unit tests. A change to a view is judged by rendering it and by the helpers it calls.
