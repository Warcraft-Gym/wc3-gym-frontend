import { DateTime } from 'luxon';
import { dateRange, eventLabel, STATE_COLOR, STATE_LABEL } from './event-labels.mjs';
import { seasonSlug } from './season-slug.mjs';
import { currentRound, roundLabel } from './rounds.mjs';
import { myProfilePath } from './players.mjs';

// What a player can do with a season: sign up, ask an admin, or nothing; an absent signups_open reads as open
export function seasonAction(season) {
  const action = { open: 'signup', commenced: 'request', overdue: 'request' }[season?.phase] ?? null;
  return action === 'signup' && season.signups_open === false ? 'request' : action;
}

// The links under a season card; a season the player is not in carries the two open reads only
function seasonLinks(season, slug) {
  const report = { title: 'Season report', icon: 'mdi-trophy-outline', to: `/report/${slug}` };
  const players = { title: 'Players', icon: 'mdi-account-multiple', to: `/players?season=${slug}` };
  if (!season.signed_up) return [report, players];
  return [
    season.team && { title: season.team.name, icon: 'mdi-shield-account', to: `/team/${season.team.id}` },
    report,
    { title: 'Upcoming series', icon: 'mdi-calendar-clock', to: '/upcoming' },
    { title: 'Ladder', icon: 'mdi-chart-line', to: `/ladder?season=${slug}` },
    players,
    { title: 'My fantasy team', icon: 'mdi-cards-playing-outline', to: `/fantasy-registration?season=${slug}` },
    season.scheduling_enabled && { title: 'Availability', icon: 'mdi-calendar-month', to: '/availability' },
  ].filter(Boolean);
}

// A player who says he is not interested in a KOTH night keeps that answer past a logout,
// so the key stays out of SESSION_KEYS.
const dismissKey = (id) => `kothDismissed:${id}`;

export function kothDismissed(id, store = globalThis.localStorage) {
  try {
    return store.getItem(dismissKey(id)) !== null;
  } catch {
    return false;  // a browser with storage blocked keeps showing the card
  }
}

export function dismissKoth(id, store = globalThis.localStorage) {
  try {
    store.setItem(dismissKey(id), '1');
  } catch {
    // a browser with storage blocked keeps showing the card
  }
}

// The KOTH nights still to come, soonest first, the ones the player waved off left out
export function kothCards({ kothEvents = [], now = new Date(), store = globalThis.localStorage }) {
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);  // the player's own midnight, so a KOTH night under way today stays
  return kothEvents
    .filter((event) => event.is_active && new Date(event.event_date) >= today && !kothDismissed(event.id, store))
    .map((event) => {
      const date = new Date(event.event_date);
      return {
        key: `koth:${event.id}`,
        kind: 'koth',
        id: event.id,
        name: eventLabel(event),
        date,
        status: `King of the Hill · ${date.toLocaleString(undefined, { weekday: 'short', hour: '2-digit', minute: '2-digit' })}`,
        chips: [],
        action: 'signup',
        joined: null,  // the KOTH signups carry no own-row key
        primary: { title: 'Sign up', to: '/koth/dashboard', variant: 'elevated' },
        links: [],
      };
    })
    .sort((a, b) => a.date - b.date);
}

// The line under an event name: the round in play for a GNL player who is in, the
// check-in that stands open, else the days the event runs
function eventStatus(row, season, round) {
  if (round) return `Round ${round.playday} of ${season.round_count ?? season.rounds?.length ?? '?'} · ${roundLabel(round)}`;
  if (row.checkin_open) {
    return row.next_round ? `Check-in is open for round ${row.next_round.number}` : 'Check-in is open';
  }
  return dateRange({ start_date: row.start, end_date: row.end });
}

// The one thing a card offers. A GNL season keeps its own signup form and its own
// pages, so its button is a link; every other kind carries the action word the home
// acts on in place, and `view` opens the event page.
function eventPrimary(row, me, slug) {
  if (row.kind === 'gnl') {
    if (row.joined) return { title: 'Your series', to: myProfilePath(me), variant: 'elevated' };
    // the token admin holds no Discord account, so it cannot sign up
    if (me?.superadmin) return null;
    return row.action === 'sign_up'
      ? { title: 'Sign up', to: `/signup?season=${slug}`, variant: 'elevated' }
      : { title: 'Ask to join', to: `/signup?season=${slug}`, variant: 'outlined' };
  }
  const button = eventActionButton(row.action);
  if (!button) return null;
  return {
    title: button.text,
    icon: button.icon,
    color: button.color,
    variant: button.variant,
    ...(row.action === 'view' ? { to: `/events/${row.id}` } : { act: row.action }),
  };
}

