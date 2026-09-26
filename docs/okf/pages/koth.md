---
type: Page
title: KOTH
description: The KOTH nights list, the run page an admin drives one night from, and the public board that draws tonight's brackets for the stream.
resource: ../../../next/src/app/(app)/koth/KothView.tsx
tags: [pages, koth]
generated: { by: claude-code/claude-fable-5-1, at: 2026-09-26T04:00:00Z }
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

**Run page (`/koth/nights/:id`).** Admin only. One card per bracket, weakest bracket first, each with the MMR band it takes. The throne reads the standing king, or the king from the last event while nobody has won tonight, or nobody. "Step down" leaves the throne empty for the next series or passes the crown to one player waiting. One filled button starts the next series: the king against the first player in line who is not playing in another bracket. While the throne stands empty it is the king from the last event, who waits at his own place in the line, against the first other player free to play, and the first two in line when the bracket has no such king. Clicking two rows of the line picks that pair instead, and the button says so; a pair that leaves the king out says the crown stays with him. A bracket that already plays a series shows no button and takes no pick, and a pick made there clears with the next board answer. A running series takes its winner on one of two buttons of equal weight, or is cancelled. A played row reads "winner beat loser" with no score, a crown where the throne moved or was held, one upload for a replay and one button that changes the winner. The line is reordered by dragging a row or by the two step buttons on it, and the whole ordered list of race rows is written at once. A player who left reads once under the line, whatever number of races he held, and goes back at its end on every one of them. "Add player" enters a late arrival by battle tag, and the tag is read for its shape before the write, so this door and the signup door print the one sentence. A strip over the brackets holds the signups W3Champions gave no rating for, each with three equal buttons that place him. "Bracket MMR" opens one field per bracket, strongest first, with the weakest fixed at 0; each bound reads back as a band in words as the admin types, one sentence names the one broken rule before the write, and the answer replaces the whole board. It is offered only while no bracket holds an open series and the night stands open, and the event page of the night links straight into it. "Close the night" names every series nobody scored before it deletes them, and says the standing kings start the next event as King from last event.

**Public board (`/koth/dashboard`).** Open to anyone. It draws the same cards with no controls. A read-only strip over the brackets, "Waiting for a bracket", lists the signups W3Champions rated no race for and says an admin places them; it shows only while that list holds a row, and never in the clean view. A logged-in reader signs up while the signups stand open, or withdraws; a reader on more than one race withdraws one race at a time, and the withdraw names the race in `?race=`. A signed-in reader reads his own place in line on his bracket. A night nobody has opened reads "No KOTH night is open". `?mode=clean` drops every control, cuts the app bar down to the app title, drops the page footer and the "Replay" chip of a played row, and grows the card face and its small labels one step, so the page can sit on a stream.

# Reads

Both board reads carry no token, so the edge caches them for fifteen seconds and every reader shares one answer; the one read right after the reader's own write adds a query the cache misses, so he sees his own row at once. Both pages read once on load and again every thirty seconds, and neither asks while the tab is hidden. The public board reads the event row once per night as well, for the signup rules the signup dialog needs, and `?mode=clean` skips that read because a stream draws no signup button. After a signup the dialog reads the night's board once, through the same store action and the same edge cache, for the end state it prints. Three writes of the run page answer their own row instead of the board: a replay upload, the placement of an unplaced player and an added player. Each of the three reads the board back once. "Change the winner" reads nothing: the played row names the side the winner played, so the click writes the other side. A played row that names no `winner_side` costs one `GET /series/{id}` on that click. Neither page makes another repeated read.

# Writes

| Store action | Route |
|---|---|
| `event.openNight` | `POST /koth/nights` |
| `event.startKothSeries` | `POST /koth/nights/{id}/series` |
| `event.cancelKothSeries` | `DELETE /koth/nights/{id}/series/{series_id}` |
| `event.setKothWinner` | `PUT /koth/nights/{id}/series/{series_id}/result` |
| `event.setKothBounds` | `PUT /koth/nights/{id}/bounds` |
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

- A player the board answers no rating for wears the one games mark, `noStatsWarning` in `next/src/helpers/games-rule.mjs`, beside the name on every line that names him, and never a second wording. The mark names the race where the line holds one and drops it where it holds none, such as a signup waiting for a bracket. A player with two races in one bracket wears the mark beside the race name on the race row of each race with no rating, which leaves that row's MMR slot empty, and on his name line only when no race of his holds one.
- A player reads as flag, name, race, MMR: [one player name standard](../decisions/player-name-standard.md). The line keeps the empty mark slot only inside a column of player lines, which is the queue, the pass-the-crown list and the two sides of an open series while either side wears the mark; a line that stands on its own drops it, so its flag lines up with the caption under it.
- `next/src/helpers/koth-board.mjs` holds the parts that are only data: the bracket band, the default pair, the text of the start button, a place in line as a word, the throne word of a played row, the players who left folded to one row each, the ordered ids one queue write sends and the checked body of the bounds write.
- `next/src/helpers/koth-signup.mjs` reads that one board answer back to the bracket and the place of a new entrant, and takes the place word from `koth-board.mjs`, which holds the one copy. What the dialog prints from it is in [leagues and events](leagues-and-events.md).
- Only the close ends a night, so `nightState` in `next/src/helpers/koth.mjs` reads a night the admin has not closed as running, whatever the event read computes from its dates.

# Historical nights

The run page draws an archived board through the shared historical results component. A historical board is closed and is read once without polling. Its brackets retain source order and literal MMR or rank labels. Each BO1 is a two-side box in play order: the winner wears the `win` bar, bold, and a crown, filled for a recorded result and outlined in muted ink for one inferred from the play order; the loser wears the `loss` bar; a series with no result wears `draw` on both sides, "Forfeit" where the order reads one, and an info mark whose tooltip names the review reason. One legend over the brackets names the three bars and the two crowns.

Historical names have no profile link or race icon while identity and race are unconfirmed. Event video links name the recording without promising full-event coverage. Each side is the written name alone, with no rating warning.
