---
type: Runbook
title: Run locally
description: Install, copy the example environment, start the dev server against a local or the staging backend.
resource: ../../../README.md
tags: [deploy, tooling]
generated: { by: claude-code/claude-opus-5-5, at: 2026-09-25T08:52:36Z }
stale_after: 2027-03-14T00:00:00Z
sources:
  - id: source
    resource: ../../../README.md
    title: Quick start
---

# Steps

1. `cd next`, `corepack enable`, `pnpm install`. Node LTS. Every later command runs from `next/`.
2. `cp .env.example .env`, then set `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` to the dev instance's publishable key. The file is not tracked; a publishable key is public by design. Do this once per clone and per worktree. Never a symlink.
3. Start a backend on port 5002, or skip to step 5.
4. `PROXY_TARGET=http://localhost:5002 pnpm dev`. The app is on `http://localhost:3000`; `/api/*` is proxied to the target with the prefix stripped, so the browser sees one origin and CORS never applies. With no `PROXY_TARGET` there is no `/api` route.
5. Against the staging backend instead: `PROXY_TARGET=https://<staging backend alias> pnpm dev`. The shell variable, not `.env`, sets the proxy target.
6. `pnpm test` for the helpers, the stores and this bundle; `pnpm lint` and `pnpm tsc --noEmit` before a push.

# Signing in locally

A member session needs the Clerk dev instance, whose publishable key goes in `.env`; Discord sign-in works on `localhost` without any dashboard change. The super admin session is `/admin-login` with the backend's admin token from its `.env`. With the key left empty the app runs without Clerk, and `/admin-login` is the only sign-in.

# Environment values

| Name | Local | Purpose |
|---|---|---|
| `NEXT_PUBLIC_BACKEND_URL` | `/api` | the base URL of every backend call; read once, throws when unset |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | the dev key | Clerk instance |
| `NEXT_PUBLIC_CLERK_PROXY_URL` | unset | set only on the Vercel production project |
| `CLERK_SECRET_KEY` | unset | read on the server by the Clerk proxy route, in proxy mode only |
| `PROXY_TARGET` | unset | the backend that `/api` reaches, from the shell |

Next inlines every `NEXT_PUBLIC_` value into the public bundle at build time; none is a secret. `CLERK_SECRET_KEY` has no such prefix and stays on the server. The environment beats the file.
