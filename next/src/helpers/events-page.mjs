// The Events page: the kind a reader filters on, the three groups the events fall in, and the
// one organizer card a session sees. The backend derives every event's phase; nothing here
// stores one.

// Cups lead, because they are what a member joins from this page; the other kinds have homes
// of their own and read here too
export const KIND_FILTERS = [
  { value: 'cup', title: 'Cups' },
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

/** How full a cup is, as the card's bar and its words read it; no cap reads the count alone. */
export function fill(event) {
  const count = event?.entrant_count ?? 0;
  const cap = event?.entrant_cap ?? null;
  return {
    count,
    label: cap ? `${count} / ${cap}` : `${count} signed up`,
    percent: cap ? Math.min(100, Math.round((count / cap) * 100)) : null,
  };
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
 *  no-shows a runner may remove before the draw, and whether the draw would fall short of
 *  the event's minimum. The draw seats every entrant that has not withdrawn, so a no-show
 *  still counts until a runner removes them. */
export function eveningOf(event, entrants) {
  const live = (entrants || []).filter((row) => !row.withdrawn_at);
  const checkedIn = live.filter((row) => row.checked_in_at);
  const noShows = event?.checkin_enabled ? live.filter((row) => !row.checked_in_at) : [];
  const min = event?.entrant_min ?? null;
  return {
    live: live.length,
    checkedIn: checkedIn.length,
    noShows,
    min,
    belowMin: min !== null && live.length < min,
    // what the draw would hold once the no-shows go
    afterNoShows: live.length - noShows.length,
  };
}

/** What a player needs to sign up, as the event page states it: one line per rule, or none
 *  for an event that names no bounds and checks nothing. An event that does not check only
 *  warns, so its bounds read as what the organizers look at. */
export function eligibilityLines(event) {
  const lines = [];
  const [low, high] = [event?.mmr_min ?? null, event?.mmr_max ?? null];
  if (event?.eligibility_required) {
    lines.push(event.bnet_required
      ? 'A battle tag linked to Battle.net, rated by W3Champions on the race you sign up with'
      : 'A battle tag W3Champions rates on the race you sign up with');
  }
  if (low !== null && high !== null) lines.push(`MMR from ${low} to ${high} on that race`);
  else if (low !== null) lines.push(`MMR ${low} or more on that race`);
  else if (high !== null) lines.push(`MMR up to ${high} on that race`);
  if (event?.min_games) lines.push(`At least ${event.min_games} games on that race recently`);
  return lines;
}
