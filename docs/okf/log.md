# Bundle history

## 2026-09-26

* **Update**: an event's achievements, stage series and stage standings reads carry no bearer for a non-admin, so the edge caches them; the entrants read keeps the bearer, so a member who signs up sees their own name at once.

## 2026-09-25

* **Update**: public career pages and their paging, search and sort reads carry no bearer for the edge cache; fresh reads and admin requests keep their bearer.

## 2026-09-24

* **Update**: a person holds many battle tags. The owner's player page carries a "My accounts" card that picks the active tag, removes an unverified one and adds "I also played as"; the header lists the other tags; a season row names the tag it was played as when that differs from today's. The admin players page gains a Tags column, the "No Discord" and "Claimed tags" filters, and the "Move tag" and "Merge into" dialogs. The players and stats, member and teams page concepts, the shared-component concept and the backend contract state the card, the lines, the dialogs and the routes.
* **Update**: the signup form prints a battle tag refusal under the tag field, and shows the details an admin needs when the backend asks for a link.

## 2026-09-23

* **Update**: the fetch wrapper sends no bearer on a non-admin GET of thirteen more open reads the backend caches at the edge; an admin and a write always send it.

## 2026-09-20

* **Update**: the run page of a KOTH night moves the MMR bound of each bracket in place while no bracket plays a series, the entrants page of a night takes no division and no seed write and points at that page, the public board lists the signups no bracket holds yet, and one mark reads on every player line the board names no rating for. The KOTH and event management page concepts, the store action table and `DESIGN.md` state the dialog, the two pages and the mark.
* **Update**: the signup dialog reads a battle tag against the shape every door takes before the request and prints one sentence under the field, and on a KOTH night it holds one end state that names the bracket and the place in line, or says an admin places an entrant W3Champions rated no race for. The leagues and events page concept states the check and the two end states.
* **Fix**: the public KOTH board read carries no token, so a signed-in reader shares the edge-cached answer and only the read after his own signup or withdraw skips the cache; a failed board read keeps the board on the screen and a 404 alone is the empty page; `?mode=clean` cuts the app bar down to the app title and grows the card face. The KOTH and event management page concepts and `DESIGN.md` state the two reads, the stream view and the run page the nights lead to.
* **Update**: a KOTH night runs from one admin page, `/koth/nights/:id`, on one board read that every write answers; the public board draws the same bracket cards with no controls. The KOTH page concept states the routes, the board read, the reads each page makes and the writes; `DESIGN.md` states the bracket card and the pick-two-rows start.
* **Fix**: the hub holds the with-series panel order while its reads are out, a panel whose read failed prints "Could not be loaded." in place of its rows, a cast still to come names its start time, the group labels read in sentence case, a row of "Next matches" joins its label with the middle dot "Open signups" uses, and the signup chip drops to the play-dates line on a phone. The member page concept and `DESIGN.md` state the loading order, the failure line, the cast time and the separator.
* **Update**: the home page is a hub of five panels, the member's own series, the next matches, the open signups, the latest season's leaderboard and the casted games, and it drops the event cards and the date tile. The member page concept states the panels and the six reads, the data pieces concept drops the date tile, and `DESIGN.md` states the layout, the panel order and the reads.
* **Fix**: one pass over the merged wave. The player line takes the games mark from a read as well as from the season, so the player-name decision and the shared-component concept name three surfaces and two props; the report dialog states the veto rule once; the schedule dialog legend names all five entries; the fixtures and series concept names the schedule grid, the suggestion and the replay-map helpers as sources.
* **Update**: the match page labels read in sentence case, the team check-in matrix head keeps the range sign and drops the needs-a-game count on a phone, the row menu takes its own width, the replay warning names the veto map, and a confirm stays a centred panel on a phone. The teams and fixtures and series page concepts and the shared-component concept state the head, the row, the menu width, the warning and the confirm.
* **Update**: a data display concept states how a form, a colour, a unit and a race are chosen for league data, and a data pieces concept lists every shared piece that shows data with when to use it; `DESIGN.md` gains the table of questions and pieces, the measured colour values, the validator step and the rules the code already followed.
* **Update**: a published series offers "Replace a player", which drafts a pairing that names the series it replaces and publishes with one "Publish and replace" confirm; a round with an open place offers "Add a series"; the board draws a published pairing with a quieter line. The fixtures and series page concept states the flow, the count rule and the read the confirm makes.
* **Update**: the series page states the booked time, the next map and the head to head on three lines, and the report dialog moves a replay between games, warns when a replay's map is not the one its game plays, and asks once before a report that disagrees with the veto. The fixtures and series page concept, the shared-component concept and the veto decision state the three lines, the shared head-to-head cell and the confirm.
* **Update**: the schedule dialog draws each side's own blocked hours apart by position, the round cards of the player page group under the stage they sit in, and the team check-in matrix fits three round columns on a phone. The fixtures and series, players and stats, and teams page concepts state the lanes, the legend, the stage heading and the narrow matrix.
* **Update**: the team roster carries a points column summed from the series the page already holds, and a round a player sits out draws as a crossed square in the round strip. The shared-component and teams page concepts state the column, its scope note and the sit-out mark.
* **Update**: the team check-in page shows one round as a roster list or every round as a matrix, both from one read, and the captain edits from a row menu. The teams page concept states the two views, the four states, the derived block and the write that sits out every round that has not ended.
* **Update**: the season dialog turns check-in off for an existing event and hides the check-in days and the early check-in switch while it is off. The GNL season page concept states the field and the new-season default.
* **Update**: the player page answers a round in its Events section, carries the state chip and the round end line, and sits out every remaining round with an Undo; the availability page lists the rounds the blocked times cover. The players and stats page concept states the chip, the early window, the bulk sit-out and the write it makes.
* **Update**: the schedule dialog draws the round window as a calendar or as day tracks from the pair's free hours, names a pick inside a blocked hour and books it, and reads the round end from the same helper as the round cards. The fixtures and series page concept states the views, the free-time read and the bottom clock rows.
* **Update**: the Draft tab of a fixture leads with the round draft board, which draws both rosters on one MMR scale, offers an opponent panel with the difference, the shared hours and the records, suggests the open pairings in the browser and carries the ready mark and the working largest difference. The fixtures and series page concept states the board, its reads and its groups; the stores concept states the options a read passes to skip the browser cache.

