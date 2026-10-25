# Backlog

The open work for the app, frontend and backend, until the first production release. After that release the backlog moves to GitHub issues.

How to use it:
- Add an item under the right heading, with its acceptance criteria and the code it touches.
- Mark a decision still open as **Open:** so it is settled before the work starts.
- When an item ships, delete it here; the pull request and `docs/okf/log.md` keep the record.

## Bugs

None open.

## Stories

### Only admins and the players themselves check players in on production

As an admin, I want organizers to stop checking players in on production while they still can on staging, so a check-in on production means the player confirmed it and organizers can still test an evening on staging.

Acceptance criteria:
- On production, a runner who is not an admin gets 403 on `POST /events/{id}/entrants/checkin-everyone`, and on `POST /events/{id}/entrants/{entrant_id}/checkin` for another player's row.
- A player still checks themselves in, and an admin still checks anyone in.
- On staging and locally, organizers keep both actions.
- The run page hides "Check everyone in" and a row's check-in button when the viewer may not use them.
- Tests cover production and staging.

Notes:
- Backend and frontend. The backend tells production by `VERCEL_ENV == "production"`, as `app/services/egress_monitor.py` already does.
- Rather than the frontend reading its own environment, the event read says whether the caller may check others in (for example a `may_check_in_others` flag), so the buttons follow the backend's rule.
- Routes: `app/api/routes/events.py` (`check_everyone_in_to_cup`, `check_in`).
- Update the check-in concept in the backend bundle and the event-management page in the frontend bundle.

### Change a cup's settings until the draw

As an organizer, I want to change a cup's settings until the draw, in the same wizard that created it. Then a mistake at creation doesn't mean deleting the cup.

Acceptance criteria:
- Until the first stage is drawn, the run page offers "Edit cup". It opens the Create cup wizard filled in with the cup's settings.
- Every step opens directly from the step bar, in any order, and "Save" writes the changes from any step.
- Before the draw, every setting changes that leaves the signed-up players and their data intact: name, description, start, format and its options, best-of, map pool, sign-up information and sign-up rules.
- A setting that would break existing data shows read-only, with the reason next to it.
- Once the cup is drawn, the wizard is not offered. The run page keeps today's rules, where the best-of, maps and sign-up rules lock at the draw.
- Every write goes through the existing routes and their checks.

Notes:
- Most of the writes exist:
  - `PUT /events/{id}` (`EventUpdate`: name, description, start, check-in, rules, player cap and minimum, divisions on or off);
  - `PUT /events/{id}/stages`, which updates a stage in place and keeps its id;
  - `PUT /events/{id}/maps`;
  - `PUT`, `POST` and `DELETE /events/{id}/legs` for the rounds of a cup played over several rounds.
- The recurring rule keeps its own Edit dialog.
- No route changes these after creation today: `cup_settings.custom_game`, `points_by_place`, the entrant kind and the team size.
- The wizard is `CupCreateView.tsx` with `helpers/cup-wizard.mjs` (`cupSteps`, `cupPayload`). An edit also needs the reverse direction, from the cup's settings to the form.
- Today the run page edits pieces in place: `CupFormatCard` (best-of and maps), and the "Sign-up rules" dialog and `CheckinSettings` in `CupConsole`.
- **Open:** which settings lock once a player has signed up? The likely ones are the mode (team size, FFA, custom game) and one evening versus several rounds.
- **Open:** do the in-place cards stay beside "Edit cup", or does the wizard replace them?
