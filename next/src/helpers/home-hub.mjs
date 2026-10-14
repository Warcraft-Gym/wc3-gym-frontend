// The pure parts of the home hub: the panel order, the member's season and rounds, the captain row, and the events side.
import { DateTime } from 'luxon';
import { record } from './figures.mjs';
import { local, timeMissing } from './schedule.mjs';
import { rulesOf } from './map-order.mjs';
import { isUnscored } from './season-phase.mjs';
import { isLobby } from './stage-view.mjs';

/** The CSS order of each Home panel. One order drives both layouts: the phone stack, and the panels
 *  inside each desktop column, where the GNL panels stand on the left and the events on the right.
 *  On a phone the member's own season and own events come first, then what is coming up. */
export const PANEL_ORDER = { games: 1, mine: 2, next: 3, upcoming: 4, fantasy: 5 };

// The kinds of event the events side lists; a GNL season sits in My Season, a KOTH night on its own page
const EVENT_KINDS = ['cup', 'signup'];

// A start that sorts an event with no date last
const startKey = (value) => String(value ?? '9999');

/** The format an event row names in one short chip: "2v2 cup", "FFA, teams of 2", "Custom game, 1v1".
 *  A sign-up list plays nothing, and every other kind names no format.
 *  @param {any} row a GET /me/events row, or an event */
export const formatChip = (row) => {
  if (row?.kind === 'signup') return 'Sign-up list';
  if (row?.kind !== 'cup') return null;
  const size = Number(row.team_size) || 1;
  const lobby = size > 1 ? `FFA, teams of ${size}` : 'FFA, solo';
  if (row.custom_game) return `Custom game, ${row.ffa ? lobby : `${size}v${size}`}`;
  return row.ffa ? lobby : `${size}v${size} cup`;
};

/** The cups and sign-up lists the member may still enter, soonest first. One the member joined or
 *  is invited to is in My events instead. One they run stays here until they sign up for it, since
 *  an organizer may play their own cup; My events lists it too, for the run page.
 *  @param {any[]} [rows] the GET /me/events rows @param {any[]} [cards] the cards of myEventCards */
export const upcomingEvents = (rows = [], cards = []) => {
  const skip = new Set(cards.filter((card) => card.row || card.invite).map((card) => Number(card.id)));
  return rows
    .filter((row) => EVENT_KINDS.includes(row.kind) && row.action === 'sign_up' && !row.joined && !skip.has(Number(row.id)))
    .sort((a, b) => startKey(a.start).localeCompare(startKey(b.start)));
};

/** The member's own events, one card each: the cups and lists they play in, alone or in a cup team,
 *  the cups whose team invited them, and the events they run. Each card carries the matches and
 *  lobbies still to play, the check-in and the invite, and the link in: the player's page, or the
 *  run page for an organizer. A card with something to do comes first, then the soonest.
 *  @param {{ events?: any[], organized?: any[], invites?: any[], series?: any[] }} sources
 *    the GET /me/events, /me/organized-events, /me/team-invites and /me/cup-series answers */
export const myEventCards = ({ events = [], organized = [], invites = [], series = [] } = {}) => {
  const cards = new Map();
  const card = (id, fields) => {
    const key = Number(id);
    const known = cards.get(key) ?? { id: key, name: null, kind: null, start: null, row: null, organizer: false, invite: null, series: [] };
    cards.set(key, { ...known, ...Object.fromEntries(Object.entries(fields).filter(([, value]) => value != null)) });
  };
  for (const row of events) {
    if (row.kind === 'gnl' || !row.joined || row.phase === 'finished') continue;
    card(row.id, { name: row.name, kind: row.kind, start: row.start, row });
  }
  for (const event of organized) {
    if (event.state === 'finished' || event.phase === 'finished' || event.state === 'closed') continue;
    card(event.id, { name: event.name, kind: event.kind, start: event.starts_at ?? event.start_date ?? null, organizer: true, draft: event.published === false });
  }
  for (const invite of invites) {
    // a player who already plays the cup in a team reads that team, not the invite
    if (cards.get(Number(invite.event_id))?.row?.cup_team) continue;
    card(invite.event_id, { name: invite.event_name, invite });
  }
  for (const one of series) {
    card(one.event_id, { name: one.event_name });
    cards.get(Number(one.event_id)).series.push(one);
  }
  const todo = (one) => one.series.length > 0 || !!one.invite || one.row?.action === 'check_in';
  // a cup team that waits for invited players: how many accepted, of the team size
  const waiting = (row) => {
    const size = Number(row?.team_size) || 0;
    const players = row?.cup_team?.players ?? size;
    return size && players < size ? { players, size } : null;
  };
  return [...cards.values()]
    .map((one) => {
      const row = one.row ?? events.find((event) => Number(event.id) === one.id) ?? null;
      return {
        ...one,
        format: formatChip(row ?? one),
        role: one.organizer ? 'organizer' : row?.cup_team ? 'team' : one.row ? 'player' : one.invite ? 'invited' : 'player',
        team: row?.cup_team ?? null,
        checkIn: one.row?.action === 'check_in',
        checkedIn: !!one.row?.checked_in_at,
        waiting: waiting(one.row),
        to: one.organizer ? `/events/${one.id}/admin` : `/events/${one.id}`,
        todo: todo(one),
      };
    })
    .sort((a, b) => Number(b.todo) - Number(a.todo) || startKey(a.start).localeCompare(startKey(b.start)));
};