## 2026-09-19

* **Update**: every series read that names the MMR of the race the row plays passes it into the player line, and an admin on neither side moves a replay. The shared-component concept states the six reads and the surfaces that pass the number in; the fixtures and series and players page concepts state the opponent line and who moves a replay.
* **Update**: the event settings carry early check-in, the round end zone, the W3C seasons the recent games count over, and the largest MMR difference of a captain draft stage. The event management and GNL season page concepts state the fields, their bounds and the stage write the season dialog makes.
* **Update**: the series page moves an uploaded replay to another game the series played; the fixtures and series page states the control and its write, the backend contract and the stores concept name the route in the match store.
* **Update**: a stage series row names the MMR of the race it plays, and the payloads that name a team name its logo. The shared-component concept states how `SeriesBox` fills the player line, which payloads carry `team_icon_url`, and which team lines are plain.
* **Update**: one component draws a team name and one draws a round strip, and the team roster is one aligned list. The shared-component concept states the three, and the teams and players page concepts state the roster, the season team roster and the round cards.
* **Update**: a round is answered with "Check in" and "Sit out". The home, event, player and round-grid page concepts state the words.
* **Update**: the Report Result dialog folds the veto under a disclosure row and warns in a heading; the fixtures and series page and the veto decision state the row, the wording and the one dialog width.
* **Update**: the series page names the map of a fixed game before it is played, and the edit-series race opens on the race the side signed the season up on.
* **Update**: the player line draws the MMR and the games mark itself. The shared-component concept and the player name decision state how the line reads the MMR, when a surface leaves it out, and which payloads carry no `w3c_stats`.
* **Update**: the routing concept states the app title, "WC3 Gym Dashboard", its link to `/` and the browser tab title.
* **Update**: the design rules of the next phase. `DESIGN.md` states the player line and its games-icon version, the team name, the series action bar, the check-in words, the app bar title, the loading rule, the card padding, the W3C data line, the figure formats and the legend rule; the shared-component concept and the player name decision state the same rules.
* **Creation**: the pitfall of a proxy route that keeps the encoding headers of a fetched answer; the session concept states what the Clerk proxy route returns.
* **Update**: the app is the Next.js app in `next/`. Every source names its file there; the overview, code style, testing, the run, build and deploy runbooks, the routing, session, stores, theme and shared-component concepts and the Clerk proxy decision state the Next.js stack, pnpm and the `NEXT_PUBLIC_` variable names.
* **Deprecation**: the read-only embed concept and the Vite dependency-cache pitfall.
* **Update**: the deploy runbook states which branches build, how a variable name changes and how the Clerk secret key is stored; the routing concept states the app icon.

## 2026-09-17

* **Update**: the players and teams page concepts include their Next.js routes, admin actions, filters, grouping, team-event details and touch-accessible tooltips.

## 2026-09-15

* **Update**: team identities use league-scoped routes; rosters, captains, availability, series searches, fantasy tiers and fantasy breakdowns use event-scoped routes.
* **Update**: the season and ladder stores consume the canonical event routes, select the GNL league for list and create, and adapt the common event phase for the season pages.

## 2026-09-14

* **Update**: a tag vocabulary per area, enforced by the test; `resource` and `stale_after` where they apply; `# Examples` on the session answer, the error envelope, the paged list and the result report; a Start here by question guide that doubles as the benchmark; `just okf-drift`.
* **Update**: a pass with two third-party OKF validators: the descriptions YAML misread are quoted, every concept bound to a file or a vendor carries `resource`, the runbooks carry `stale_after`, the root index carries the overview's own description, and the bundle test now checks the index lines, the tags list and unquoted values.
* **Update**: the `pages` directory is added, one Page concept per page area, with its routes, what each role does there and the writes it makes, the event run page from an empty league to a finished event among them; `Page` joins the type table; the app shell's role table now lists every route and moves `/teams` to member; the stores concept says what the event store holds and what it only returns; the backend contract adds the season import and export routes.
* **Update**: shared components gains the StageView standings order and third-place rule and the VetoBoard side rule; code style gains the one-copy rule for helpers; the backend contract names the veto board's `viewer_side` and team side fields.
* **Creation**: Established the bundle: conventions, concepts, runbooks, decisions and pitfalls, written from the code on `main`, README, DESIGN.md, and the maintainers' recorded decisions. Every concept is `generated` by an agent and carries no `verified` entry yet.