// One card per event GET /me/events answers, of any kind, with the KOTH nights still
// to come. A finished event is not upcoming, so it stays off the home. The /seasons row
// of the same id adds the rounds and the round count a GNL card reads, and the /me entry
// adds the team and the captain seat, which the member read does not carry.
export function homeCards({ events = [], me = null, seasons = [], kothEvents = [], now = new Date() }) {
  const clock = DateTime.fromJSDate(new Date(now));
  const cards = events.filter((row) => row.phase !== 'finished').map((row) => {
    const gnl = row.kind === 'gnl';
    const entry = (me?.seasons ?? []).find((mine) => mine.id === row.id) ?? {};
    const season = { ...seasons.find((known) => known.id === row.id), ...entry, signed_up: row.joined };
    const slug = gnl ? seasonSlug(row) : null;
    const round = gnl && row.joined ? currentRound(season.rounds ?? [], clock) : null;
    return {
      key: `event:${row.id}`,
      kind: row.kind,
      id: row.id,
      zone: 'UTC',  // the dates are calendar days, so the date tile must not shift them
      name: eventLabel(row),
      date: row.start ? new Date(`${row.start}T00:00:00Z`) : null,
      status: eventStatus(row, season, round),
      chips: [
        STATE_LABEL[row.phase] && { title: STATE_LABEL[row.phase], color: STATE_COLOR[row.phase] },
        row.checked_in_at
          ? { title: 'Checked in', color: 'success', icon: 'mdi-check' }
          : row.joined && { title: 'Signed up', color: 'success', icon: 'mdi-check' },
        gnl && entry.captain && season.team && { title: `Captain · ${season.team.name}`, color: 'primary', icon: 'mdi-shield-star' },
      ].filter(Boolean),
      action: row.action,
      joined: row.joined,
      primary: eventPrimary(row, me, slug),
      links: gnl ? seasonLinks(season, slug) : [{ title: 'Event page', icon: 'mdi-tournament', to: `/events/${row.id}` }],
      slug,
    };
  });
  // One list in date order, the KOTH nights among the rest: the date tile leads every
  // card, so a running event sits above a later one and an event without a start falls last.
  const start = (card) => card.date?.getTime() ?? Number.MAX_SAFE_INTEGER;
  return [...cards, ...kothCards({ kothEvents, now })].sort((a, b) => start(a) - start(b));
}

// The rows the landing popup offers: open signups the player has not taken, each with its own button
export const joinableEvents = (rows) => rows.filter((row) => row.action === 'sign_up' && row.joined === false && row.primary);

// The one button an event page offers a member, from the action word /me/events answers.
// `checked_in` reads as a chip and `closed` offers nothing, so both answer null.
const ACTION_BUTTON = {
  sign_up: { text: 'Sign up', icon: 'mdi-account-plus', color: 'primary', variant: 'elevated' },
  withdraw: { text: 'Withdraw', icon: 'mdi-account-remove', color: 'error', variant: 'outlined' },
  check_in: { text: 'Check in', icon: 'mdi-check', color: 'success', variant: 'elevated' },
  view: { text: 'View the stage', icon: 'mdi-tournament', color: 'primary', variant: 'outlined' },
};

export const eventActionButton = (action) => ACTION_BUTTON[action] ?? null;

// A viewer who says he wants no results keeps that answer past a logout, so the key
// stays out of SESSION_KEYS. One key for the whole app: the switch is the viewer's.
const HIDE_RESULTS_KEY = 'hideResults';

// The Vue provide key the stage drawing reads the switch through
export const HIDE_RESULTS = 'hideResults';

export function hideResultsStored(store = globalThis.localStorage) {
  try {
    return store.getItem(HIDE_RESULTS_KEY) === '1';
  } catch {
    return false;  // a browser with storage blocked shows the results
  }
}

export function storeHideResults(on, store = globalThis.localStorage) {
  try {
    if (on) store.setItem(HIDE_RESULTS_KEY, '1');
    else store.removeItem(HIDE_RESULTS_KEY);
  } catch {
    // a browser with storage blocked forgets the choice on the next load
  }
}
