// The Events page: the kind a reader filters on, the three groups the events fall in, and the
// one organizer card a session sees. The backend derives every event's phase; nothing here
// stores one.
import { dayDate, dayIso } from './date-input.mjs';
import { pickerParts, storedUtc, viewerZone } from './timezone.mjs';

// Cups lead, because they are what a member joins from this page; the other kinds have homes
// of their own and read here too
export const KIND_FILTERS = [
  { value: 'cup', title: 'Cups' },
  // the rules cups repeat on, in place of the events
  { value: 'recurring', title: 'Recurring cups' },
  { value: 'koth', title: 'KOTH nights' },
  { value: 'gnl', title: 'GNL seasons' },
  { value: 'all', title: 'All' },
];

const startOf = (event) => event?.starts_at || event?.start_date || null;

/** Live, upcoming and past, for one kind or every kind. A running event is live, a finished
 *  one is past and every other phase, a draft among them, is still to come. Upcoming reads
 *  soonest first with the undated last; live and past read newest first. */
export function groupEvents(events, kind = 'all') {
  const rows = (events || []).filter((event) => kind === 'all' || event.kind === kind);
  const byStartAsc = (a, b) => {
    const [x, y] = [startOf(a), startOf(b)];
    if (x && y) return x < y ? -1 : x > y ? 1 : b.id - a.id;
    return x ? -1 : y ? 1 : b.id - a.id;
  };
  const byNewest = (a, b) => {
    const [x, y] = [startOf(a), startOf(b)];
    if (x && y && x !== y) return x < y ? 1 : -1;
    return b.id - a.id;
  };
  return {
    live: rows.filter((event) => event.phase === 'running').sort(byNewest),
    upcoming: rows.filter((event) => event.phase !== 'running' && event.phase !== 'finished').sort(byStartAsc),
    past: rows.filter((event) => event.phase === 'finished').sort(byNewest),
  };
}

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

/** Whether a signup now lands on the waitlist: the cup is drawn, or it holds as many as it takes.
 *  A cup played over rounds takes a late player for its later rounds, so only its cap counts.
 *  @param {any} event @param {any[]} entrants @param {boolean} drawn */
export function joinsWaitlist(event, entrants = [], drawn = false) {
  if (event?.kind !== 'cup') return false;
  if (drawn && !(event.cup_legs || []).length) return true;
  return event.entrant_cap != null && eveningOf(event, entrants).live >= event.entrant_cap;
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
