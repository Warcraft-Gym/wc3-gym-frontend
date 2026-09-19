---
type: Runbook
title: Deploy to Vercel
description: A merge to main deploys production, staging mirrors main, every branch gets a public preview on the dev Clerk instance, and the environment is set per target on the project.
resource: ../../../next/vercel.json
tags: [deploy]
generated: { by: claude-code/claude-fable-5-1, at: 2026-09-19T10:05:19Z }
stale_after: 2027-03-14T00:00:00Z
sources:
  - id: source
    resource: ../../../next/vercel.json
    title: Rewrites and which branches deploy
---

# The normal path

1. Merge to `main`. Vercel builds production from the commit. There is no build on the pull request itself beyond the preview.
2. The workflow force-pushes `staging` to the same commit, so the staging alias serves the merged code.
3. Confirm by opening the page, not by looking for a deployment row: a rate-limited day produces none and production keeps the previous build. A burst of merges cancels the superseded builds and marks their commits failed; only the last one matters.

# Targets and their environment

| Target | `NEXT_PUBLIC_BACKEND_URL` | Clerk |
|---|---|---|
| production | the production backend | production instance, proxy mode, with `NEXT_PUBLIC_CLERK_PROXY_URL` and `CLERK_SECRET_KEY` for the proxy route |
| preview and development | the staging backend alias | dev instance |

Never point a preview at the production backend: its session is signed by the other instance and every `/me` answers 401. A branch that needs an unmerged backend gets a branch-scoped `NEXT_PUBLIC_BACKEND_URL` on the project, deleted after the merge. Never set `NEXT_PUBLIC_BACKEND_URL=/api` on a Vercel target. Next inlines the value at build time, so a changed value needs a new build.

# Previews are public

Preview access settings are managed on the Vercel project.

# Limits

The account is on the Hobby plan: a cap on deployment creations per day and a daily build quota across both projects. Batch pushes. A preview check that failed on the quota is not a code failure. Deployment retention is set in the dashboard, a day for everything but production.

# Rewrites

The Vercel project's root directory is `next/`, its framework preset is Next.js, and it includes files outside the root directory in the build, because `/user-guide` reads `ADMIN_UI_USER_GUIDE.md` from the repository root when the page is prerendered. `next/vercel.json` names the branches that deploy and skips a build when nothing under `next/` or that guide changed. `next/next.config.ts` rewrites `/__clerk/*` to the Clerk proxy route; no catch-all rewrite exists, because every route is a real page.
