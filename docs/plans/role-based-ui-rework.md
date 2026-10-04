# Role-based UI rework

## Progress

- **Step 1, the general layout: done.** Frontend `feature/ui-rework-layout`, backend `feature/admin-me-seats`.
- **Step 2, simpler nav and the player Home: done** (merged with the layout).
- **Captain navigation: in review.** Frontend and backend `feature/captain-match-nav`. Home's My Season shows a captain his team's fixture on every round: how far its series are, and one button named after the team it meets ("vs <team>") whatever the round's state (the backend adds `captain_matches` to `GET /me/events`). The panel's title bar adds "Season", and the season page picks any GNL season, so a captain reads every match of the current and older seasons without the admin area.
- **Player control panel: in review.** Frontend and backend `feature/home-control-panel`. Home's My Season keeps every season task of a player open to correct while the season runs: every series of a round with "Change time", "View veto" and "Edit result", a blocked round's answer, and sitting out the rest. The blocked times move into one dialog opened from My Season, the player page and the account menu. The backend posts a player's or a captain's change to a reported result, and a cleared result, beside the result card in Discord; a captain's series edit and every admin write post nothing.
- **Captain hub stories 1, 2, 4, 5 and 7, the round planner in the match view: done** (merged as `feature/pairing-improvements`). The backend branch covers three changes: either captain publishes, captains see each player's availability and blocked hours before pairing, and the draft takes any number of pairings while publishing stops at the round's series. Story 7 is "Find a replacement" on a published series, without the announce, which waits for story 6. Stories 3, 6, 8 and 9 stay open.

### Decisions from the round planner (2026-09-30, 2026-10-02)

- The match view has two tabs, "Series" and "Plan round". The plan is a wizard of four steps, one tab per step with Back and Next: who plays, the MMR range, pick matchups, and the draft. Each step keeps its help behind an info button, because the people who plan are power users.
- Finding a replacement starts from the published series that needs one, not from a mode of the planner (2026-10-02), so the planner stays simple. The search asks who is replaced (one player or both) and the MMR range, lists the matchups of the player who stays, and the captain takes that filter away when none fits. A replacement may keep a player or name two new ones, and several drafts may propose a replacement of one series; publishing one drops the others (backend change on the same branch).
- "Who plays" and "Who needs a match" search by name or battle tag.
- Picked matchups wait in the captain's own selection, kept in the browser per match, until "Move to draft". The matchups list keeps players who already hold a match, tinted and named; only the exact pairs in the draft or published leave it.
- The draft takes any number of pairings; publishing stops at the round's `series_per_round` (backend: the count moved from draft create to promote). The captain ticks which drafts to publish.
- A captain's switch writes a player's round answer for their own team. For the other team it only shapes the captain's own list.
- No score: the captain decides. The facts sit with each player's name (the ladder record against the opponent's race, and the races faced this season with the opponent's race ringed), and the column titles sort the list on several criteria at once, in the order clicked; nothing sorts by default, and a team's title sorts by its player MMR. The race history is shown, not sorted.
- The time a pair shares is printed only when both players entered availability. A pair 8 h or more apart warns. An opened row shows a week calendar with a time column per clock and each player's blocked hours in their own colour. Captains see each player's blocked hours before any pairing.
- Either captain marks the fantasy series on the draft and publishes; the Ready mark leaves the captain UI.
- The matchup builder is Full on a phone.

### Decisions from step 2 (they override the layout described in step 1)

- A player needs two places only: **Home** and their own **player dashboard** ("My Stats").
- The nav shows only the hats a person wears: Home, My Stats (with a player row), My Team (captains and roster players), Admin (admins). The Season, Fantasy and Events menus, the More tab and the drawer are gone; the shared pages are reached through links in the Home panels.
- The season score on Home is the GNL series points of the current season.
- Achievement counts on Home are computed in the browser from the cached ladder read per season; no backend change.

# Step 1: the general layout

## Start here (execution order)

1. **Branches** (each from the branch currently checked out, never from or onto it directly):
   - frontend `wc3-gym-frontend`: from `feature/run-without-clerk` create `feature/ui-rework-layout`
   - backend `wc3-gym-backend`: from `main` create `feature/admin-me-seats`
