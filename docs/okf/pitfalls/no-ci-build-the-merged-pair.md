---
type: Pitfall
title: "No CI on pull requests: build the merged pair"
description: Two green branches broke main together because one removed a helper the other imported, and Vercel builds only after the merge.
tags: [pitfall, ci, merge]
generated: { by: claude-code/claude-fable-5-1, at: 2026-09-14T10:00:00Z }
sources:
  - id: source
    resource: ../../../.github/workflows/staging-branch.yml
    title: The only workflow
---

# What happened

Twice in two days. One branch renamed an export and another still imported the old name; both were green in their own worktrees and `main` failed to build after the second merge, with a hotfix to follow. The next day a merge chain gated on `npx vite build | grep -E "built in|error"`, the grep matched the error line and exited 0, and `main` broke again on a duplicate declaration.

# The rule

Before the second merge of a batch, build the combination (refresh the branch from `main` or merge locally) and gate on the build's exit code: `npx vite build > log 2>&1; test $? -eq 0`. When one unit renames or removes a shared helper, merge it first and cut the others from its tip.
