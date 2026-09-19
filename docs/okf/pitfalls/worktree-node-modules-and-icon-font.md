---
type: Pitfall
title: A worktree needs its own install and env file
description: A worktree has no node_modules and no env file of its own; install and copy the env file inside its next/ folder before the first run.
tags: [tooling]
generated: { by: claude-code/claude-fable-5-1, at: 2026-09-19T10:05:19Z }
sources:
  - id: source
    resource: ../../../next/next.config.ts
    title: The dev server
---

# What happens

The packages live in `next/node_modules`. A git worktree is a sibling tree, so node's walk up from its `next/` folder never reaches the main checkout's `next/node_modules`, and the first command fails on a missing package. The env file is untracked, so a new worktree has none, and the app throws at load on the missing backend URL.

# The rule

- In a new worktree: `cd next`, `pnpm install --frozen-lockfile`, `cp .env.example .env` and fill in the dev key. pnpm links from its store, so the install is cheap.
- Every package, the icon font included, then resolves inside the worktree, so a worktree dev server draws the same page as the main checkout.
- Never commit a lockfile change from a worktree install; `--frozen-lockfile` makes none.
