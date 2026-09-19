---
type: Decision
title: One player name standard
description: A player reads flag, name, race, MMR, in that order, on every page and on every Discord card, through one component.
tags: [components, design]
generated: { by: claude-code/claude-fable-5-1, at: 2026-09-14T10:00:00Z }
sources:
  - id: source
    resource: ../../../next/src/components/PlayerName.tsx
    title: PlayerName
---

# Decision

Made 2026-09-10 for the whole app: `{flag} {name} {race} {mmr}`, the name linking to the player page. It replaced an earlier order with the race icon before the flag. The Discord cards, owned by the backend, draw the same order.

# Why

Three design sets drew a name three ways and read as three apps. One fragment, retrofitted everywhere when it changes, keeps the product one thing.

# Consequences

- Never draw a name by hand in a view. Use `PlayerName`.
- A race shows only when the row has one. See [the pitfall](../pitfalls/race-icon-context.md).
