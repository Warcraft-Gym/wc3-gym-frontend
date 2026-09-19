---
type: Runbook
title: Build and preview
description: Build the static bundle, serve it, and see the real icons.
resource: ../../../next/package.json
tags: [tooling]
generated: { by: claude-code/claude-fable-5-1, at: 2026-09-19T10:05:19Z }
stale_after: 2027-03-14T00:00:00Z
sources:
  - id: source
    resource: ../../../next/package.json
    title: The scripts
---

# Steps

1. `pnpm build`, from `next/`, writes `.next/`. Gate anything on its exit code, never on a grep of its output. The build needs `NEXT_PUBLIC_BACKEND_URL`; the prerender throws without it.
2. `pnpm start` serves the build on port 3000. The `/api` proxy is fixed at build time, so set `PROXY_TARGET=<backend url>` on `pnpm build` as well as on `pnpm start`, or build with an absolute `NEXT_PUBLIC_BACKEND_URL`.
3. A worktree needs its own install first. See [the pitfall](../pitfalls/worktree-node-modules-and-icon-font.md).
4. To drive a page in a script, use playwright-core with the chromium it ships; sign in through `/admin-login` for admin pages, or with a Clerk ticket for a member session.
