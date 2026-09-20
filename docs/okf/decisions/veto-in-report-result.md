---
type: Decision
title: The veto is entered inside Report Result
description: The Report Result dialog holds the veto board under a disclosure row, so a player never leaves the dialog to record the veto, and the veto warns but never blocks.
tags: [components, series]
generated: { by: claude-code/claude-fable-5-1, at: 2026-09-20T23:59:00Z }
sources:
  - id: source
    resource: ../../../next/src/components/ReportResultDialog.tsx
    title: The dialog
---

# Decision

Decided 2026-09-07. Fewer page jumps is a standing rule across the app, so the existing board component sits inside the dialog instead of a link out or a second popup, and it syncs with an opponent stepping live.

Since 2026-09-09 the veto is not a required input: the form warns strongly and never blocks; each game is marked with a winner; the replay upload sits beside its game.

The board sits under a disclosure row that states where the veto stands and opens it in place; a veto that is not complete warns in a heading of its own.

Since 2026-09-20 the dialog checks the replays against the veto: a replay played on a map the veto gives another game warns beside its game and names the game to move it to when the series played that game, and saving asks once, with "Report anyway" and "Go back", when a replay disagrees with the veto, or when the series plays a veto and records no step. The question is asked once and never refuses.

# Consequences

- Treat "fewer page jumps" as a standing preference on every screen.
- The warning is a heading, never a blocker. A dialog that carries a second subject folds it under one row.
- One veto UI exists. A second board or a launcher is not added.
- A check on the veto asks a question. It never disables the save button.
