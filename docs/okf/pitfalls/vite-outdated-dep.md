---
type: Pitfall
title: Outdated optimize dep after a worktree switch
description: Vite's dependency cache belongs to one tree; after switching worktrees every module answers 504 until the server restarts with --force.
tags: [tooling]
generated: { by: claude-code/claude-fable-5-1, at: 2026-09-14T10:00:00Z }
sources:
  - id: source
    resource: ../../../next/package.json
    title: dev runs vite --force
---

# The rule

`npm run dev` already passes `--force`. A bare `npx vite` after switching worktrees needs `--force` too, or every module answers `504 Outdated Optimize Dep`.
