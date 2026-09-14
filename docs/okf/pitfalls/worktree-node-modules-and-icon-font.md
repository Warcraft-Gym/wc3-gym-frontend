---
type: Pitfall
title: Worktrees inherit node_modules and lose the icon font
description: A worktree's node_modules is empty and works by resolving up; the dev server then refuses the icon font, so every icon is an empty box in a screenshot.
tags: [pitfall, worktree, vite]
generated: { by: claude-code/claude-fable-5-1, at: 2026-09-14T10:00:00Z }
sources:
  - id: source
    resource: ../../../vite.config.js
    title: The dev server
---

# What happened

Screenshots from a dev server inside a worktree showed every Material icon as an empty rectangle, and the boxes were reported as a rendering bug more than once. The font was refused with 403 because it resolved into the parent checkout, outside the project root the dev server allows.

# The rule

- Never `npm install` in a worktree. Node walks up; `npm test`, `npm run build` and `npx vite` all work.
- Read a package's source from the main checkout's `node_modules`.
- A boxed glyph from a worktree dev server is the harness. Confirm the glyph name in the icon font's CSS, or build and serve `dist` to see it.
