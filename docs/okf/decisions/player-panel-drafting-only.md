---
type: Decision
title: The player panel opens only on drafting pages
description: A player name links to the player page everywhere except on a page that holds unsaved draft work, where it opens a side panel and shows a dock icon.
tags: [decision, components]
generated: { by: claude-code/claude-fable-5-1, at: 2026-09-14T10:00:00Z }
sources:
  - id: source
    resource: ../../../src/components/PlayerName.vue
    title: The panel mode
---

# Decision

Made 2026-09-10. The panel exists so that reading a profile never costs a page its unsaved work; only the team draft and the series draft hold such work. Elsewhere a real link is what people expect. The mark for panel mode is the `mdi-dock-right` icon in the primary colour; a dotted underline and a pill were drawn on the real pages and rejected.

# Consequences

- A new page with unsaved work and player names calls `provide(panelLinks, true)`. Nothing else opens the panel.
- A name in a form dialog on another page is `plain`.
