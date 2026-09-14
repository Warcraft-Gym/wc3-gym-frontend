---
type: Pitfall
title: A race icon needs a race for the row
description: The profile race was passed to the name component on a table with no race dimension; the icon then asserted a fact no row held.
tags: [components, design]
generated: { by: claude-code/claude-fable-5-1, at: 2026-09-14T10:00:00Z }
sources:
  - id: source
    resource: ../../../src/components/RaceIcon.vue
    title: RaceIcon
---

# The rule

Before passing `race` to `PlayerName` or `RaceIcon`, name the row's race source: this game, this scheduled series, this signup. No source, no icon. A labelled "Main race" column is fine because the label says it is the profile field. Season pages read the signup race alone and never fall back to the profile race.
