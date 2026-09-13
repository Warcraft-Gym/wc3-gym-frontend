// The words the leagues and events pages show: what a league holds, what one run of it
// is, the state it is in, and how a stage plays. Lifted from the overnight admin branch.
import { DateTime } from 'luxon';

import { dayIso } from './date-input.mjs';
import { storedUtc } from './timezone.mjs';

// A stored day, as a reader wants it; nothing shows a dash
export const dateText = (value) => (value ? DateTime.fromISO(value).toFormat('d LLL yyyy') : '—');

// A stored instant, read in the viewer's own zone
export const timeText = (value) => (value
  ? DateTime.fromISO(value, { zone: 'utc' }).toLocal().toFormat('d LLL yyyy, HH:mm')
  : '—');

// An event runs between two days, starts on one, or carries no dates at all
export const dateRange = (event) => {
  if (event?.starts_at) return timeText(event.starts_at);
  const [start, end] = [event?.start_date, event?.end_date];
  if (start && end) return `${dateText(start)} – ${dateText(end)}`;
  return start || end ? dateText(start || end) : '';
};

// The backend derives the state of an event from published, the signup and check-in
// windows and its series; nothing stores it
export const STATE_LABEL = {
  draft: 'Draft',
  signups_open: 'Signups open',
  checkin: 'Check-in',
  seeded: 'Seeded',
  running: 'Running',
  finished: 'Finished',
};
// A draft carries no colour: the neutral chip is the quiet one
export const STATE_COLOR = {
  signups_open: 'success',
  checkin: 'info',
  seeded: 'secondary',
  running: 'primary',
  finished: 'draw',
};
// The reads answer the state under `phase`
export const stateOf = (event) => event?.state ?? event?.phase ?? null;
export const STATE_ITEMS = Object.entries(STATE_LABEL).map(([value, title]) => ({ value, title }));

export const LEAGUE_KINDS = [
  { value: 'gnl', title: 'GNL' },
  { value: 'koth', title: 'KOTH' },
  { value: 'custom', title: 'Custom' },
];

export const ENTRANT_KINDS = [
  { value: 'solo', title: 'Solo players' },
  { value: 'drafted_teams', title: 'Drafted teams' },
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

export const SCHEDULING_MODES = [
  { value: 'assigned', title: 'An admin sets the time' },
  { value: 'agreed', title: 'The two sides agree a time' },
  { value: 'immediate', title: 'Played straight away' },
];

// The word for a stored value, or the value itself when the list does not name it
export const titleOf = (items, value) => items.find((item) => item.value === value)?.title || value || '—';

// A blank text field is no value at all, and a blank number field is not a zero
const text = (value) => (value ? String(value).trim() : '') || null;

// The body POST and PUT /leagues take
export const leaguePayload = (form) => ({
  name: (form.name || '').trim(),
  short_name: text(form.short_name),
  kind: form.kind,
  entrant_kind: form.entrant_kind,
  page_url: text(form.page_url),
});

// The body POST and PUT /events take. The pickers hand over Dates and "HH:mm" typed in
// the viewer's zone, so a start time is stored as the UTC instant it names.
export const eventPayload = (form) => ({
  league_id: form.league_id ?? null,
  name: (form.name || '').trim(),
  kind: form.kind,
  description: text(form.description),
  start_date: form.start_date ? dayIso(form.start_date) : null,
  end_date: form.end_date ? dayIso(form.end_date) : null,
  starts_at: form.start_date && form.start_time ? storedUtc(form.start_date, form.start_time) : null,
  page_url: text(form.page_url),
  stream_url: text(form.stream_url),
  checkin_enabled: !!form.checkin_enabled,
});
