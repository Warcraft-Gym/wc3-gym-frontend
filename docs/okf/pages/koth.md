---
type: Page
title: KOTH
description: The KOTH nights list, the run page an admin drives one night from, and the public night page that draws a night's brackets for members and for the stream.
resource: ../../../next/src/app/(app)/koth/KothView.tsx
tags: [pages, koth]
generated: { by: claude-code/claude-opus-5-5, at: 2026-09-26T18:00:00Z }
sources:
  - id: nights
    resource: ../../../next/src/app/(app)/koth/KothView.tsx
    title: The nights list
  - id: run
    resource: ../../../next/src/app/(app)/koth/nights/[id]/KothNightView.tsx
    title: The run page of one night
  - id: night
    resource: ../../../next/src/components/koth/KothNightBoard.tsx
    title: The public board of one night, on its event page
  - id: tonight
    resource: ../../../next/src/app/(app)/koth/dashboard/KothDashboard.tsx
    title: The link to tonight's night page
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
| `/events/:id` | public | `EventView`, which draws `KothNightBoard` |
| `/koth/dashboard` | public | `KothDashboard`, which lands on tonight's `/events/:id` |

# What it does

A KOTH night is one event of the KOTH league. Its brackets are its divisions. An admin pairs every series by hand, live, between two players of one bracket, and a series is a best of one.

**The board read.** `GET /koth/board` answers tonight, the newest published night nobody closed, and `GET /koth/nights/{id}/board` answers one night. One read carries the whole night: the brackets, each bracket's king, the player who was king when the last night ended, the series it plays now, the ordered queue, the players who left and the series played tonight. A seat of the queue is one player with one place in line and one row per race he holds in that bracket. Every admin write answers the same board, so a page sets its state from that answer; the few routes that answer their own row read the board back once instead.

**Nights (`/koth`).** The nights, newest first, 25 a page, with their date and their state. Each page is one `GET /events?kind=koth&limit=25&offset=` read, and the `DataTable` pager reads its total from `X-Total-Count`. Each name opens the night's run page, which also holds the night's settings. "Tonight" opens tonight's night page. "Open tonight" takes the start time and the MMR each of the three brackets opens at, prefilled from the night before, and lands on the run page.

**Run page (`/koth/nights/:id`).** Admin only. The header carries "Open stream view" and "Copy stream link", as the night page does, on any night that is not archived. One card per bracket, weakest bracket first, each with the MMR band it takes. The throne reads the standing king, or the king from the last event while nobody has won tonight, or nobody. "Step down" leaves the throne empty for the next series or passes the crown to one player waiting. One filled button starts the next series: the king against the first player in line who is not playing in another bracket. While the throne stands empty it is the king from the last event, who waits at his own place in the line, against the first other player free to play, and the first two in line when the bracket has no such king. Clicking two rows of the line picks that pair instead, and the button says so; a pair that leaves the king out says the crown stays with him. A bracket that already plays a series shows no button and takes no pick, and a pick made there clears with the next board answer. A running series takes its winner on one of two buttons of equal weight, or is cancelled. A played row reads "winner beat loser" with no score, a crown where the throne moved or was held, one upload for a replay and one button that changes the winner. The line is reordered by dragging a row or by the two step buttons on it, and the whole ordered list of race rows is written at once. A player who left reads once under the line, whatever number of races he held, and goes back at its end on every one of them. "Add player" enters a late arrival by battle tag, and the tag is read for its shape before the write, so this door and the signup door print the one sentence. A strip over the brackets holds the signups W3Champions gave no rating for, each with three equal buttons that place him. Two cards stand over the bracket cards. The Night card sets the name, the date, the start time, the stream and page links and the two switches "Signups open" and "Published", and one "Save" writes only those fields through `PUT /events/{id}`; the page reads the event once on load for it. While the night runs, which is while a series plays or signups stand open on a night not closed, the card folds to one "Edit night" button. The Brackets card is the MMR strip the entrants page uses: one dot per rated race row on the board, one cut at the lower bound of every bracket but the weakest, and one "Save the bounds" that writes the weakest bracket at 0 and each other bracket at its cut, and takes the board it answers. The strip is off on a closed night only; a save while a series plays leaves its two players in their bracket until it ends, and the cut then takes them by the bounds as they stand. Besides the stream view, the page carries no link to the night page; an admin reads the guest view through View As. "Close the night" names every series nobody scored before it deletes them, and says the standing kings start the next event as King from last event.

