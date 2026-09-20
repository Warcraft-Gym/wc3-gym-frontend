// The pure parts of the home hub: the panel order, the signup chip, the member's two series, the captain row.
import { DateTime } from 'luxon';
import { record } from './figures.mjs';
import { isUnscored } from './season-phase.mjs';

// One order per panel drives both layouts: the phone stack and the panels inside each desktop column.
const WITH_SERIES = { own: 1, next: 2, signup: 3, board: 4, cast: 5 };
const NO_SERIES = { signup: 1, board: 2, own: 3, next: 4, cast: 5 };

/** The CSS order of each panel. A member with no series of his own reads the open signups first.
 *  @param {boolean} hasSeries */
export const panelOrder = (hasSeries) => (hasSeries ? WITH_SERIES : NO_SERIES);

/** The chip on a signup that closes inside two days; null further out and with no close time.
 *  @param {string|null|undefined} closesAt @param {*} [now] */
export const closesIn = (closesAt, now = DateTime.now()) => {
  const at = closesAt ? DateTime.fromISO(closesAt, { zone: 'utc' }) : null;
  if (!at?.isValid) return null;
  const days = at.setZone(now.zone).startOf('day').diff(now.startOf('day'), 'days').days;
  if (days < 0 || days > 2) return null;
  return ['closes today', 'closes tomorrow', 'closes in 2 days'][days];
};

/** The events the member may still enter, leave or check in to, in the order they close; a row with
 *  no close time reads in the order the event starts, which is every row the member read sends today.
 *  @param {any[]} [rows] the GET /me/events rows */
export const openSignups = (rows = []) => rows
  .filter((row) => row.action === 'sign_up' || row.action === 'check_in' || (row.action === 'withdraw' && row.signups_open))
  .sort((a, b) => String(a.signup_end ?? a.start ?? '9999').localeCompare(String(b.signup_end ?? b.start ?? '9999')));

// A round orders the member's series; a booked time breaks the ties inside one round
const seriesKey = (series) => [series.match?.playday ?? 0, series.date_time ?? ''];
const byRound = (a, b) => {
  const [roundA, timeA] = seriesKey(a);
  const [roundB, timeB] = seriesKey(b);
  return roundA - roundB || String(timeA).localeCompare(String(timeB));
};

/** The member's own next series and last result out of one season's series.
 *  @param {any[]} [series] @param {number|null} [playerId] */
export const ownSeries = (series = [], playerId = null) => {
  const mine = series.filter((row) => [row.player1_id, row.player2_id].includes(playerId));
  const open = mine.filter(isUnscored).sort(byRound);
  const played = mine.filter((row) => !isUnscored(row)).sort(byRound);
  return { next: open[0] ?? null, last: played[played.length - 1] ?? null };
};

/** The score of a played series read from one player's side: his own score first, whether he won,
 *  and the sentence a screen reader gets. Null while the series carries no result.
 *  @param {any} series @param {number|null} [playerId] */
export const ownScore = (series, playerId = null) => {
  if (!series || isUnscored(series)) return null;
  const mine = series.player1_id === playerId;
  const my = (mine ? series.player1_score : series.player2_score) ?? 0;
  const theirs = (mine ? series.player2_score : series.player1_score) ?? 0;
  const text = record(my, theirs) ?? `${my} – ${theirs}`;
  const word = my > theirs ? 'Won' : my < theirs ? 'Lost' : 'Drew';
  return { text, won: my > theirs, lost: my < theirs, label: `${word} ${text}` };
};

/** The fixture row a captain still has to draft: when its round runs, how much of it is drafted,
 *  and the page that drafts it. Null for an event that hands in no fixture.
 *  @param {any} fixture the captain_fixture of a GET /me/events row @param {*} [today] */
export const captainRow = (fixture, today = DateTime.now()) => {
  if (!fixture) return null;
  const start = fixture.round_start ? DateTime.fromISO(fixture.round_start) : null;
  const ahead = start?.isValid && start.startOf('day') > today.startOf('day');
  const drafted = fixture.drafted ?? 0;
  return {
    when: ahead ? `Round ${fixture.playday} opens ${start.toFormat('ccc d LLL')}` : `Round ${fixture.playday}`,
    drafted: drafted ? `${drafted} of ${fixture.series_per_round} pairings drafted` : 'No pairing drafted yet',
    to: `/match/${fixture.match_id}`,
  };
};

/** Where a GET /home/series row sits: "GNL - Season 19 - Group stage - Round 3". A part the row
 *  leaves out takes no separator, and an event name that opens with its league says it once.
 *  @param {any} row */
export const rowContext = (row) => {
  const event = String(row?.event ?? '');
  const league = row?.league && !event.toLowerCase().startsWith(String(row.league).toLowerCase()) ? row.league : null;
  return [league, row?.event, row?.stage, row?.round].filter(Boolean).join(' - ');
};
