# Bundle history

## 2026-09-19

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
