---
type: Convention
title: Git and pull requests
description: One branch and one pull request per change, squash merged, merges batched because each one builds production, and the merged combination built before a second merge.
resource: ../../../.github/workflows/staging-branch.yml
tags: [deploy, tooling]
generated: { by: claude-code/claude-fable-5-1, at: 2026-10-06T13:00:52Z }
sources:
  - id: staging
    resource: ../../../.github/workflows/staging-branch.yml
    title: The only workflow
  - id: vercel
    resource: ../../../next/vercel.json
    title: Which branches deploy
---

# Branches

- Nothing is committed to `main` directly. Every change is a branch and a pull request with base `main`.
- Branch prefixes: `feature/`, `fix/`, `refactor/`, `chore/`. `chore/` is trivial upkeep only.
- Pull requests are squash merged. The title and body become the commit on `main`; write the body as a commit message, plain summary first.
- Reference an issue as `Issue #37` or `Part of #37`, never with a closing keyword: the issue stays open until the change is reviewed on production.
- Text an AI agent wrote in a pull request body starts with a note saying so; a co-written commit ends with a `Co-Authored-By` trailer. Never override the commit author.

# Which pushes build

Among pushes, only a merge to `main` creates a Vercel deployment: the project builds production and makes no preview from a push, so a branch and `staging` build nothing. Each merge creates one deployment against the plan's daily cap. Land a round of pull requests as one merge when they belong together. Not a hard rule, but the default.

# There is no CI on pull requests

This repository runs no lint, test or build on a pull request. Two workflows run on a push to `main`: one force-pushes `staging` to the merged commit, and one publishes the graph of this bundle when `docs/` changed. Vercel builds after the merge. So:

- run `pnpm lint`, `pnpm tsc --noEmit`, `pnpm test` and `pnpm build` from `next/` yourself before pushing;
- before the second merge of a batch, build the combination: refresh the branch from `main` (or make a local merge) and run `pnpm build`, gated on the build's exit code, never on a grep of its output. Two green branches once broke `main` together when one removed a helper the other imported. See [the pitfall](../pitfalls/no-ci-build-the-merged-pair.md).
- when a unit of a batch renames or removes a shared helper, merge it first and cut the others from its tip.

# Backend and frontend together

A change that needs both repositories ships the backend first when the frontend reads a new field, and the frontend first when the backend stops answering an old one. Git builds no preview of a branch. A preview someone starts by hand for an unmerged frontend branch can point at an unmerged backend branch through a branch-scoped `NEXT_PUBLIC_BACKEND_URL` on the Vercel project; delete it after the merge. The backend branch needs a preview made by hand as well.
