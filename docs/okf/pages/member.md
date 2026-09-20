---
type: Page
title: Member self-service
description: The home page, the profile, the season signup form and the availability page; what a member reads and writes about themselves.
resource: ../../../next/src/app/(app)/HomeView.tsx
tags: [pages]
generated: { by: claude-code/claude-fable-5-1, at: 2026-09-20T13:00:00Z }
sources:
  - id: home
    resource: ../../../next/src/app/(app)/HomeView.tsx
    title: The home page
  - id: home-panels
    resource: ../../../next/src/components/home/HomePanel.tsx
    title: The panel shell of the home hub
  - id: home-helper
    resource: ../../../next/src/helpers/home-hub.mjs
    title: The panel order, the signup chip and the captain row
  - id: profile
    resource: ../../../next/src/app/(app)/profile/ProfileView.tsx
    title: The profile switch
  - id: signup
    resource: ../../../next/src/app/(app)/signup/PublicSignupView.tsx
    title: The season signup form
  - id: availability
    resource: ../../../next/src/app/(app)/availability/AvailabilityView.tsx
    title: The availability page
  - id: events-helper
    resource: ../../../next/src/helpers/events.mjs
    title: The home cards and the action words
  - id: blocks
    resource: ../../../next/src/components/BlockedTimesEditor.tsx
    title: The blocked times editor
  - id: blocked-rounds
    resource: ../../../next/src/app/(app)/availability/BlockedRounds.tsx
    title: The rounds the blocked times cover
---

# Routes

| Path | Lowest role | View |
|---|---|---|
| `/` | member | `HomeView` |
| `/profile` | guest | `ProfileView` |
| `/signup` | member | `PublicSignupView` |
| `/availability` | member | `AvailabilityView` |

`/player-dashboard` redirects to the member's own player page, or to `/profile` while the session has not loaded.

# What it does

**Home (`/`).** A hub of five panels under the h1 "Home", which carries no subheader. Above 960 px a wide main column holds "Your series", "Next matches" and "Open signups", and a narrow side column holds the latest season's leaderboard and "Casted games"; below that width the columns dissolve into one stack. One CSS order per panel drives both layouts, so a member with no series of his own reads "Open signups" first, the leaderboard second and his own panel third. Each panel draws its own skeleton rows under its real title while the page loads.

"Your series" states the member's next series with the compact action bar and the result of the one he played last, both out of `GET /player-series` for each season `/me` says he is in. The result is the series score with his own score first, in the win or the loss token, linked to the series; it carries no icon and no word. "Next matches" is the `next` list of `GET /home/series`, at most five rows, each with its time in the reader's zone, its League - Event - Stage - Round label, its teams, its two players with the MMR the row names and a chip for the caster who claimed it; a side with neither player nor team reads "To be decided", and "All upcoming" opens the schedule. A captain reads one row first per event whose member row carries a fixture he still has to draft, with the round, the two teams, how much of it is drafted and a button to the draft board. "Open signups" lists the events whose signups stand open, soonest closing first, each with the same outlined button: sign up opens the signup dialog, a GNL season links to its own form, a member already in reads a chip beside the withdraw or the check-in. A signup that closes within two days carries one small warning chip. The leaderboard names the latest GNL season as a link to its page, a chip for the round in play or "Final", the day the round ends, and the top five teams by season points. "Casted games" is the `casts_upcoming` and `casts_recent` lists of `GET /home/series`, with "Watch" to the stream and "VOD" to the recording.

The hub reads `GET /home/series` once per page load; that read is public and edge cached, so it is sent without a bearer. It carries no admin card: an admin reaches season management and the round draft through the leaderboard's season link.

**Profile (`/profile`).** The one route a guest may open. A guest reads a card that offers the Discord invite from the settings and a "Check again" button, which reads `/me` once more. A member with no player row reads the signup form. A member with a player row is sent to their own player page.

**Signup (`/signup`).** The season signup form: player name, battle tag, country, main race and timezone, prefilled from the linked player row. `?season=<slug>` names the season; otherwise the `/me` answer's season does. The form has five states. Signup: the season is open and takes signups. Request: signups are closed or the season has commenced, so the form saves the profile and asks an admin to add the player. Joined: the page shows the entry and offers "Change my details", plus a link to the round check-in when scheduling is on. Over: the season is complete. Profile: no season takes signups, so only the profile saves. A submit the backend answers as closed shows the backend's message. A successful submit reads `/me` again.

**Availability (`/availability`).** The timezone the member's hours are read in, then the blocked times editor: repeating weekly blocks and one-off busy periods. The backend refuses a block while the profile names no zone, so the editor writes the browser zone first when the profile has none. The page says that open hours are a starting point, not a promise. It holds no check-in control: the round check-in lives on the [player page](players-and-stats.md). Under the editor, "Rounds these cover" reads the rounds the blocks answer on their own, grouped by event, each with its derived "Out (blocked times)" chip and a link to the event. The list is read-only, because a derived answer is never stored; a round is taken back on the player page. It reads one `GET /player-series` per event the member is signed up to, the same read the player page makes, and shows the app's skeleton pulse until they land. The reads run once, when the page loads; a saved or deleted block moves the rounds the blocks cover, so the card then asks the reader to reload the page.

# Writes

| Store action | Route |
|---|---|
| `event.signUp` | `POST /events/{id}/entrants` |
| `event.withdraw` | `DELETE /events/{id}/entrants/me` |
| `event.checkInRow` | `POST /events/{id}/entrants/{entrant_id}/checkin`, or `PUT /player-availability` when the event checks in by round |
| `event.answerRound` | `PUT /player-availability` |
| the signup form, no store | `POST /signup` |
| the availability page, no store | `PUT /user-info` (the timezone) |
| the blocked times editor, no store | `POST` and `PUT /player-blocks/repeating`, `POST` and `PUT /player-blocks/busy`, `DELETE /player-blocks/{kind}/{id}` |

# Rules

- The guard, the roles and where a login lands: [app shell and routing](../concepts/app-shell-and-routing.md).
- The `/me` answer the home and the signup form read: [the backend contract](../concepts/backend-contract.md).
- The guest session and the join card: [session and auth](../concepts/session-and-auth.md).
