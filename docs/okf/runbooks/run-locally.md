---
type: Runbook
title: Run locally
description: Install, copy the example environment, start the dev server against a local or the staging backend.
resource: ../../../README.md
tags: [deploy, tooling]
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-27T12:00:00Z }
stale_after: 2027-04-06T00:00:00Z
sources:
  - id: source
    resource: ../../../README.md
    title: Quick start
---

# Steps

1. `cd next`, `corepack enable`, `pnpm install`. Node LTS. Every later command runs from `next/`.
2. `cp .env.example .env`. The file is not tracked. Do this once per clone and per worktree. Never a symlink.
3. Start a backend on port 5002, or skip to step 5.
4. `PROXY_TARGET=http://localhost:5002 pnpm dev`. The app is on `http://localhost:3000`; `/api/*` is proxied to the target with the prefix stripped, so the browser sees one origin and CORS never applies. With no `PROXY_TARGET` there is no `/api` route.
5. Against the staging backend instead: `PROXY_TARGET=https://<staging backend alias> pnpm dev`. The shell variable, not `.env`, sets the proxy target. The staging backend is not rebuilt on a merge, so a route newer than its last build is missing there; run the backend locally for those.
6. `pnpm test` for the helpers, the stores and this bundle; `pnpm lint` and `pnpm tsc --noEmit` before a push.

# Signing in locally

A member session needs a backend with the Discord login set up: `DISCORD_CLIENT_SECRET` in its `.env`, its `FRONTEND_URL` naming this app, and its `/auth/discord/callback` listed as a redirect of the Discord application. The super admin session is `/admin-login` with the backend's admin token from its `.env`, and needs neither.

To test the app as a player, a captain or a guest without Discord, set `NEXT_PUBLIC_DEV_LOGIN=1` in `.env.local` and `DEV_LOGIN=1` in the local backend's `.env`, then restart both. Log in at `/admin-login` with the admin token, then choose "Sign in as a player" over "Continue as Super Admin": search a player, pick Player, Guest or Admin, and sign in. A player marked Captain signs in as a captain. Only players with a Discord id are listed. Set both values on a local machine only.

# Environment values

| Name | Local | Purpose |
|---|---|---|
| `NEXT_PUBLIC_BACKEND_URL` | `/api` | the base URL of every backend call; read once, throws when unset |
| `PROXY_TARGET` | unset | the backend that `/api` reaches, from the shell |
| `NEXT_PUBLIC_DEV_LOGIN` | `1` to test as a player | offers the local "Sign in as a player" card after the admin token login; never set on a deployment |

Next inlines every `NEXT_PUBLIC_` value into the public bundle at build time; none is a secret. The environment beats the file.
