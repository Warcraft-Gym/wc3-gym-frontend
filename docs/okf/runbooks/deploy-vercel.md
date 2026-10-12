---
type: Runbook
title: Deploy to Vercel
description: A merge to main builds staging, a GitHub Release builds production, and the environment is set per target on the project.
resource: ../../../next/vercel.json
tags: [deploy]
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-09T12:46:00Z }
stale_after: 2027-04-06T00:00:00Z
sources:
  - id: source
    resource: ../../../next/vercel.json
    title: Rewrites, and Vercel's git deployments turned off
  - id: deploy
    resource: ../../../.github/workflows/deploy.yml
    title: The deploy workflow
---

# A merge: staging

1. Merge to `main`. When the merge changed `next/` or the user guide, the `Deploy` workflow uploads the tree to Vercel, which builds it as a preview: that preview is staging, and the workflow points the staging address at it once it serves. A pull request branch gets no deployment, so the staging build is the first Vercel build of a change. Run `pnpm build` yourself before the merge. A failed build keeps the previous staging deployment live, the workflow fails, and production does not change.
2. Confirm by opening the page, not by looking for a deployment row: a rate-limited day produces none. In a burst of merges the workflow finishes the run in progress, builds the latest, and cancels the runs between.

# A release: production

1. Release the backend first: it stays compatible with the old frontend, and a new frontend may need the new backend.
2. `just release` publishes a GitHub Release of `main`, tagged `vYYYY.MM.DD.N`: the UTC date and that day's release count from 1, for example `v2026.10.09.1`. The notes list the pull requests since the last release.
3. The `Deploy` workflow uploads the tagged commit, Vercel builds it as production, and the workflow waits until it serves. Release only a commit on `main`, tagged `vYYYY.MM.DD.N`; a pre-release ships nothing. The workflow reads `VERCEL_RELEASE_TOKEN`, a repository secret: set it to a token scoped to this Vercel project only.
4. A failed build keeps the previous deployment live, and the workflow fails. Vercel deploys nothing by itself: `git.deploymentEnabled` is false in `next/vercel.json`, so no push builds, and only the workflow deploys. A rollback is Vercel's Instant Rollback to the previous production deployment.

# Targets and their environment

| Target | `NEXT_PUBLIC_BACKEND_URL` | Clerk |
|---|---|---|
| production | the production backend | production instance, proxy mode, with `NEXT_PUBLIC_CLERK_PROXY_URL` and `CLERK_SECRET_KEY` for the proxy route |
| preview and development | the staging backend address | dev instance |

Never point a preview at the production backend: its session is signed by the other instance and every `/me` answers 401. A preview made by hand for a branch that needs an unmerged backend gets a branch-scoped `NEXT_PUBLIC_BACKEND_URL` on the project, deleted after the merge; that backend needs a preview made by hand as well. Never set `NEXT_PUBLIC_BACKEND_URL=/api` on a Vercel target. Next inlines the value at build time, so a changed value needs a new build.

A variable cannot be renamed. To change a name, add the new name with the same value on the same targets, deploy, confirm the page, then delete the old name. Only a name with the `NEXT_PUBLIC_` prefix reaches the browser bundle. `CLERK_SECRET_KEY` has no prefix and is read only by the Clerk proxy route on the server. Store it as a Sensitive variable; a Sensitive value cannot be read back, so its source is the Clerk dashboard of the production instance. Never write a value of any variable into this bundle, a pull request or a commit.

# Previews are public

Preview access settings are managed on the Vercel project.

# Limits

The app is built to stay inside the limits of Vercel's Hobby plan: a cap on deployment creations per day and a daily build quota across both projects. Batch merges. A build that failed on the quota is not a code failure. Deployment retention is set in the dashboard, a day for everything but production.

# Rewrites

The Vercel project's root directory is `next/`, its framework preset is Next.js, and it includes files outside the root directory in the build, because `/user-guide` reads `ADMIN_UI_USER_GUIDE.md` from the repository root when the page is prerendered. `next/vercel.json` turns Vercel's git deployments off; the workflow builds staging only for a push that changed `next/` or that guide, and a release always builds. `next/next.config.ts` rewrites `/__clerk/*` to the Clerk proxy route; no catch-all rewrite exists, because every route is a real page.
