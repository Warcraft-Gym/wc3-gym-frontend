---
type: Convention
title: Git and pull requests
description: One branch and one pull request per change, squash merged, pushes batched because every push builds a preview, and the merged combination built before a second merge.
tags: [git, process, vercel]
generated: { by: claude-code/claude-fable-5-1, at: 2026-09-14T10:00:00Z }
sources:
  - id: staging
    resource: ../../../.github/workflows/staging-branch.yml
    title: The only workflow
  - id: vercel
    resource: ../../../vercel.json
    title: Which branches deploy
---

# Branches

- Nothing is committed to `main` directly. Every change is a branch and a pull request with base `main`.
- Branch prefixes: `feature/`, `fix/`, `refactor/`, `chore/`. `chore/` is trivial upkeep only.
- Pull requests are squash merged. The title and body become the commit on `main`; write the body as a commit message, plain summary first.
- Reference an issue as `Issue #37` or `Part of #37`, never with a closing keyword: the issue stays open until the change is reviewed on production.
- Text an AI agent wrote in a pull request body starts with a note saying so; a co-written commit ends with a `Co-Authored-By` trailer. Never override the commit author.

# Pushes cost a build

Every push to a branch creates a Vercel preview deployment, and the Hobby plan caps deployment creations per day across the account. Batch local commits and push once when the pull request is ready for review. Not a hard rule, but the default.

# There is no CI on pull requests

This repository runs no lint, test or build on a pull request. The only workflow force-pushes `staging` to the merged commit. Vercel builds after the merge. So:

- run `npm run lint`, `npm test` and `npm run build` yourself before pushing;
- before the second merge of a batch, build the combination: refresh the branch from `main` (or make a local merge) and run `npm run build`, gated on the build's exit code, never on a grep of its output. Two green branches once broke `main` together when one removed a helper the other imported. See [the pitfall](../pitfalls/no-ci-build-the-merged-pair.md).
- when a unit of a batch renames or removes a shared helper, merge it first and cut the others from its tip.

# Backend and frontend together

A change that needs both repositories ships the backend first when the frontend reads a new field, and the frontend first when the backend stops answering an old one. A preview of an unmerged frontend branch can point at an unmerged backend branch through a branch-scoped `VITE_BACKEND_URL` on the Vercel project; delete it after the merge.
