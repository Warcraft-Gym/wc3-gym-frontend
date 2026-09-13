// The words the leagues and events pages show: what a league holds, what one run of it
// is, the state it is in, and how a stage plays. Lifted from the overnight admin branch.
import { DateTime } from 'luxon';

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

// The league word a header puts before an event name, empty when the name already opens
// with it: "GNL · Season 18" but plain "GNL S18"
export const leaguePrefix = (event, league) => {
  const name = (event?.name || '').toLowerCase();
  const opens = (word) => !!word && name.startsWith(String(word).toLowerCase());
  if (opens(league?.short_name) || opens(league?.name)) return '';
  return league?.short_name || league?.name || '';
};
