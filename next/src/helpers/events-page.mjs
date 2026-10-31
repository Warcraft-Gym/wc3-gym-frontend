// The Events page: the two groups the events fall in, the counts an organizer reads of their own
// cups, and the one organizer card a session sees. The backend derives every event's phase;
// nothing here stores one.
import { dayDate, dayIso } from './date-input.mjs';
import { pickerParts, storedUtc, viewerZone } from './timezone.mjs';

const startOf = (event) => event?.starts_at || event?.start_date || null;

// Two events starting together read the one further along first: running, check-in, sign-ups,
// seeded, and a draft last
const UPCOMING_ORDER = { running: 0, checkin: 1, signups_open: 2, seeded: 3, draft: 4 };
const statusRank = (event) => UPCOMING_ORDER[event?.phase] ?? 5;

/** Upcoming and past, cups only: GNL seasons, sign-up lists and KOTH nights have pages of their
 *  own. A finished cup is past and every other phase is upcoming, a running one and a draft
 *  among them. Upcoming reads the running cups first, then soonest first and by status at one
 *  start, the undated last; past reads newest first. */
export function groupEvents(events) {
  const rows = (events || []).filter((event) => event.kind === 'cup');
  const running = (event) => (event.phase === 'running' ? 0 : 1);
  const byStartAsc = (a, b) => {
    if (running(a) !== running(b)) return running(a) - running(b);
    const [x, y] = [startOf(a), startOf(b)];
    if (x && y && x !== y) return x < y ? -1 : 1;
    if (!x !== !y) return x ? -1 : 1;
    return statusRank(a) - statusRank(b) || b.id - a.id;
  };
  const byNewest = (a, b) => {
    const [x, y] = [startOf(a), startOf(b)];
    if (x && y && x !== y) return x < y ? 1 : -1;
    return b.id - a.id;
  };
  return {
    upcoming: rows.filter((event) => event.phase !== 'finished').sort(byStartAsc),
    past: rows.filter((event) => event.phase === 'finished').sort(byNewest),
  };
}

/** The players in a cup the organizer runs, "12 / 16" against its cap, else "12".
 *  @param {any} event a GET /me/organized-events row */
export const signedUpText = (event) => {
  const count = Number(event?.entrant_count) || 0;
  return event?.entrant_cap ? `${count} / ${event.entrant_cap}` : String(count);
};

/** Which organizer card the page shows: `organizer` (Your cups and Create cup), `pending` (the
 *  request waits for an admin), `ask` (a member may ask), or null for a guest or no session. */
export function organizerCard(me) {
  if (!me || me.role === 'guest') return null;
  if (me.role === 'admin' || me.organizer) return 'organizer';
  return me.organizer_request === 'pending' ? 'pending' : 'ask';
}

/** Whether the session runs the event: an admin always, or a member or captain acting as
 *  itself whom the event's organizer list names. A viewed role holds no organizer rights. */
export function runsEvent(me, organizers) {
  if (!me) return false;
  if (me.role === 'admin') return true;
  if (!['member', 'captain'].includes(me.role) || (me.actual_role && me.actual_role !== me.role)) return false;
  return (organizers || []).some((row) => String(row.discord_id) === String(me.discord_id));
}

/** The evening's count on the run page: the entrants still in, how many checked in, the
 *  no-shows a runner may remove before the draw, how many the draw seats and whether that
 *  falls short of the event's minimum. As app/services/cup_engine.py draws, a cup that takes
 *  check-in seats the entrants who checked in, so while its window stands open the count is
 *  the check-ins (`byCheckIn`); before the window and on any other cup it is every entrant still in. */
export function eveningOf(event, entrants) {
  // a signup on the waitlist stands in no field until a runner lets it in
  const live = (entrants || []).filter((row) => !row.withdrawn_at && !row.waitlisted_at);
  const checkedIn = live.filter((row) => row.checked_in_at);
  const noShows = event?.checkin_enabled ? live.filter((row) => !row.checked_in_at) : [];
  const byCheckIn = !!(event?.checkin_enabled && event?.checkin_open);
  const seated = byCheckIn ? checkedIn.length : live.length;
  const min = event?.entrant_min ?? null;
  return {
    live: live.length,
    checkedIn: checkedIn.length,
    noShows,
    seated,
    byCheckIn,
    min,
    belowMin: min !== null && seated < min,
  };
}

/** The cup's waitlist, first come first: every signup that waits and has not withdrawn.
 *  @param {any[]} entrants */
export const waitlistOf = (entrants = []) =>
  entrants.filter((row) => row.waitlisted_at && !row.withdrawn_at).sort((a, b) => String(a.waitlisted_at).localeCompare(String(b.waitlisted_at)));

/** How many of a cup's line are in, as app/services/cup_waitlist.py counts them: no cap takes
 *  everyone, one field takes up to its cap, and a cup with divisions, whose cap is one division,
 *  takes its first division as it fills and then every division its line fills completely.
 *  @param {number} total @param {number | null | undefined} cap @param {boolean} divisions */
