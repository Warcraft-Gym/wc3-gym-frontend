---
type: Page
title: KOTH
description: The KOTH nights list, the run page an admin drives one night from, and the public night page that draws a night's brackets for members and for the stream.
resource: ../../../next/src/app/(app)/koth/KothView.tsx
tags: [pages, koth]
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-06T15:04:12Z }
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
  - id: results
    resource: ../../../next/src/components/koth/BracketResults.tsx
    title: The Results band both boards draw
  - id: archive
    resource: ../../../next/src/helpers/koth-archive.mjs
    title: An archived series as a Results row
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

**The board read.** `GET /koth/board` answers tonight, the newest published night nobody closed, and `GET /koth/nights/{id}/board` answers one night. One read carries the whole night: the brackets, each bracket's king and the race row that wears his crown, the player who was king when the last night ended, the series it plays now, the ordered queue, the players who left and the series played tonight. A seat of the queue is one player with one place in line and one row per race he holds in that bracket. Every admin write answers the same board, so a page sets its state from that answer; the few routes that answer their own row read the board back once instead.

**Nights (`/koth`).** The nights, newest first, 25 a page, with their date and their state. The list holds every night: published, unpublished and archived. An unpublished night reads "Draft" as its state, in the neutral chip the events pages give a draft. An archived night carries a second neutral chip, "Archived", beside its state on the same line, from the `archived` flag of each `GET /events` row. Each page is one `GET /events?kind=koth&limit=25&offset=` read, and the `DataTable` pager reads its total from `X-Total-Count`. Each name opens the night's run page, which also holds the night's settings. "Tonight" opens tonight's night page. "Open tonight" takes the start time and the MMR each of the three brackets opens at, prefilled from the night before, and lands on the run page.

**Run page (`/koth/nights/:id`).** Admin only. The header reads the night's status, "Not started" while no series exists and the start lies ahead, else "Running", or "Closed" once closed, with the count of signups, "Signups open" or "Signups closed" on a night not closed, and "Not published" on a night nobody published. It carries "Open stream view" and "Copy stream link", as the night page does, on any night that is not archived, one "Add player" on a night that is not closed, and "Edit details". One card per bracket, weakest bracket first, each with the MMR band it takes. The throne reads the standing king, or the king from the last event while nobody has won tonight, or nobody. "Step down" leaves the throne empty for the next series or passes the crown to one player waiting. One filled button starts the next series: the king against the first player in line who is not playing in another bracket. While the throne stands empty it is the king from the last event, who waits at his own place in the line, against the first other player free to play, and the first two in line when the bracket has no such king. Clicking two rows of the line picks that pair instead, and the button says so; a pair that leaves the king out says the crown stays with him. A bracket that already plays a series shows no button and takes no pick, and a pick made there clears with the next board answer. A running series takes its winner on one of two buttons of equal weight, or is cancelled. A played row reads "winner beat loser" with no score, a crown where the throne moved or was held, one upload for a replay and one button that changes the winner. The line is reordered by dragging a row or by the two step buttons on it, and the whole ordered list of race rows is written at once. A drag counts only on the card it started on. "Move to" opens the other brackets by name and moves one race row there, where it stands last: a one-race seat carries it under the name, a seat on several races on each race row, and the king the same way. A king's move asks first, because it leaves the throne empty, and a bracket with no series after it has no champion tonight and no king from last event next time; only the race that wears the crown asks, and another race of the king moves like any row. A refused move shows the backend's sentence. A seat on several races reads "Plays next as" over its race rows, one radio per race for the race the next series takes, and each race row has its own remove. The X of a seat removes the player from this bracket on every race he holds here. A race a player left while another of his stays reads in his seat as "<Race> · left tonight" with a "Put back" for that race. "Left tonight" under the line lists only the players who hold no place on the card, each with the races he left on, and puts him back at the end of the line on every one of them. After each "Put back" a muted bin icon deletes the signup of those rows: it asks first, "Delete <name>'s signup?", names the races, and takes the rows off the record of the night. A row that is a side of a series tonight, open or played, keeps its signup, so it carries no bin. "Add player" enters a late arrival by battle tag, and the tag is read for its shape before the write, so this door and the signup door print the one sentence. A strip over the brackets holds the signups W3Champions gave no rating for, each with three equal buttons that place him and an X that asks first and deletes the signup, because an unplaced signup cannot be put back. "Edit details" opens the Night Details dialog, which sets the name, the date, the start time, the stream and page links and the two switches "Signups open" and "Published"; its "Save" writes only those fields through `PUT /events/{id}` and closes it, a refused save keeps it open with the error, and "Cancel" discards the edits. The page reads the event once on load for it. The date and the start time show the start time on the admin's clock, so a save that leaves them alone keeps it. "Delete night" at the left of the dialog's footer opens the confirm that deletes the night. One card stands over the bracket cards: the Bracket Bounds card is the MMR strip the entrants page uses: one dot per rated race row on the board, one cut at the lower bound of every bracket but the weakest, and one "Save the bounds" that writes the weakest bracket at 0 and each other bracket at its cut, and takes the board it answers. The strip is off on a closed night only. A save moves each placed player by the rating he was placed with, players who left included; both players of a series on the table keep their bracket, also after it ends, and a player placed by hand never moves. A muted line by "Save the bounds" says so. Besides the stream view, the page carries no link to the night page; an admin reads the guest view through View As. "Close the night" names every series nobody scored before it deletes them, and says the standing kings start the next event as King from last event.

