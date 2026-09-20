# Bundle history

## 2026-09-20

* **Update**: the team check-in page shows one round as a roster list or every round as a matrix, both from one read, and the captain edits from a row menu. The teams page concept states the two views, the four states, the derived block and the write that sits out every round that has not ended.
* **Update**: the season dialog turns check-in off for an existing event and hides the check-in days and the early check-in switch while it is off. The GNL season page concept states the field and the new-season default.
* **Update**: the player page answers a round in its Events section, carries the state chip and the round end line, and sits out every remaining round with an Undo; the availability page lists the rounds the blocked times cover. The players and stats page concept states the chip, the early window, the bulk sit-out and the write it makes.

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
