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
