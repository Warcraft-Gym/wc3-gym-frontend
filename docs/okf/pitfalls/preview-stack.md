---
type: Pitfall
title: A preview must never point at the production backend
description: A preview signs in on the dev Clerk instance; the production backend verifies with the production key, so every /me answers 401 and the login spins.
tags: [pitfall, vercel, clerk]
generated: { by: claude-code/claude-fable-5-1, at: 2026-09-14T10:00:00Z }
sources:
  - id: source
    resource: ../../../src/App.vue
    title: The session watch
---

# What happened

Every preview signed in on the dev instance while `VITE_BACKEND_URL` on the preview target pointed at production, so `/me` always 401ed and the login card spun forever with the error swallowed.

# The rule

Preview and development targets point at the staging backend, which verifies with the dev key. A failed `/me` now shows its message on the login page and signs out. A branch that needs an unmerged backend uses a branch-scoped `VITE_BACKEND_URL` override.