2. **Save this plan as a file you can come back to:** `wc3-gym-frontend/docs/plans/role-based-ui-rework.md`. It is outside `docs/okf/`, so the public-bundle rules do not apply, but it still names no person and holds no value. It is committed on the frontend branch as the first commit. A memory entry points to it for later sessions.
3. **Backend seats PR** (below), then the **frontend layout** steps 1–5 (below), one commit per step.
4. Scope: only GNL-related work and the general layout. KOTH, tournaments and other events keep their pages and behaviour. They only appear in the new nav and sidebar.

## Context

The frontend (`wc3-gym-frontend/next`, branch `feature/run-without-clerk`; Next 16 App Router, shadcn/base-ui, Tailwind 4)
has one static nav (`src/components/layout/nav-items.ts`) filtered by a single role rank (`src/lib/routes.ts`).
Its menus follow data types (GNL, Events, Fantasy, KOTH, Config). A player, a captain and an admin all get the same tree with parts hidden.

The rework organises the UI around three users:
- **Admin**: configures the tool; sets up GNL seasons (teams, maps, players, captains, fixtures); fixes wrong data; runs Fantasy; runs KOTH and future events.
- **Captain**: owns a team for one or more GNL seasons; builds matchups; needs player info and availability, team status, and season status for the team.
- **Player**: sets availability; sees assigned games and opponent info; schedules a play time, runs the map veto, reports results.

The work goes step by step. **This plan covers only the general layout**: the shell, the navigation, the admin area frame, and the shared rules.
Each function (admin areas, captain hub, player home) then gets its own plan and PRs on top of this frame.

## Guidelines for every view (written into `DESIGN.md` in this step)

Most users are not IT or data specialists.
1. **One view, one task.** Its title names the task ("Plan Round 3 Lineup"), not the data.
2. **The next step comes first**, as the single filled button. Everything else sits below it.
3. **Plain words.** No internal terms (draft series, promote, entrant, seat, phase codes). Every status is a short label with a colour and an icon.
4. **Show, don't tabulate.** Use status chips, progress steps and cards. Use a table only when comparing many rows is the task.
5. **No fancy UI.** Existing shadcn components and `DESIGN.md` tokens; no new UI library.
6. **Say when something is empty or blocked.** Every empty state and every disabled button says why.
7. **Every view has a phone layout**, built in the same PR, at one of three levels recorded in its `docs/okf/pages/*` doc:
   - **Full**: every action works on a phone.
   - **Read on phone**: the phone shows the status; editing shows "This step is easier on a computer" with a link.
   - **Desktop only**: the phone shows only that notice.

## Roles are hats, not a rank

One person can be player, captain+player, admin+player, or all three. The nav reads three independent hats from `/me`:

| Hat | From `/me` | Shows |
|---|---|---|
| Player | `user` set; `seasons[].team` | Home with own games; "My Team" for each roster team |
| Captain | `seats[]` (team_id, season_id); `seasons[].captain` | "My Team · <season>" for each seat (a captain seat wins over a roster entry for the same season) |
| Admin | `actual_role === "admin"` | "Admin" entry |

The rank in `routes.ts` stays for the route guard only. Per-object checks (`isCaptainOf`, `actsForSeries`) are unchanged.
View-as keeps previewing one hat at a time (while viewing as a lower role, the Admin entry disappears).

## The layout