**Night page (`/events/:id`).** Open to anyone. Every night has one public page, its event page. A night that is not archived draws the event header, then the same cards as the run page with no admin control. A read-only strip over the brackets, "Waiting for a bracket", lists the signups W3Champions rated no race for and says an admin places them; it shows only while that list holds a row, and never in the clean view. A logged-in reader signs up while the signups stand open, or withdraws; a reader on more than one race withdraws one race at a time, and the withdraw names the race in `?race=`. A signed-in reader reads his own place in line on his bracket. The withdraw buttons show until the night closes, whatever the signup switch says, and a king's confirm reads "Withdrawing forfeits your next match.", because a king who leaves loses a forfeit series to the first in line. A played row the loser forfeited reads "Forfeit". A guest reads the board only; an admin also reads "Run the night", a link to the run page, "Open stream view", a link that opens `?mode=clean` in a new tab, and "Copy stream link", which copies the absolute clean URL, reads "Copied", and shows the URL in a read-only field when the browser refuses the copy. `?mode=clean` is the stream view: it drops every control, cuts the app bar down to the app title, drops the page footer and the "Replay" chip of a played row, and grows the card face and its small labels one step, so the page can sit on a stream.

**Tonight (`/koth/dashboard`).** Reads `GET /koth/board` and lands on tonight's night page, keeping `?mode=clean`, so a stream's saved link follows each new night. While no night is open it reads "No KOTH night is open".

# Reads

Both board reads carry no token, so the edge caches them for fifteen seconds and every reader shares one answer; the one read right after the reader's own write adds a query the cache misses, so he sees his own row at once. The run page and the night page read the board once on load, and a reload shows new results, except the clean stream view (`?mode=clean`), which reads it again every thirty seconds while the tab is visible and the night is not closed. The run page also reads the event row once on load, for the Night card. The night page reads the event row once on load, for its header and the signup rules the signup dialog needs. After a signup the dialog reads the night's board once, through the same store action and the same edge cache, for the end state it prints. Four writes of the run page answer their own row instead of the board: a replay upload, the placement of an unplaced player, an added player and the Night card's save. Each of the four reads the board back once. "Change the winner" reads nothing: the played row names the side the winner played, so the click writes the other side. A played row that names no `winner_side` costs one `GET /series/{id}` on that click. No page makes another repeated read.

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
- `next/src/helpers/koth-board.mjs` holds the parts that are only data: the bracket band, the default pair, the text of the start button, a place in line as a word, the throne word of a played row, the players who left folded to one row each, the ordered ids one queue write sends, the rated race rows the strip draws, the strip's cuts read from the board and the bounds body written from them.
- A KOTH night is not run on the stage engine: the event run page address `/events/:id/admin` of a night sends the admin on to `/koth/nights/:id`.
- `next/src/helpers/koth-signup.mjs` reads that one board answer back to the bracket and the place of a new entrant, and takes the place word from `koth-board.mjs`, which holds the one copy. What the dialog prints from it is in [leagues and events](leagues-and-events.md).
- Only the close ends a night, so `nightState` in `next/src/helpers/koth.mjs` reads a night the admin has not closed as running, whatever the event read computes from its dates.

# Historical nights

The run page and the public event page draw an archived board through the shared historical results component. On the run page its Brackets card draws no strip and lists each bracket's literal name, because its bounds are the source's words. A historical board is closed and is read once. Its brackets retain source order and literal MMR or rank labels. Each BO1 is a played row in play order, in the form the live card uses: the winner beat the loser, with a win mark and no score. A winner inferred from the play order wears a grey crown whose tooltip says so; a recorded winner wears no mark. A series with no result reads as a pairing, with "Forfeit" where the order reads one, and a review reason is an info mark with the reason as its tooltip. Every mark carries its own hover, so there is no legend.

Historical names have no profile link or race icon while identity and race are unconfirmed. Event video links name the recording without promising full-event coverage. Each side is the written name alone, with no rating warning.
