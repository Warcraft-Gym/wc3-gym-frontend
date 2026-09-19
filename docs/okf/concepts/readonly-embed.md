---
type: Domain Concept
title: Read-only embed
description: A page opened with readonly=1 drops the chrome, stays light, and reports its height to the parent frame so the public site can embed it.
resource: ../../../next/src/components/layout/AppShell.tsx
tags: [router]
generated: { by: claude-code/claude-fable-5-1, at: 2026-09-14T10:00:00Z }
sources:
  - id: app
    resource: ../../../next/src/components/layout/AppShell.tsx
    title: isReadonly and sendHeight
---

The public site at warcraft-gym.com embeds the season report in an iframe. `App.vue` reads `?readonly=1` (or `true`): the app bar and navigation are hidden, the theme is forced light because the site is light, and a `ResizeObserver` posts `{ type: 'gnl-iframe-height', height }` to the parent on every size change so the frame fits. The route is public, so no session is needed.

The site's own code lives in another repository and calls the backend directly for its tables; only the report page is embedded from here.
