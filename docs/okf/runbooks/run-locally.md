---
type: Runbook
title: Run locally
description: Install, copy the example environment, start the dev server against a local or the staging backend.
resource: ../../../README.md
tags: [deploy, tooling]
generated: { by: claude-code/claude-fable-5-1, at: 2026-09-14T10:00:00Z }
stale_after: 2027-03-14T00:00:00Z
sources:
  - id: source
    resource: ../../../README.md
    title: Quick start
---

# Steps

1. `npm install`. Node LTS.
2. `cp .env.example .env`. The file is not tracked; the two values in it are public (the `/api` prefix and the dev Clerk key). Do this once per clone and per worktree. Never a symlink.
3. Start a backend on port 5002, or skip to step 5.
4. `npm run dev`. The app is on `http://localhost:5003`; `/api/*` is proxied to `http://localhost:5002` with the prefix stripped, so the browser sees one origin and CORS never applies.
5. Against the staging backend instead: `VITE_PROXY_TARGET=https://<staging backend alias> npm run dev`. The shell variable, not `.env`, sets the proxy target.
6. `npm test` for the helpers, `npm run lint` before a push.

# Signing in locally

A member session needs the Clerk dev instance, which the example key names; Discord sign-in works on `localhost:5003` without any dashboard change. The super admin session is `/admin-login` with the backend's admin token from its `.env`.

# Environment values

| Name | Local | Purpose |
|---|---|---|
| `VITE_BACKEND_URL` | `/api` | the base URL of every backend call; read once, throws when unset |
| `VITE_CLERK_PUBLISHABLE_KEY` | the dev key | Clerk instance |
| `VITE_CLERK_PROXY_URL` | unset | set only on the Vercel production project |
| `VITE_PROXY_TARGET` | unset | the dev server's proxy target, from the shell |

Vite inlines every `VITE_` value into the public bundle; none is a secret. The environment beats the file.