**Night page (`/events/:id`).** Open to anyone. Every night has one public page, its event page. A night that is not archived draws the event header, then the same cards as the run page with no admin control. A read-only strip over the brackets, "Waiting for a bracket", lists the signups W3Champions rated no race for and says an admin places them; it shows only while that list holds a row, and never in the clean view. While the signups stand open, a visitor with no login signs up by battle tag on a night open to anyone, and a logged-in reader signs up. A visitor gets no withdraw button and no place chip on the board, and the button stays after his signup; the end of his signup says "Sign in with Discord to see your place and withdraw." A logged-in reader withdraws; a reader on more than one race withdraws one race at a time, and the withdraw names the race in `?race=`. A signed-in reader reads his own place in line on his bracket, and "You are playing now" on his own side of a series on the table, on his line or under his name, never beside "vs" or the other player; a race he plays there counts as one he entered, so it keeps its withdraw button and the signup does not offer it again. "Refresh", beside the count of signups, reads the board again. The withdraw buttons show until the night closes, whatever the signup switch says, and a withdraw of a race he plays at the table, or of no named race while one of his is at the table, reads "Withdrawing forfeits the match you are playing.", because he loses that series by forfeit; otherwise a king's confirm reads "Withdrawing forfeits your next match." when the withdraw names no race, or takes his crowned race and leaves him no other race in that bracket, because a king who leaves loses a forfeit series to the first in line; a king with another race there passes the crown to it with no forfeit. A played row the loser forfeited reads "Forfeit". An admin also reads "Run the night", a link to the run page, "Open stream view", a link that opens `?mode=clean` in a new tab, and "Copy stream link", which copies the absolute clean URL, reads "Copied", and shows the URL in a read-only field when the browser refuses the copy. `?mode=clean` is the stream view: it drops every control, cuts the app bar down to the app title and the theme switch, drops the page footer and the "Replay" chip of a played row, and grows the card face and its small labels one step, so the page can sit on a stream. In the stream view three cards side by side fill the screen to its foot whatever is folded, and the queue and the players who left scroll inside the card; the throne, the series on the table and the results never scroll. `?theme=dark` or `?theme=light` sets the theme for that address alone, because a stream source cannot click the theme switch. On every page the "Queue", "Players who left" and "Results" headings of a card fold that part away and open it again. The choice is the reader's, kept in the browser by bracket name, so a stream set up once stays set up.

**Tonight (`/koth/dashboard`).** Reads `GET /koth/board` and lands on tonight's night page, keeping its query (`?mode=clean`, `?theme=`), so a stream's saved link follows each new night. While no night is open it reads "No KOTH night is open".

# Reads

