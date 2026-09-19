---
type: Decision
title: History routing, no hash bridge
description: The router runs on plain paths, and old hash links get no redirect.
tags: [router]
generated: { by: claude-code/claude-fable-5-1, at: 2026-09-19T10:06:59Z }
sources:
  - id: source
    resource: ../../../next/src/lib/routes.ts
    title: createWebHistory
---

# Decision

Since 2026-09-04. Hash routing came with the starter template, not with a reason. No bridge for `/#/x` links was needed at the time of the switch.

# Consequences

- Deep links are plain paths, and each one is a real page of the Next.js app; an unknown path redirects to `/`.
- Clerk needs no dashboard change for a same-origin path change.
- A page reads its query with `useSearchParams()` inside a `Suspense` boundary; the server never sees a hash.
