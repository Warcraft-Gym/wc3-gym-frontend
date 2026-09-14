---
type: Runbook
title: Build and preview
description: Build the static bundle, serve it, and see the real icons.
tags: [runbook, build, vite]
generated: { by: claude-code/claude-fable-5-1, at: 2026-09-14T10:00:00Z }
sources:
  - id: source
    resource: ../../../package.json
    title: The scripts
---

# Steps

1. `npm run build` writes `dist/`. Gate anything on its exit code, never on a grep of its output.
2. `npm run preview` serves `dist/` on port 5050. It runs no `/api` proxy, so build with an absolute `VITE_BACKEND_URL=http://localhost:8000 npm run build` or forward the API yourself.
3. Icons render only from a build: the dev server inside a worktree refuses the icon font. See [the pitfall](../pitfalls/worktree-node-modules-and-icon-font.md).
4. To drive a page in a script, use playwright-core with the chromium it ships; sign in through `/admin-login` for admin pages, or with a Clerk ticket for a member session.
