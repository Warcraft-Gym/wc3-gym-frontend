---
type: Pitfall
title: A preview must never point at the production backend
description: A preview signs in through the backend it points at, and that backend's Discord callback returns to its own frontend, so a preview on the production backend signs in on production, never on the preview.
tags: [session, deploy]
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-27T12:00:00Z }
sources:
  - id: source
    resource: ../../../next/src/app/(app)/login/LoginView.tsx
    title: The login and callback view
---

# What happened

A preview pointed at the production backend could not sign in: the session it held was not one that backend had signed, so `/me` always 401ed and the login card spun forever with the error swallowed.

# The rule

Preview and development targets point at the staging backend. The Discord login comes back to the `FRONTEND_URL` of the backend that ran it, so a preview signs members in only through a backend whose `FRONTEND_URL` names that preview. A failed `/me` shows its message on the login page and signs out. Git builds no preview of a branch; a preview started by hand for a branch that needs an unmerged backend uses a branch-scoped `NEXT_PUBLIC_BACKEND_URL` override, and that backend needs a preview made by hand as well.
