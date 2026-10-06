---
type: Decision
title: One player name standard
description: A player reads flag, name, race, MMR, in that order, on every page and on every Discord card, through one component.
tags: [components, design]
generated: { by: claude-code/claude-fable-5-1, at: 2026-10-06T10:33:26Z }
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
- The plain line is the default on every surface. Since 2026-09-19 one variation puts the games icon before the flag. It shows on the four surfaces that ask for it: the players page and the season team assign page pass `games`, the current w3champions season the line works the rule out over, the round planner passes `warning`, the mark the draft board read already worked out, and the signup dialog passes `warning` for a KOTH entrant W3Champions gave no rating.
- Since 2026-09-30 a surface that weighs players passes `w3c`, which adds a link to the player's W3Champions profile beside the line, never inside it, because the line is itself a link or a button. The round planner and the published series of the fixture page pass it.
- The line reads the MMR itself from the payload it is given and asks for nothing of its own. A surface that sorts by MMR in a column keeps the column and leaves the number out of the line.
