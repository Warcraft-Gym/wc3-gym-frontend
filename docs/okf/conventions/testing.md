---
type: Convention
title: Testing
description: Pure helpers have node tests beside them; a user-visible change is verified by rendering the real page, with known traps in worktrees.
resource: ../../../next/package.json
tags: [testing, tooling]
generated: { by: claude-code/claude-fable-5-1, at: 2026-09-19T10:07:56Z }
sources:
  - id: package
    resource: ../../../next/package.json
    title: The test script
  - id: palette-test
    resource: ../../../next/src/helpers/palette.test.mjs
    title: The contrast checks
---

# Unit tests

`pnpm test`, from `next/`, runs `node --test` over `src/**/*.test.mjs` and `../docs/**/*.test.mjs`. There are about forty. A helper that holds a rule gets a test file beside it, in node's own runner, with no framework. `palette.test.mjs` checks that every declared ink passes 4.5:1 on its fill, that form labels pass on the three surfaces, and that dark `error` stays apart from `loss`.

# Rendering is the real test

A grep of the built bundle proves a string compiled in; it says nothing about whether anyone sees it. For a user-visible change, drive the real page, assert the element's box and computed style, take a screenshot and look at it. Ask "would someone landing here see this", not "is it in the DOM".

Ways to get a page up, cheapest first:

1. Read-only pages: `PROXY_TARGET=<staging backend url> pnpm dev`. The tracked `.env.example` value `/api` is proxied and the browser sees one origin.
2. Admin writes: run the backend locally with a test admin token against the shared staging database, start with `PROXY_TARGET=http://localhost:8000 pnpm dev`, sign in at `/admin-login`.
3. A branch with a backend migration: make the branch copy of the staging database from the backend worktree first; the backend project builds no branch previews.

# Traps in a worktree

- A worktree has no `node_modules` and no env file. Run `pnpm install --frozen-lockfile` and `cp .env.example .env` in its `next/` folder once. See [the pitfall](../pitfalls/worktree-node-modules-and-icon-font.md).
- The `/api` proxy target is fixed when the server starts, and for `pnpm build` when the build runs. Set `PROXY_TARGET` on both `pnpm build` and `pnpm start` to drive a production build locally.
- Run one build or test run at a time. Two builds at once can exhaust memory, and the symptom is a dev server that stops answering.

# What is not tested

Views and components have no unit tests. A change to a view is judged by rendering it and by the helpers it calls.
