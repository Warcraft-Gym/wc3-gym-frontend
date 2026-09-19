---
type: Page
title: Member self-service
description: The home page, the profile, the season signup form and the availability page; what a member reads and writes about themselves.
resource: ../../../next/src/app/(app)/HomeView.tsx
tags: [pages]
generated: { by: claude-code/claude-fable-5-1, at: 2026-09-16T22:30:00Z }
sources:
  - id: home
    resource: ../../../next/src/app/(app)/HomeView.tsx
    title: The home page
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

**Home (`/`).** One card per event that `GET /me/events` answers, in date order. A finished event stays off the page unless `/me` still lists the member in that season. A KOTH league takes one card only, for tonight's night. A card shows the date tile, the event label, a status line (the round in play for a GNL member, the open check-in, or the dates), the state chip, and one action. The action is the word the backend picked for the caller: sign up, withdraw (the confirm says every race the member entered goes; one race at a time is the event page's job), check in, or view. A GNL season carries a link instead: "Sign up" or "Ask to join" while the member is not in, "Your series" once they are. Under a GNL card sit the links to the team, the report, the upcoming series, the ladder, the players, the fantasy team, and the availability page when the season's scheduling tools are on. When the backend hints that the member's own blocks cover the next round, the card shows the hint and a button to confirm they cannot play. Once per browser session a dialog lists the events the member can still sign up for. An admin also sees three counters, teams, seasons and players, each a link to its page.

**Profile (`/profile`).** The one route a guest may open. A guest reads a card that offers the Discord invite from the settings and a "Check again" button, which reads `/me` once more. A member with no player row reads the signup form. A member with a player row is sent to their own player page.

**Signup (`/signup`).** The season signup form: player name, battle tag, country, main race and timezone, prefilled from the linked player row. `?season=<slug>` names the season; otherwise the `/me` answer's season does. The form has five states. Signup: the season is open and takes signups. Request: signups are closed or the season has commenced, so the form saves the profile and asks an admin to add the player. Joined: the page shows the entry and offers "Change my details", plus a link to the round check-in when scheduling is on. Over: the season is complete. Profile: no season takes signups, so only the profile saves. A submit the backend answers as closed shows the backend's message. A successful submit reads `/me` again.

**Availability (`/availability`).** The timezone the member's hours are read in, then the blocked times editor: repeating weekly blocks and one-off busy periods. The backend refuses a block while the profile names no zone, so the editor writes the browser zone first when the profile has none. The page says that open hours are a starting point, not a promise.

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
