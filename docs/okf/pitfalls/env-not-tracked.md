---
type: Pitfall
title: .env is not tracked, and /api is not api/
description: A missing VITE_BACKEND_URL used to become the string undefined in every URL; now the app throws at load. On Vercel the value must be absolute.
tags: [deploy, tooling]
generated: { by: claude-code/claude-fable-5-1, at: 2026-09-14T10:00:00Z }
sources:
  - id: source
    resource: ../../../next/src/helpers/backend-url.js
    title: The one read
---

# What happened

Nineteen files built the backend URL from a template string with no check, so an unset value became `undefined` inside every request and every call 404ed with no clue. `.env` was then untracked and replaced by `.env.example`; pulling that commit deleted `.env` from every clone, and the app threw at load until `cp .env.example .env` was run again.

# The rule

- One module reads `VITE_BACKEND_URL` and throws when it is unset. Everything imports `backendUrl` from it.
- `cp .env.example .env` once per clone and per worktree. The environment beats the file.
- `/api` is a URL prefix the dev server proxies. `api/` is the Vercel functions folder, holding only the Clerk proxy. On a Vercel target `VITE_BACKEND_URL` is the backend's absolute URL; `/api` there falls through the SPA catch-all and returns HTML.
