---
type: Pitfall
title: .env is not tracked, and /api exists only locally
description: One module reads NEXT_PUBLIC_BACKEND_URL and throws when it is unset. On Vercel the value is absolute, and /api exists only behind the dev proxy.
tags: [deploy, tooling]
generated: { by: claude-code/claude-fable-5-1, at: 2026-09-19T10:07:32Z }
sources:
  - id: source
    resource: ../../../next/src/helpers/backend-url.js
    title: The one read
---

# What goes wrong

A backend URL built from an unset variable becomes the string `undefined` inside every request, and every call answers 404 with no clue. `.env` is not tracked, so a new clone or worktree has none until `.env.example` is copied.

# The rule

- One module reads `NEXT_PUBLIC_BACKEND_URL` and throws when it is unset, at load and during `pnpm build`. Everything imports `backendUrl` from it.
- `cp .env.example .env` once per clone and per worktree. The environment beats the file.
- `/api` is a URL prefix that exists only while `PROXY_TARGET` is set, which is a local run. On a Vercel target `NEXT_PUBLIC_BACKEND_URL` is the backend's absolute URL; `/api` has no route there and never reaches the backend.