**Desktop (≥ 960 px), top bar:**
```
WC3 Gym   Home   My Team ▾   Season ▾   Fantasy   Events ▾   Admin          (avatar) (theme)
```
- **Home**: the personal page (today's `HomeView`; it becomes the stacked task page in the player-home step).
- **My Team**: a plain link for one team, a menu for several (a captain of two seasons, or captain in one and player in another). Hidden without a team.
- **Season**: Standings (`/report`), Upcoming Games, Teams, Players, Ladder.
- **Fantasy**: Leaderboard and My Fantasy Team (a menu only when there are two links).
- **Events**: Leagues, Events, KOTH Board.
- **Admin**: only for the admin hat.

**Phone (< 960 px), bottom tab bar** for the common tasks, with thumb-sized targets:
```
[ Home ]  [ My Team ]  [ Season ]  [ More ]
```
- The top bar keeps only the title, avatar and theme.
- "My Team" is shown only with a team. With several teams it opens a short sheet to pick one.
- "More" opens the existing left `Sheet` with Fantasy, Events and Admin (for the admin hat).
- This replaces today's hamburger-only drawer, so a player reaches Home and their team in one tap.

**Admin area frame.** The sidebar follows how an admin actually works, which is mainly GNL:
- **Desktop:** a left sidebar (about 240 px) with three sections:
  - **GNL**
    - Season Setup: the step list for the season being prepared or running. A placeholder in this step, which links to Seasons.
    - Seasons
    - Teams
    - Maps
    - Players
    - Fantasy Tiers
    - Fantasy Bets
  - **App Settings**
    - Settings
    - Discord
    - Access
    - User Guide
  - **Other Events**
    - KOTH Nights
    - Events
    - New Event
    - This section links to today's pages and is not reworked until GNL is done for all roles.
- The sidebar shows on `/admin` **and on every existing admin page listed in it**. No page moves or redirects in this step; later steps move or rework pages section by section.
- **Later decision (2026-09-28):** the sidebar shows for a session with the admin hat on **every page the Admin tab leads to**: the admin sections, the pages under them (a season, its draft, an event), match and series pages opened from a season, and every team page (overall and in a season, the admin's own My Team included). Home and the player page keep the plain layout. The admin can slide it out to the left and back; the browser remembers the choice. Players, captains and view-as never see it.
- **Phone:** no sidebar. `/admin` shows the same sections as a list of large rows with icons and one-line descriptions, and each admin page gets a "← Admin" back link in its header.
- Admin pages that are not yet phone-ready show the shared desktop notice. Their levels are set when each section is reworked; until then they keep today's behaviour.

## Implementation

**Backend (wc3-gym-backend, separate PR, first).**
In `app/api/deps.py:130-131`, an admin's claims also get `_seat_claims(team_service.captain_seats(discord_id), current)` while the role stays `admin`, so `/me` answers `seats` and `seasons[].captain` for an admin who captains.
- Guards are unchanged (`require_captain` already admits admins).
- Add a test: an admin with a `team_season_captain` row gets `seats` from `/me`.
- Update `docs/okf/concepts/roles-and-permissions.md` and `docs/okf/api/auth.md`, plus `generated.at`.
- Run `uv run just test`, `uv run just lint` and `uv run just typecheck`.

**Frontend (wc3-gym-frontend/next), in PR-sized steps:**

1. **Nav model.** Add a pure `src/helpers/nav-model.mjs` (+ `nav-model.test.mjs`) that replaces `nav-items.ts`:
   - `buildNav(me, canSee)` returns `{ home, teams[], browse[], admin }`.
   - `teams[]` merges `seats` with `seasons[].team`, labels each entry with the season name, and links it to `/team/:id/season/:seasonId`. In the captain-hub step this becomes `/captain/...`, a change in this one helper.
   - Add a static `src/components/layout/admin-nav.ts` with sections and items (icon, title, one-line description, `to`).
   - Tests: guest, player, captain+player, a captain with two seats, admin only (the token session without `user`), admin+player, admin+captain+player, and view-as captain. Also test that every `admin-nav.ts` path resolves to `role: "admin"` in `ROUTES`.
2. **Top bar + bottom tab bar.**
   - Rework `src/components/layout/AppShell.tsx` so the desktop bar draws from `buildNav`.
   - Add `src/components/layout/BottomNav.tsx` (fixed, under 960 px, uses `Icon` and design tokens, safe-area padding). `main` gets bottom padding so content is not hidden behind it.
   - Keep the avatar menu (Profile, Availability, View as…, Logout), the view-as banner, `Guard`, `PlayerPanel`, and the clean KOTH overlay (no bars in `mode=clean`).
   - Check that `PlayerPanel` and bottom sheets sit above the tab bar.
3. **Admin frame.**
   - Add `src/components/admin/AdminSidebar.tsx`. AppShell draws it next to the content (desktop) when the path is `/admin` or one of the `admin-nav.ts` paths.
   - Add `src/app/(app)/admin/page.tsx` + `AdminHomeView.tsx` (the section list; on desktop the same list as cards; the Season Setup card is a placeholder until the GNL step), and add `{ path: "/admin", meta: { role: "admin" } }` to `ROUTES`.
   - Add `components/admin/AdminBackLink.tsx` for phones, used through `PageHeader` on the listed admin pages (a small optional `back` prop on `src/components/PageHeader.tsx`).
4. **Shared notice + rules.**
   - Add `src/components/DesktopOnlyNotice.tsx` (uses `useBreakpoint(SM_AND_DOWN)` from `src/hooks/breakpoint.ts`, with a copy-link button). No view adopts it yet; it waits for the section reworks.
   - Write the guidelines and the three mobile levels into `wc3-gym-frontend/DESIGN.md`.
5. **Docs.** Update `docs/okf/concepts/app-shell-and-routing.md` (the nav model, the tab bar, the admin frame; this also fixes its outdated "app bar" section) and `concepts/shared-components.md` (BottomNav, AdminSidebar, DesktopOnlyNotice), and add a `log.md` entry.

Reuse: `Sheet`, `DropdownMenu`, `Button`, `Icon`, `Avatar`, `PageHeader`, `canSeeRole` / `metaOf`, `useAuth`, `myProfilePath`, and `useBreakpoint`. No new dependencies.

## After this step (each gets its own plan)

Scope: **GNL first, for all roles.** KOTH and tournaments stay as they are until GNL is complete for admin, captain and player.

### 1. Admin: Manage GNL (user stories, in the order an admin runs them)

Setting up a season happens once or twice a year, so admins do not remember the path. The core of this work is a **Season Setup page** (`/admin` → GNL → Season Setup) that lists the steps below in order.
- Each step shows its state (Not started / In progress / Done) with a one-line summary ("6 teams, 6 captains") and one button that opens the task.
- The done/not-done logic sits in a pure, tested helper built from existing reads.
- Steps can be done out of order; the list only guides.

| # | User story | Today's place (starting point) | Rework notes |
|---|---|---|---|
| 1 | Set up a new season | `seasons/SeasonsView` (create) | Short form with plain labels; sets the current season (`current_gnl_season`, today in `ConfigView`) as part of the flow |
| 2 | Maintain teams | `teams/TeamsView` | League-wide team list: name, logo, Discord role |
| 3 | Maintain maps | `maps/MapsView` | Map pool with images; ladder import |
| 4 | Open the season for signup | `SeasonsView` switch `signups_open` | Also offers "Publish season" (`PUT /events/{id}` `published`; there is no UI for it today). Shows the signup count |
| 5 | Maintain players | `players/PlayersView` | Find, edit, merge, tag. Merge and tags are desktop only. **Done:** tick any number of players and add them to a season (a race each), sync them from W3Champions, or delete them; the bar shows only while a player is ticked |
| 6 | Add teams to the season with season data (captains, season name or logo, etc.) | `team/[id]/season/[sid]`, `/events/{id}/teams`, `PUT .../captains` | One season page listing its teams, each with captains and settings |
| 7 | Assign maps to the season | `seasons/[id]/maps` | Pick from the pool, set the order |
| 8 | Define team matchups for rounds (each team plays each other at least once) | `seasons/[id]` (matches are created one by one, `POST /matches`) | **New:** generate a round-robin schedule (a pure helper with tests) as a preview the admin can adjust, then save. Check whether a bulk backend route is needed or `POST /matches` per fixture is enough |
| 9 | Run the draft (assign players to teams) | `seasons/[id]/assign` | Desktop only; show clearly who is still unassigned. **Done:** one table paged by pick set (one player per team a page), opening on the current set; a draft MMR kept in the page moves a player to an earlier or later set (replaces the Round dropdown), team chips replace the team dropdown, the race is an icon, and the rosters update right after an assign or remove; team cards show the average MMR, and a player moves between teams by dragging them onto another team's card |
| 10 | Sync players' Discord roles (season role, team roles) | `config/discord-roles` + `POST /config/discord-roles/sync` | A "Sync Discord roles" step on the season page that shows what will change before it applies |
| 11 | Put players into fantasy tiers | `fantasy/tiers` | Stays per season; the step shows "tiers applied" |
| 12 | Open or close fantasy team creation | `ConfigView` switch `fantasy_team_creation_enabled` | A switch directly on the season page |
| 13 | Maintain season data (manual changes to created series, results, etc.) | `seasons/[id]`, `match/[id]`, `series/[id]` (edit dialogs) | A "Season Running" view: rounds with a status per fixture and a list of what needs a fix (missing results, overdue series), each row with an edit action |
| 14 | Maintain fantasy bets | `fantasy/bets` | Per season, linked from the running season view |

Planned as about 4 PRs:
- the Season Setup page and helper
- master data: teams, maps, players
- season setup steps 6–12, including the round-robin generator
- the Season Running view and bets

### 2. Admin: App Settings

Settings, Discord link and roles, Access, User Guide. Settings used by GNL (the current season, fantasy creation) move into the Season Setup page; the general Settings page keeps the rest.

### 3. Captain: the Team hub (`/captain/[teamId]/[seasonId]`, one per seat)

The hub opens on **this week's round**. A step bar shows where the week stands:
**Availability → Build Matchups → Publish → Announce → Games Played**.
Captains agree in Discord; the app has no acceptance step. Both captains of a fixture work on the same shared proposal, and either one finalises, publishes and announces it.
Below it: the team's season status. Each story in order:

| # | User story | Today's base | Rework notes |
|---|---|---|---|
| 1 | Mark which players are unavailable in week X, so they are left out of proposals | Team availability `GET/PUT /events/{eid}/teams/{tid}/availability[/all]`; `isOut` in `RoundDraftBoard` | A simple roster list for the round with an Available / Not available switch per player. Players' own blocks show as already set. **Full on phone** |
| 2 | Find the best matchups between both teams | `helpers/draft-suggest.mjs` `suggestPairings` (MMR gap + shared hours), "Suggest pairings" in `RoundDraftBoard` | Extend the tested helper to a weighted score, in priority order: (a) W3C MMR gap, (b) each player's win/loss record against the opponent's race (already on the board as `vs_race`), (c) fairness: fewer series played this season scores higher, so games even out over the season (usually 2/3 of the roster or fewer play each week), (d) timezone/country overlap, (e) least important: avoid the same opponent race a 4th time in a row. Each suggested pair shows plain reasons ("Close MMR · Needs games · Same timezone"), so the captain understands and can swap. Check which figures the draft board read already carries (series played this season, recent opponent races); anything missing is added to `GET /matches/{mid}/draft-board` (personal, `private`; the PR states rows per call) |
| 3 | Share the proposal with the opposing captain | Draft series (either captain edits) | The draft is the shared proposal. Both hubs show it with "Last changed by <captain>" so the Discord discussion can point at it. The Ready mark is dropped from the captain UI (the backend keeps it; it blocks nothing) |
| 4 | Choose the fantasy matches of the week (the series fantasy captains can bet on) | `is_fantasy_match` on `draft_series` and `series` | A star toggle per pairing. Either captain sets or changes it freely, with no limit, before and after publishing. **Check** that a captain may change `is_fantasy_match` on a published series of their fixture; if not, add that to the backend |
| 5 | Publish the agreed series | `POST /draft-series/{id}/promote`, **admin only today** | **Backend change:** either captain of the fixture may publish at any time (no acceptance). One "Publish round" button publishes every draft of the fixture, with a short confirm that lists the pairings. Admin publishing stays |
| 6 | Tell players their matchup in Discord | `/announce` Discord command (one series, posted by a player); `app/services/discord_posts.py` | **New:** an "Announce in Discord" button that posts the match cards of the published round (reuses `series_cards.match_embed`). A new captain route; the backend decides the channel. The hub shows "Announced" |
| 7 | Find replacement matches when players drop out or games cannot happen, and announce them | Replacement drafts (`replaces_series_id`, `GET /draft-series/{id}/replaces`) | "Find a replacement" on a published series opens a search on the plan tab: who is replaced, the MMR range, the matchups of the player who stays (a removable filter), and the pick drafted as the replacement, published with "Publish and replace". The announce comes with story 6 |
| 8 | Check how far the team is with its matches | Season/team pages, `/player-series` | A status list per series of the round: Needs time → Scheduled → Veto done → Played/Reported, and who is late. Plus the season view: rounds, points, standing, games played per player (matches the fairness figure from story 2). **Full on phone** |
| 9 | Manage results for players where needed | `PUT /player-series/{id}` (captains already pass `acts_for_side`), `ReportResultDialog` | A "Report result" action on each of the team's series in the status list |

Phone levels: stories 1, 3, 5, 6, 8, 9 are Full. The matchup builder (2, 4, 7) is **Read on phone** at first. It becomes Full if the suggest → accept flow works as a simple list of pairings with swap buttons.

Backend work for the captain phase (each its own PR with docs):
- captain publish at any time, for the captains of either team in the fixture
- captain edit of `is_fantasy_match` on the fixture's published series (if it is not allowed already)
- a round announce route for captains
- any figures missing from the draft board read (series played this season, recent opponent races)

### 4. Player: Home (step 2)

Home is the player's one page for the week. A stack of panels, each shown only when it has something to say. **Full on phone.**

| # | Panel | Shows |
|---|---|---|
| 1 | Sign Up | Only while a season or event is open for signup and the player has not joined, with one button per signup |
| 2 | My Season | The current season (always the one the admins set) round by round: each round's Available / Out answer while its check-in is open, and once paired every series with all its steps (Schedule → Veto maps → Report result), each step taken open to correct, and the result. The blocked times button and, with early check-in, sit out the rest |
| 3 | Upcoming Series | The next 5 series, with a link to the full upcoming list |
| 4 | Fantasy | While team creation is open and the player has no team: create a team. With a team: the fantasy series still open for bets, with the player's bet or a "Place bet" button, and a link to the leaderboard |
| 5 | My Stats | Part of N seasons · achievements this season and overall · top 3 achievements this season · season score (GNL points). Leads to the player dashboard |

The player stories it covers:

| # | User story | Where |
|---|---|---|
| 1 | Sign up for an open season | Sign Up panel |
| 2 | Set my availability for the season | My Season panel, per round, and sit out the rest; blocked times in the one dialog, from My Season, the player page or the account menu |
| 3 | See which games I have been assigned, played and open | My Season panel (`/player-series`, `roundCards`) |
| 4 | See information about my opponent | The player name opens `PlayerPanel` |
| 5 | Agree a play time, do the map veto, report the result, and correct each of them while the season runs | The series actions in My Season (`ScheduleDialog`, `VetoBoard`, `ReportResultDialog`); a change to a reported result is posted in Discord |
| 6 | Create a fantasy team and bet on fantasy matches | Fantasy panel (`BetDialog`, shared with the fantasy page) |
| 7 | See my stats and achievements | My Stats panel → player dashboard |

The player dashboard is mainly a page to look at; the tasks start on Home. Follow-up: rework it into a stats and achievements page (today achievements show only in its ladder tab).

### 5. Later

Cleanup of duplicated inline role checks. Then Other Events (KOTH, tournaments).

## Verification

- `pnpm test` (nav-model tests) and `pnpm build` in `wc3-gym-frontend/next`. The backend suite runs for the seats PR.
- Run against a local backend (`uv run just serve`) and `pnpm dev`:
  - As an admin who holds a captain seat and a roster spot, the bar shows Home, My Team (menu), Season, Fantasy, Events and Admin.
  - View as Member (only the roster team), Captain with two seats (My Team menu with both), and Guest (no My Team, no Admin).
  - `/admin` and every sidebar page show the sidebar on desktop. A non-admin opening `/admin` lands on `/no-access`.
- Phone width (about 390 px, browser device mode):
  - The bottom tab bar is visible and the page content ends above it.
  - "More" opens the drawer, and "My Team" with several teams opens the picker.
  - `/admin` shows the section list, and admin pages show "← Admin".
  - `/koth/dashboard?mode=clean` shows no bars.
