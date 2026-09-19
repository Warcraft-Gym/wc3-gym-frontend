---
type: Decision
title: One player name standard
description: A player reads flag, name, race, MMR, in that order, on every page and on every Discord card, through one component.
tags: [components, design]
generated: { by: claude-code/claude-opus-5, at: 2026-09-19T19:40:00Z }
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
- One 6 px gap sits between every part, and the MMR reads at every width.
- A captain shows his race and his MMR only when he plays in the event.
- The plain line is the default on every surface. Since 2026-09-19 one variation puts the games icon before the flag, and it shows on the two surfaces that ask for it, the players page and the season team assign page.
- The line reads the MMR itself from the payload it is given and asks for nothing of its own. A surface that sorts by MMR in a column keeps the column and leaves the number out of the line.