For a non-admin both board reads carry no token, so the edge caches them for fifteen seconds and every reader shares one answer; the one read right after the reader's own write adds a query the cache misses, so he sees his own row at once. An admin's board read, the run page's included, carries the bearer, so the edge never caches it and it answers fresh. The run page reads the board once on load, and a reload shows new results. The night page reads it on load, on "Refresh", and when its tab becomes visible again, at most once every fifteen seconds and while the night is not closed; no timer runs, and these reads go through the edge cache. The clean stream view (`?mode=clean`) reads it again every thirty seconds while the tab is visible and the night is not closed. The run page also reads the event row once on load, for the Night Details dialog and the signups chip. The night page reads the event row once on load, for its header and the signup rules the signup dialog needs. After a signup the dialog reads the night's board once, fresh, for the end state it prints, and hands that board to the night page, so a signup costs one board read; a signup the night placed in no bracket reads nothing in the dialog, and the page reads the board fresh once. Four writes of the run page answer their own row instead of the board: a replay upload, the placement of an unplaced player, an added player and the Night Details save. Each of the four reads the board back once. A remove, a put back or a delete of several race rows sends one write per row and then reads the board once, even when a write fails, so the page never keeps a stale board. "Change the winner" reads nothing: the played row names the side the winner played, so the click writes the other side. A played row that names no `winner_side` costs one `GET /series/{id}` on that click. No page makes another repeated read.

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
| `event.eraseKothEntrant` | `POST /koth/nights/{id}/entrants/{entrant_id}/erase` |
| `event.moveKothEntrant` | `PUT /koth/nights/{id}/entrants/{entrant_id}/bracket` |
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
- `next/src/helpers/koth-board.mjs` holds the parts that are only data: the bracket band, the default pair, the text of the start button, a place in line as a word, the throne word of a played row, the players who left and hold no place on the card folded to one row each, the races a seated player left, whether a race row is a side of a series tonight, the ordered ids one queue write sends, the rated race rows the strip draws, the queue, players-who-left and results parts a reader folded away, the strip's cuts read from the board, the bounds body written from them, and `canSignUp`, which says whether the night page shows "Sign up".
- A KOTH night is not run on the stage engine: the event run page address `/events/:id/admin` of a night sends the admin on to `/koth/nights/:id`.
- `next/src/helpers/koth-signup.mjs` reads that one board answer back to the bracket and the place of a new entrant, and takes the place word from `koth-board.mjs`, which holds the one copy. What the dialog prints from it is in [leagues and events](leagues-and-events.md).
- Only the close ends a night, so `nightState` in `next/src/helpers/koth.mjs` reads a night the admin has not closed as running, whatever the event read computes from its dates.

# Historical nights

The run page and the public event page draw an archived board with `HistoricalBoard`. The run page draws no Brackets card and no strip for an archived night, because each card's head carries the source's label. A historical board is closed and is read once. Its brackets read weakest first, as a live night's do: by `lower_bound` ascending, a bracket with no bound (a label such as "1450 and Below" or a rank label) before any number, and among brackets with the same or no bound the one the source page lists later first (`archivedBrackets`). Each card's head is titled "Bracket 1", "Bracket 2" and on from the weakest, and carries the source's MMR or rank label, exactly as written, where a live card puts the MMR band. Each bracket card has the head, the throne and the Results band of a closed night run in the app, and no Queue and no "Players who left", because the source holds neither; a bracket with no series draws the throne alone. The throne names the reported king, "Held the throne at the end", or reads "No king recorded". The Results band is the one the live card draws (`BracketResults`): the same columns, numbering, newest-first order, fold, crown marks and key. The winner is the side the source page wrote, else the side the order of play infers, and the crown mark comes from the row's `throne`; a row with no `throne` wears no mark. A winner inferred from the play order wears its crown mark in muted ink with the tooltip "Inferred from the play order", and the key holds no entry for it. A series with no result keeps both sides in source order with a draw square and "vs", "Forfeit" where the source reads one, and no crown mark; a review reason is an info mark with the reason as its tooltip.

Historical names have no profile link or race icon while identity and race are unconfirmed. Event video links name the recording without promising full-event coverage. Each side is the written name alone, with no flag, rating warning or empty slot for one.
