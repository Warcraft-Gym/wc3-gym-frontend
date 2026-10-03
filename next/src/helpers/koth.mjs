// The KOTH night the member screens draw, off the event reads alone. The list read
// answers every published event of the kind, so the pages pick from it instead of
// asking for a stored "active" flag.
import { DateTime } from 'luxon';
import { EVENT_KINDS, eventLabel, stateOf, titleOf } from './event-labels.mjs';

// The Night card's form: the date and the time of `starts_at` on the admin's clock, so an
// unchanged save sends the same instant; a night with no `starts_at` keeps its `start_date`
export const nightForm = (event) => {
  const start = event.starts_at ? DateTime.fromISO(event.starts_at, { zone: 'utc' }).toLocal() : null;
  return {
    name: event.name ?? '',
    start_date: start ? start.toISODate() : (event.start_date ?? ''),
    start_time: start ? start.toFormat('HH:mm') : '',
    stream_url: event.stream_url ?? '',
    page_url: event.page_url ?? '',
    signups_open: !!event.signups_open,
    published: !!event.published,
  };
};

// The night fields the Night card writes; the start time is typed on the admin's clock and
// stored in UTC, and a cleared date or time sends no start time
export const nightBody = (form) => ({
  name: form.name.trim(),
  start_date: form.start_date || null,
  starts_at: form.start_date && form.start_time ? DateTime.fromISO(`${form.start_date}T${form.start_time}`).toUTC().toISO() : null,
  stream_url: form.stream_url.trim() || null,
  page_url: form.page_url.trim() || null,
  signups_open: form.signups_open,
  published: form.published,
});

// Only the close ends a night, so a night with no `closed_at` still runs however old it is
export const nightState = (night) => {
  const state = stateOf(night);
  return state === 'finished' && !night?.closed_at ? 'running' : state;
};

// Which KOTH event the public page draws tonight: the newest published night that is
// not finished.
export const openNight = (events = []) => [...events]
  .filter((event) => event.published !== false && event.phase !== 'finished')
  .sort((a, b) => when(b).localeCompare(when(a)) || (b.id ?? 0) - (a.id ?? 0))[0] ?? null;

// A night carries an instant; an event with dates alone falls back to its start day,
// which the member read spells `start`
const when = (event) => String(event?.starts_at ?? event?.start_date ?? event?.start ?? '');

// The one night the member screens offer, from the rows GET /me/events answers: the home
// and the player page carry tonight's night, never the whole list of them.
export const myNight = (rows = []) => openNight(rows.filter((row) => row.kind === 'koth'));

// The races the caller entered the night on, from GET /events/{id}/entrants. A withdrawn
// row gave its place back, so it names no race here.
export const myRaces = (entrants = [], userId = null) => entrants
  .filter((row) => row.user?.id === userId && !row.withdrawn_at && row.race)
  .map((row) => row.race);

// The player page's events list with tonight's night folded in: the night rides on his
// own history row once he entered it, and leads the list while he has not. The row it
// builds carries the same fields `eventRows` builds, so the accordion draws it unchanged.
export function foldNight(rows = [], night = null, races = []) {
  if (!night) return rows;
  const mark = { night, races };
  if (rows.some((row) => row.id === night.id)) {
    // the history row names no instant, and a night is read by the hour it starts
    return rows.map((row) => (row.id === night.id
      ? { ...row, ...mark, season: { ...row.season, starts_at: night.starts_at } }
      : row));
  }
  return [{
    id: night.id,
    event: night,
    season: {
      id: night.id,
      name: night.name,
      start_date: night.start ?? night.start_date,
      end_date: night.end ?? night.end_date,
      starts_at: night.starts_at,
    },
    kind: night.kind,
    kindLabel: titleOf(EVENT_KINDS, night.kind),
    label: eventLabel(night),
    placing: null,
    running: night.phase === 'running',
    champion: false,
    team: null,
    teamId: null,
    race: null,
    wins: 0,
    losses: 0,
    series: [],
    next: null,
    ladder: null,
    ...mark,
  }, ...rows];
}