/** One open cup series as My events lists it: where it sits, who plays it, and what the member does.
 *  A lobby reports its places; a series with a veto offers it before its result.
 *  @param {any} one a GET /me/cup-series row */
export const cupSeriesLine = (one) => {
  const box = one?.series ?? {};
  const lobby = isLobby(box);
  const round = one?.round_name || (one?.round_number ? `Round ${one.round_number}` : null);
  const sides = lobby
    ? `${box.sides.length} in the lobby${box.lobby_map?.name ? ` · ${box.lobby_map.name}` : ''}`
    : [box.player1?.name || box.team1?.name, box.player2?.name || box.team2?.name].map((name) => name || 'To be decided').join(' vs ');
  return {
    where: [one?.stage_name, round].filter(Boolean).join(' · '),
    sides,
    lobby,
    // a cup series vetoes first: game 1 plays the map the veto leaves
    veto: !lobby && rulesOf(box.rules?.map_rules).includes('decider'),
  };
};

/** When a series row reads: its local day and time, "Started HH:mm" once its time has passed, or no time.
 *
 *  A series with no time that is already scored never had one written down,
 *  and the seasons imported from the old league sheets hold many of those, so
 *  it reads "Not recorded" rather than promising a booking.
 *  @param {any} row @param {*} [now] */
export const seriesWhen = (row, now = DateTime.now()) => {
  if (!row?.date_time) return timeMissing(row, 'No time booked');
  const at = local(row.date_time);
  return at < now ? `Started ${at.toFormat('HH:mm')}` : at.toFormat('ccc d LLL, HH:mm');
};

/** Where the member stands in the current season, from its /me seasons row: on a team ('playing'),
 *  signed up and waiting for the draft ('waiting'), or not in it ('not_in').
 *  @param {any} entry */
export const seasonState = (entry) => (entry?.team ? 'playing' : entry?.signed_up ? 'waiting' : 'not_in');

/** The round cards of a season as Home lists them: the rounds still to play in round order, the one
 *  in play first, then the rounds played, the most recent first.
 *  @param {any[]} [cards] the cards of roundCards */
export const homeRounds = (cards = []) => ({
  ahead: cards.filter((card) => !card.over),
  played: cards.filter((card) => card.over).reverse(),
});

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

/** A captain's fixtures, split by where Home offers them: every fixture of his team in the current
 *  season goes on its round in My Season, and the next fixture to draft of every other event goes
 *  in Upcoming Series, naming its event. A backend that answers no list yet gives the one fixture.
 *  @param {any[]} [events] the GET /me/events rows @param {number|null} [seasonId] the current season */
export const seasonFixtures = (events = [], seasonId = null) => {
  const own = seasonId == null ? null : (events.find((row) => Number(row.id) === Number(seasonId)) ?? null);
  return {
    matches: own?.captain_matches ?? (own?.captain_fixture ? [own.captain_fixture] : []),
    others: events.filter((row) => row.captain_fixture && row !== own).map((row) => ({ ...row.captain_fixture, event: row.name })),
  };
};

/** One round's fixture of the captain's team as My Season shows it: the team it meets, how far its
 *  series are, and the match page, which opens on the plan while the round has places left.
 *  @param {any} fixture a captain_matches row @param {number|null} [teamId] the team his seat names */
export const teamMatch = (fixture, teamId = null) => {
  if (!fixture) return null;
  const { published = 0, drafted = 0, played = 0, series_per_round: places } = fixture;
  const parts = [published ? `${published} of ${places} published` : 'No series published yet'];
  if (drafted) parts.push(`${drafted} in draft`);
  if (published) parts.push(played >= published ? 'all played' : `${played} played`);
  const side = (team) => teamId != null && Number(team?.id) === Number(teamId);
  return {
    opponent: side(fixture.team1) ? fixture.team2 : side(fixture.team2) ? fixture.team1 : null,
    status: parts.join(' · '),
    to: `/match/${fixture.match_id}`,
  };
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

/** Where a GET /home/series row sits: "GNL · Season 19 · Group stage · Round 3". It takes the middle
 *  dot of eventLabel, so one hub screen names an event one way. A part the row leaves out takes no
 *  separator, and an event name that opens with its league says it once.
 *  @param {any} row */
export const rowContext = (row) => {
  const event = String(row?.event ?? '');
  const league = row?.league && !event.toLowerCase().startsWith(String(row.league).toLowerCase()) ? row.league : null;
  return [league, row?.event, row?.stage, row?.round].filter(Boolean).join(' · ');
};
