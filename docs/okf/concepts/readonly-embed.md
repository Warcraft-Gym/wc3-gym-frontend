---
type: Domain Concept
title: Read-only embed
description: A page opened with readonly=1 drops the chrome, stays light, and reports its height to the parent frame so the public site can embed it.
resource: ../../../next/src/components/layout/AppShell.tsx
tags: [router]
status: deprecated
generated: { by: claude-code/claude-fable-5-1, at: 2026-10-06T10:33:26Z }
sources:
  - id: app
    resource: ../../../next/src/components/layout/AppShell.tsx
    title: isReadonly and sendHeight
---

The app has no embed mode. Since 2026-09-16 `?readonly=1` is ignored and every page draws the same shell for every reader, with two exceptions: the stream view (`?mode=clean` on `/events/:id` and `/koth/dashboard`) cuts the shell down, and only a visitor or a guest sees the join bar. The public website shows the season's standings; the app has no report page of its own.

While the mode existed, `?readonly=1` hid the app bar and the navigation, forced the light theme, and posted `{ type: 'gnl-iframe-height', height }` to the parent frame on every size change.
