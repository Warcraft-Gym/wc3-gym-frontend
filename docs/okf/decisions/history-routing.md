---
type: Decision
title: History routing, no hash bridge
description: The router runs on plain paths, and old hash links get no redirect.
tags: [decision, router]
generated: { by: claude-code/claude-fable-5-1, at: 2026-09-14T10:00:00Z }
sources:
  - id: source
    resource: ../../../src/helpers/router.js
    title: createWebHistory
---

# Decision

Since 2026-09-04. Hash routing came with the starter template, not with a reason. No bridge for `/#/x` links was needed at the time of the switch.

# Consequences

- Deep links are plain paths; Vite and Vercel serve `index.html` for every path.
- Clerk needs no dashboard change for a same-origin path change.
- vue-router parses `?` before `#`; read `to.fullPath` if a hash ever matters.
