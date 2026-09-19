---
type: Pitfall
title: Outdated optimize dep after a worktree switch
description: Vite's dependency cache belongs to one tree; after switching worktrees every module answers 504 until the server restarts with --force.
tags: [tooling]
status: deprecated
generated: { by: claude-code/claude-fable-5-1, at: 2026-09-19T10:05:19Z }
sources:
  - id: source
    resource: ../../../next/package.json
    title: dev runs vite --force
---

This pitfall belonged to the Vite dev server. The app runs on Next.js, which has no such cache step; [a worktree needs its own install and env file](worktree-node-modules-and-icon-font.md) replaces it.

# The rule, while the app ran on Vite

`npm run dev` already passes `--force`. A bare `npx vite` after switching worktrees needs `--force` too, or every module answers `504 Outdated Optimize Dep`.
