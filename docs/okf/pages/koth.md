---
type: Page
title: KOTH
description: The KOTH nights list, the run page an admin drives one night from, and the public board that draws tonight's brackets for the stream.
resource: ../../../next/src/app/(app)/koth/KothView.tsx
tags: [pages, koth]
generated: { by: claude-code/claude-fable-5-1, at: 2026-09-20T16:40:00Z }
sources:
  - id: nights
    resource: ../../../next/src/app/(app)/koth/KothView.tsx
    title: The nights list
  - id: run
    resource: ../../../next/src/app/(app)/koth/nights/[id]/KothNightView.tsx
    title: The run page of one night
  - id: dashboard
    resource: ../../../next/src/app/(app)/koth/dashboard/KothDashboard.tsx
    title: The public board
  - id: card
    resource: ../../../next/src/components/koth/BracketCard.tsx
    title: The bracket card both pages draw
  - id: helper
    resource: ../../../next/src/helpers/koth-board.mjs
    title: What the board read means
---

# Routes

| Path | Lowest role | View |
|---|---|---|
| `/koth` | admin | `KothView` |
| `/koth/nights/:id` | admin | `KothNightView` |
| `/koth/dashboard` | public | `KothDashboard` |

# What it does

A KOTH night is one event of the KOTH league. Its brackets are its divisions. An admin pairs every series by hand, live, between two players of one bracket, and a series is a best of one.

**The board read.** `GET /koth/board` answers the night that takes signups and `GET /koth/nights/{id}/board` answers one night. One read carries the whole night: the brackets, each bracket's king, the player who was king when the last night ended, the series it plays now, the ordered queue, the players who left and the series played tonight. A seat of the queue is one player with one place in line and one row per race he holds in that bracket. Every admin write answers the same board, so a page sets its state from that answer; the few routes that answer their own row read the board back once instead.

**Nights (`/koth`).** Every night, newest first, with its date and its state; each name opens the night's run page. "Settings" on the row opens the event page, which keeps every setting of the night. "Open tonight" takes the start time and the MMR each of the three brackets opens at, prefilled from the night before, and lands on the run page.

**Run page (`/koth/nights/:id`).** Admin only. One card per bracket, weakest bracket first, each with the MMR band it takes. The throne reads the standing king, or the king from the last event while nobody has won tonight, or nobody. "Step down" leaves the throne empty for the next series or passes the crown to one player waiting. One filled button starts the next series: the king against the first player in line who is not playing in another bracket, and the first two in line while the throne stands empty. Clicking two rows of the line picks that pair instead, and the button says so; a pair that leaves the king out says the crown stays with him. A running series takes its winner on one of two buttons of equal weight, or is cancelled. A played row reads "winner beat loser" with no score, a crown where the throne moved or was held, one upload for a replay and one button that changes the winner. The line is reordered by dragging a row or by the two step buttons on it, and the whole ordered list of race rows is written at once. A player who left reads once under the line, whatever number of races he held, and goes back at its end on every one of them. "Add player" enters a late arrival by battle tag. A strip over the brackets holds the signups W3Champions gave no rating for, each with three equal buttons that place him. "Close the night" names every series nobody scored before it deletes them, and says the standing kings start the next event as King from last event.

**Public board (`/koth/dashboard`).** Open to anyone. It draws the same cards with no controls. A logged-in reader signs up while the signups stand open, or withdraws; a reader on more than one race withdraws one race at a time, and the withdraw names the race in `?race=`. A signed-in reader reads his own place in line on his bracket. A night nobody has opened reads "No KOTH night is open". `?mode=clean` drops every control, cuts the app bar down to the app title and grows the card face, so the page can sit on a stream.

# Reads

Both board reads carry no token, so the edge caches them for fifteen seconds and every reader shares one answer; the one read right after the reader's own write adds a query the cache misses, so he sees his own row at once. Both pages read once on load and again every thirty seconds, and neither asks while the tab is hidden. The public board reads the event row once per night as well, for the signup rules the signup dialog needs, and `?mode=clean` skips that read because a stream draws no signup button. After a signup the dialog reads the night's board once, through the same store action and the same edge cache, for the end state it prints. Three writes of the run page answer their own row instead of the board: a replay upload, the placement of an unplaced player and an added player. Each of the three reads the board back once. "Change the winner" reads `GET /series/{id}` once per click, because the board names the winner but not the side of the series he played. Neither page makes another repeated read.

# Writes

| Store action | Route |
|---|---|
| `event.openNight` | `POST /koth/nights` |
| `event.startKothSeries` | `POST /koth/nights/{id}/series` |
| `event.cancelKothSeries` | `DELETE /koth/nights/{id}/series/{series_id}` |
| `event.setKothWinner` | `PUT /koth/nights/{id}/series/{series_id}/result` |
| `event.setKothQueue` | `PUT /koth/nights/{id}/brackets/{division_id}/queue` |
| `event.setKothCrown` | `PUT /koth/nights/{id}/brackets/{division_id}/crown` |
| `event.removeKothEntrant` | `DELETE /koth/nights/{id}/entrants/{entrant_id}` |
| `event.restoreKothEntrant` | `POST /koth/nights/{id}/entrants/{entrant_id}/restore` |
| `event.closeNight` | `POST /koth/nights/{id}/close` |
| `event.placeEntrant` | `PUT /events/{id}/entrants/{entrant_id}` |
| `event.addEntrant` | `POST /events/{id}/entrants/admin` |
| `event.signUp` | `POST /events/{id}/entrants` |
| `event.withdraw` | `DELETE /events/{id}/entrants/me` |

The replay upload of a played row takes the two routes every series replay takes, `POST /player-series/{id}/replays/1/upload-url` and `PUT /player-series/{id}/replays/1`, because a KOTH series is a best of one and its replay is always game one.

A refused write shows the sentence of its error envelope in the page's `StatusAlert`; a bad battle tag shows it as the field error of the add form.

# Rules

- A race row the board answers no rating for wears the one games mark, `noStatsWarning` in `next/src/helpers/games-rule.mjs`, and never a second wording.
- A player reads as flag, name, race, MMR: [one player name standard](../decisions/player-name-standard.md).
- `next/src/helpers/koth-board.mjs` holds the parts that are only data: the bracket band, the default pair, the text of the start button, a place in line as a word, the throne word of a played row, the players who left folded to one row each and the ordered ids one queue write sends.
- `next/src/helpers/koth-signup.mjs` reads that one board answer back to the bracket and the place of a new entrant, and takes the place word from `koth-board.mjs`, which holds the one copy. What the dialog prints from it is in [leagues and events](leagues-and-events.md).
- Only the close ends a night, so `nightState` in `next/src/helpers/koth.mjs` reads a night the admin has not closed as running, whatever the event read computes from its dates.
