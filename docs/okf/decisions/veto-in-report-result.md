---
type: Decision
title: The veto is entered inside Report Result
description: The Report Result dialog embeds the veto board in a compact mode, so a player never leaves the dialog to record the veto, and the veto warns but never blocks.
tags: [components, series]
generated: { by: claude-code/claude-fable-5-1, at: 2026-09-14T10:00:00Z }
sources:
  - id: source
    resource: ../../../next/src/components/ReportResultDialog.tsx
    title: The dialog
---

# Decision

Decided 2026-09-07. Fewer page jumps is a standing rule across the app, so the existing board component embeds inside the dialog instead of a link out or a second popup. The dialog says by default that it records a veto done elsewhere, and still syncs with an opponent stepping live.

Since 2026-09-09 the veto is not a required input: the form warns strongly and never blocks; each game is marked with a winner; the replay upload sits beside its game.

# Consequences

- Treat "fewer page jumps" as a standing preference on every screen.
- The wording of the warning is the open question, not whether it blocks.
- One veto UI exists. A second board or a launcher is not added.