export function linePlaces(total, cap, divisions) {
  if (cap == null || cap < 1 || total <= cap) return total;
  return divisions ? Math.floor(total / cap) * cap : cap;
}

// A cup's line: every entrant that has not withdrawn, the waitlist included
const lineLength = (entrants = []) => (entrants || []).filter((row) => !row.withdrawn_at).length;

/** Whether a signup now lands on the waitlist: a cup played on one evening is drawn, or the
 *  places of its line do not reach the end of it. A cup played over rounds takes a late player
 *  for its later rounds, so only its places count. A signup that fills a division comes in.
 *  @param {any} event @param {any[]} entrants @param {boolean} drawn */
export function joinsWaitlist(event, entrants = [], drawn = false) {
  if (event?.kind !== 'cup') return false;
  if (drawn && !(event.cup_legs || []).length) return true;
  const total = lineLength(entrants) + 1;
  return linePlaces(total, event.entrant_cap ?? null, !!event.uses_divisions) < total;
}

/** What a player on a cup's waitlist reads: when they come in by themselves, that they check in
 *  as usual so an organizer can add them in the place of one who does not show, and that the
 *  organizers decide in the end. A cup played on one evening is set once drawn, so its organizers
 *  swap a waiting player in.
 *  @param {any} event @param {any[]} entrants @param {boolean} drawn */
export function waitlistNote(event, entrants = [], drawn = false) {
  const last = 'The organizers make the final call on who plays.';
  const who = event?.team_size ? 'teams' : 'players';
  if (drawn && !(event?.cup_legs || []).length) {
    return `You are on the waitlist. The bracket is drawn, so an organizer swaps you in when a place opens. ${last}`;
  }
  const cap = event?.entrant_cap ?? null;
  if (event?.uses_divisions && cap) {
    const total = lineLength(entrants);
    const more = cap - (total - linePlaces(total, cap, true));
    const opens = more > 0 && more < cap ? `the next one opens once ${more} more ${more === 1 ? (event?.team_size ? 'team signs' : 'player signs') : `${who} sign`} up` : 'the next one opens once it fills';
    return `You are on the waitlist. Each division takes ${cap} ${who}, and ${opens}. Then everyone waiting moves into the cup by themselves. Check in as usual, so the organizers can add you if a place frees up. ${last}`;
  }
  return `You are on the waitlist. The first place that frees up goes to the first in line. Check in as usual, so the organizers can add you if someone does not check in. ${last}`;
}

/** What a player needs to sign up, as the event page states it: one line per rule, or none
 *  for an event that names no bounds and checks nothing. An event that does not check only
 *  warns, so its bounds read as what the organizers look at. */
export function eligibilityLines(event) {
  const lines = [];
  const [low, high] = [event?.mmr_min ?? null, event?.mmr_max ?? null];
  // An event that counts a race by its lifetime games rates the best of the races played
  const counted = event?.race_games_min ?? null;
  if (event?.bnet_required) lines.push('A battle tag verified with Battle.net');
  if (counted !== null) {
    if (event?.eligibility_required) {
      lines.push('A battle tag W3Champions rates');
    }
    const races = `of the races with ${counted} games or more`;
    if (low !== null && high !== null) lines.push(`Highest MMR ${races} from ${low} to ${high}`);
    else if (low !== null) lines.push(`Highest MMR ${races} ${low} or more`);
    else if (high !== null) lines.push(`Highest MMR ${races} up to ${high}`);
    else if (event?.eligibility_required) lines.push(`At least ${counted} games on one race`);
    if (event?.min_games) lines.push(`At least ${event.min_games} games recently, over all races`);
    return lines;
  }
  if (event?.eligibility_required) {
    lines.push('A battle tag W3Champions rates on the race you sign up with');
  }
  if (low !== null && high !== null) lines.push(`MMR from ${low} to ${high} on that race`);
  else if (low !== null) lines.push(`MMR ${low} or more on that race`);
  else if (high !== null) lines.push(`MMR up to ${high} on that race`);
  if (event?.min_games) lines.push(`At least ${event.min_games} games on that race recently`);
  return lines;
}

/** The Move the start dialog's day and time: the stored start read in the zone, or the
 *  stored day and no time for a cup that has no start time. */
export function moveStartForm(event, zone = viewerZone()) {
  if (event?.starts_at) return pickerParts(event.starts_at, zone);
  return { date: dayDate(event?.start_date), time: '' };
}

/** The fields Move the start writes. No end date, since a cup ends on its finish or its last
 *  result; with no time picked, the new day keeps the stored time of day. */
export function moveStartBody(event, day, time, zone = viewerZone()) {
  const date = day instanceof Date ? day : dayDate(day);
  const at = time || (event?.starts_at ? pickerParts(event.starts_at, zone).time : '');
  return {
    start_date: date ? dayIso(date) : null,
    end_date: null,
    starts_at: date && at ? storedUtc(date, at, zone) : null,
  };
}
