# Backlog

The open work for the app, frontend and backend, until the first production release. After that release the backlog moves to GitHub issues.

How to use it:
- Add an item under the right heading, with its acceptance criteria and the code it touches.
- Mark a decision still open as **Open:** so it is settled before the work starts.
- When an item ships, delete it here; the pull request and `docs/okf/log.md` keep the record.

## Bugs

### A picked player or map is cut off in its picker button

A picker whose list rows stack two lines, such as a name over its Discord tag, draws the chosen row in the button the same way, and the button is one line tall, so the second line is cut off. Seen in the cup console's "Swap" and "Add a player" dialogs.

Acceptance criteria:
- The button shows the chosen item on one line, ending in an ellipsis when it is too long.
- The open list keeps its two-line rows.
- Holds for every picker with two-line rows.

Notes:
- `Combobox` (`next/src/components/ui/Combobox.tsx`) draws the chosen item in the button with the same `row` as the list. A `flex flex-col` row is cut there.
- Pickers with two-line rows: `CupConsole`, `AccessView`, `EntrantsView`, `CustomMapPicker`, `MapPoolPicker`, `TeamSignupDialog`.
- Fix idea: `Combobox` takes an optional one-line `chosen` renderer for the button, or the rows go to one line, the second part muted beside the first, as `OrganizerPicker` draws them.

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
