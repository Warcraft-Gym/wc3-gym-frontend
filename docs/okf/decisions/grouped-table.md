---
type: Decision
title: One grouped table component
description: Groups of rows with subtotals are drawn by GroupedTable, never by a table nested in a cell.
tags: [components]
generated: { by: claude-code/claude-fable-5-1, at: 2026-09-14T10:00:00Z }
sources:
  - id: source
    resource: ../../../src/components/GroupedTable.vue
    title: GroupedTable
---

# Decision

Made 2026-08-31. A table nested in a cell misaligns its header under the parent's columns, and a legend inside a column title clutters it. `GroupedTable` draws one tinted clickable header row per group and the detail rows on the same column grid, so detail numbers sit under the group total and visibly add up.

# Consequences

- When a view grows a grouped or breakdown table, put it on `GroupedTable`.
- Numeric columns right-aligned; column titles bare nouns; icons carry meaning, not legends in titles.
- Artwork attribution lives on the public credits page only, never in component comments.
