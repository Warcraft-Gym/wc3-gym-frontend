---
type: Page
title: KOTH
description: The KOTH nights list an admin opens tonight from, and the public dashboard that draws tonight's brackets for the stream.
resource: ../../../src/views/KothView.vue
tags: [pages, koth]
generated: { by: claude-code/claude-fable-5-1, at: 2026-09-14T16:00:00Z }
sources:
  - id: nights
    resource: ../../../src/views/KothView.vue
    title: The nights list
  - id: dashboard
    resource: ../../../src/views/KothDashboard.vue
    title: The public dashboard
  - id: helper
    resource: ../../../src/helpers/koth.mjs
    title: Which night is tonight's
---

# Routes

| Path | Lowest role | View |
|---|---|---|
| `/koth` | admin | `KothView` |
| `/koth/dashboard` | public | `KothDashboard` |

# What it does

A KOTH night is one event of the KOTH league. Its brackets are its divisions, and its one stage is a chain: the king's box, then each challenger in turn.

**Nights (`/koth`).** Every night, newest first, with its date and its state; each name opens the night's run page. "Open tonight" takes the start time and the MMR each of the three brackets opens at, prefilled from the night before, and lands on the run page. The run, the challengers and the close are described in [event management](event-management.md).

**Dashboard (`/koth/dashboard`).** Open to anyone. It draws tonight's night: the newest published KOTH event that is not finished. A logged-in reader signs up while the signups stand open, or withdraws. Then one card per bracket: the standing king, everyone signed up for the bracket with race and MMR, and the bracket's chain. A night nobody has opened reads "No night open tonight". The page reads itself again every thirty seconds, so it can stay on a stream; `?mode=clean` drops the two buttons.

# Writes

| Store action | Route |
|---|---|
| `event.openNight` | `POST /koth/nights` |
| `event.signUp` | `POST /events/{id}/entrants` |
| `event.withdraw` | `DELETE /events/{id}/entrants/me` |

# Rules

- The chain is drawn by `StageView`: [shared components](../concepts/shared-components.md).
- `?readonly=1` drops the app chrome on this page as on every other: [read-only embed](../concepts/readonly-embed.md).
- A player reads as flag, name, race, MMR: [one player name standard](../decisions/player-name-standard.md).
