---
type: Domain Concept
title: Read-only embed
description: A page opened with readonly=1 drops the chrome, stays light, and reports its height to the parent frame so the public site can embed it.
resource: ../../../next/src/components/layout/AppShell.tsx
tags: [router]
status: deprecated
generated: { by: claude-code/claude-fable-5-1, at: 2026-09-19T10:07:56Z }
sources:
  - id: app
    resource: ../../../next/src/components/layout/AppShell.tsx
    title: isReadonly and sendHeight
---

The app has no embed mode. Since 2026-09-16 every page draws the same shell for every reader and `?readonly=1` is ignored. The public `/report` page replaces the embedded report.

While the mode existed, `?readonly=1` hid the app bar and the navigation, forced the light theme, and posted `{ type: 'gnl-iframe-height', height }` to the parent frame on every size change.
