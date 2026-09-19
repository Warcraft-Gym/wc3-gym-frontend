// The words the leagues and events pages show: what a league holds, what one run of it
// is, the state it is in, and how a stage plays. Lifted from the overnight admin branch.
import { DateTime } from 'luxon';

import { PHASE_LABEL } from './season-phase.mjs';

// A stored day, as a reader wants it; nothing shows a dash
export const dateText = (value) => (value ? DateTime.fromISO(value).toFormat('d LLL yyyy') : '—');

// A stored instant, read in the viewer's own zone
export const timeText = (value) => (value
  ? DateTime.fromISO(value, { zone: 'utc' }).toLocal().toFormat('d LLL yyyy, HH:mm')
  : '—');

// An event runs between two days, starts on one, or carries no dates at all; an event
// that starts and ends on the same day, a KOTH night among them, names that day once
export const dateRange = (event) => {
  if (event?.starts_at) return timeText(event.starts_at);
  const [start, end] = [event?.start_date, event?.end_date];
  if (start && end && start !== end) return `${dateText(start)} – ${dateText(end)}`;
  return start || end ? dateText(start || end) : '';
};

// The backend derives the state of an event from published, the signup and check-in
// windows and its series; nothing stores it
const EVENT_STATE_LABEL = {
  draft: 'Draft',
  signups_open: 'Signups open',
  checkin: 'Check-in',
  seeded: 'Seeded',
  running: 'Running',
  finished: 'Finished',
};
// A GNL season answers its own four phases, so the header names both vocabularies
export const STATE_LABEL = { ...EVENT_STATE_LABEL, ...PHASE_LABEL };
// A draft carries no colour: the neutral chip is the quiet one
export const STATE_COLOR = {
  signups_open: 'success',
  checkin: 'info',
  seeded: 'secondary',
  running: 'primary',
  finished: 'draw',
  open: 'success',
  commenced: 'primary',
  overdue: 'warning',
  complete: 'draw',
};
// The reads answer the state under `phase`
export const stateOf = (event) => event?.state ?? event?.phase ?? null;
// The events list filters on the model's own states, never on a GNL phase
export const STATE_ITEMS = Object.entries(EVENT_STATE_LABEL).map(([value, title]) => ({ value, title }));

export const LEAGUE_KINDS = [
  { value: 'gnl', title: 'GNL' },
  { value: 'koth', title: 'KOTH' },
  { value: 'custom', title: 'Custom' },
];

export const ENTRANT_KINDS = [
  { value: 'solo', title: 'Solo players' },
  { value: 'team', title: 'Pre-made teams' },
  { value: 'drafted_teams', title: 'Drafted teams' },
];

// Who may sign up for one event
export const SIGNUP_POLICIES = [
  { value: 'members', title: 'Discord members with an account' },
  { value: 'anyone', title: 'Anyone with a battle tag' },
];

export const EVENT_KINDS = [
  { value: 'gnl', title: 'GNL season' },
  { value: 'cup', title: 'Cup' },
  { value: 'koth', title: 'KOTH' },
  { value: 'signup', title: 'Signup only' },
];

export const FORMATS = [
  { value: 'round_robin', title: 'Round robin' },
  { value: 'single_elimination', title: 'Single elimination' },
  { value: 'double_elimination', title: 'Double elimination' },
  { value: 'swiss', title: 'Swiss' },
  { value: 'koth', title: 'KOTH' },
  { value: 'ffa', title: 'Free for all' },
];

// What ordered the seeds of a stage. Seeding from a qualifier reads the field of a parent
// event, which the engine does not build yet, so nothing offers that source.
export const SEED_SOURCES = [
  { value: 'mmr', title: 'MMR' },
  { value: 'manual', title: 'a manual seed order' },
  { value: 'random', title: 'a random draw' },
  { value: 'previous_stage', title: 'the previous stage' },
  { value: 'invitation', title: 'invitation' },
];

// The two series-per-round settings, named apart. The event's `series_per_round` counts the
// series one fixture holds, and a fixture pairs two team entrants, so it reads only on a team
// event. A stage's `series_per_entrant_per_round` counts the series one entrant plays in a
// round of a round robin, and every other format plays one.
export const SERIES_PER_FIXTURE = 'Series per fixture';
export const SERIES_PER_ENTRANT_PER_ROUND = 'Series each entrant plays per round';

// Only a round robin plays more than one series an entrant a round, and it plays at least
// one whatever the field holds, so a blank reads as one. Every other format answers null.
export const seriesPerEntrant = (stage) => (stage?.format === 'round_robin'
  ? Math.max(1, Number(stage.series_per_entrant_per_round) || 1)
  : null);

export const seriesPerFixture = (event) => (event?.entrant_kind === 'team'
  ? event.series_per_round ?? 1
  : null);

export const SCHEDULING_MODES = [
  { value: 'assigned', title: 'An admin sets the time' },
  { value: 'agreed', title: 'The two sides agree a time' },
  { value: 'immediate', title: 'Played straight away' },
];

// One rule per game of a series; a stage repeats its rule for every game of its best-of
export const MAP_RULES = [
  { value: 'veto', title: 'Veto' },
  { value: 'loser', title: 'Loser picks' },
  { value: 'host', title: 'Host picks' },
  { value: 'fixed', title: 'Fixed map' },
];

// The zone a round of an event ends at midnight in; the first item clears the setting
// A round of an event that names no zone ends at midnight where the reader is
export const NO_ROUND_END_ZONE = "Each reader's own zone";
export const ROUND_END_ZONES = [
  { value: '', title: NO_ROUND_END_ZONE },
  ...Intl.supportedValuesOf('timeZone').map((value) => ({ value, title: value })),
];

// The word for a stored value, or the value itself when the list does not name it
export const titleOf = (items, value) => items.find((item) => item.value === value)?.title || value || '—';

// A blank text field is no value at all, and a blank number field is not a zero
export const text = (value) => (value ? String(value).trim() : '') || null;

// The body POST and PUT /leagues take
export const leaguePayload = (form) => ({
  name: (form.name || '').trim(),
  short_name: text(form.short_name),
  kind: form.kind,
  entrant_kind: form.entrant_kind,
  page_url: text(form.page_url),
});

// How an event is named anywhere outside its own page: the league, a middle dot, the
// name — "GNL · Season 18" — and the name alone when the event carries no league or
// already opens with the league's short name ("GNL S18"). A wide screen reads the long
// league name, "Gym Newbie League · Season 18"; a phone keeps the short one. The reads
// answer the league under `league_short_name` and `league_name`; a page that loaded the
// league row passes it instead. Rows that carry a flat event name, the trophies and the
// head-to-head meetings, say `season_name`.
// ponytail: the width is read per call, not watched; a resize across 960px shows on the next render
const wide = () => (typeof window === 'undefined' ? false : window.matchMedia('(min-width: 960px)').matches);
export const eventLabel = (event, league = null, { long = wide() } = {}) => {
  const name = String(event?.name ?? event?.season_name ?? '');
  const short = String(league?.short_name || league?.name || event?.league_short_name || '');
  const full = String(league?.name || event?.league_name || '');
  const prefix = (long && full) || short;
  if (!prefix) return name;
  if (!name) return prefix;
  return name.toLowerCase().startsWith(short.toLowerCase()) ? name : `${prefix} · ${name}`;
};
