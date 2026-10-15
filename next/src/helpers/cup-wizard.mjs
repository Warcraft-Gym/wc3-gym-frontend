// The pure parts of Create cup: the blank form, the one body POST /events takes, and what a step
// still needs. A cup plays one elimination stage on the evening it starts, so the form asks only
// what an organizer decides; everything else keeps the backend's default.
import { planText, poolProblem } from './best-of-plan.mjs';
import { dayIso } from './date-input.mjs';
import { text } from './event-labels.mjs';
import { storedUtc, viewerZone } from './timezone.mjs';
import { WEEKDAYS } from './cup-recurrence.mjs';

export const CUP_STEPS = [
  { key: 'basics', title: 'Basics' },
  { key: 'format', title: 'Format' },
  { key: 'maps', title: 'Maps' },
  { key: 'signups', title: 'Sign-ups' },
  { key: 'review', title: 'Review' },
];

/** The steps of this cup: a cup played over rounds also sets the points each place pays.
 *  @param {any} form */
export const cupSteps = (form) =>
  form.play === 'rounds'
    ? [...CUP_STEPS.slice(0, -1), { key: 'points', title: 'Points' }, CUP_STEPS[CUP_STEPS.length - 1]]
    : CUP_STEPS;

// How a cup is played: on one evening, or over several rounds, each a competition of its own
// whose places pay points into an overall table
export const CUP_PLAYS = [
  { value: 'one', title: 'One evening' },
  { value: 'rounds', title: 'Several rounds' },
];

// What each place of a round pays unless the organizer changes it; a place past the list pays 0
export const DEFAULT_POINTS = [10, 8, 6, 5, 4, 3, 2, 1];
export const MAX_ROUNDS = 12;

const addDays = (date, days) => (date instanceof Date ? new Date(date.getFullYear(), date.getMonth(), date.getDate() + days) : null);

/** The rounds after the first, `count` of them in all: each one a week after the one before at
 *  the cup's start time, unless the organizer changed its day or time.
 *  @param {any} form
 *  @param {number} [count] */
export const laterRounds = (form, count = Number(form.round_count) || 0) =>
  Array.from({ length: Math.max(count - 1, 0) }, (_, index) => {
    const kept = (form.later_rounds || [])[index];
    if (kept?.edited) return kept;
    return { date: addDays(form.start_date, 7 * (index + 1)), time: form.start_time, edited: false };
  });

/** How often a cup on this day can repeat: every week, the nth such weekday of the month the
 *  day is, and the last of the month when the day is the last one. The weekday is the day's own.
 *  @param {Date | null} day */
export const repeatChoices = (day) => {
  if (!(day instanceof Date)) return [];
  const name = WEEKDAYS[(day.getDay() + 6) % 7];
  const nth = Math.ceil(day.getDate() / 7);
  const last = new Date(day.getFullYear(), day.getMonth(), day.getDate() + 7).getMonth() !== day.getMonth();
  const ordinal = ['first', 'second', 'third', 'fourth'][nth - 1];
  return [
    { value: null, title: `Every ${name}` },
    ...(ordinal ? [{ value: nth, title: `The ${ordinal} ${name} of the month` }] : []),
    ...(last ? [{ value: -1, title: `The last ${name} of the month` }] : []),
  ];
};

/** The name a repeating cup's rule takes: the one typed, or the cup's name without a trailing
 *  number, so "Friday Cup #1" repeats as "Friday Cup".
 *  @param {any} form */
export const repeatName = (form) => (form.repeat_name || '').trim() || (form.name || '').trim().replace(/\s+#?\d+$/, '');

/** The points table as numbers, best place first; empty fields at the end are dropped.
 *  @param {any} form */
export const pointsOf = (form) => {
  const values = (form.points || []).map((value) => (value === '' || value === null || value === undefined ? null : Number(value)));
  while (values.length && values[values.length - 1] === null) values.pop();
  return values.map((value) => value ?? 0);
};

// The games a cup is played as: one against one, or real team games of a size; custom games
// and FFA name what comes later
export const CUP_GAMES = [
  { value: '1v1', title: '1v1', ready: true, size: null },
  { value: '2v2', title: '2v2', ready: true, size: 2 },
  { value: '3v3', title: '3v3', ready: true, size: 3 },
  { value: '4v4', title: '4v4', ready: true, size: 4 },
  { value: 'custom', title: 'Custom game', ready: true, size: null },
  { value: 'ffa', title: 'FFA', ready: true, size: null },
];

/** How many players a team of this game fields, or null for 1v1.
 *  @param {string} game */
export const teamSizeOf = (game) => CUP_GAMES.find((item) => item.value === game)?.size ?? null;

/** Whether the cup is a custom game: played on one map, no veto, every game on it.
 *  @param {any} form */
export const isCustom = (form) => form?.game === 'custom';

// The modes a custom game is played as: a match of two sides, or a free for all
export const CUSTOM_MODES = [
  { value: '1v1', title: '1v1' },
  { value: '2v2', title: '2v2' },
  { value: '3v3', title: '3v3' },
  { value: '4v4', title: '4v4' },
  { value: 'ffa', title: 'FFA' },
];

/** Whether the cup plays lobbies: an FFA cup, or a custom game played as a free for all.
 *  @param {any} form */
export const isFfa = (form) => form?.game === 'ffa' || (isCustom(form) && form.custom_mode === 'ffa');

// The FFA modes: every player for themselves, or teams of 2 to 4 that share a lobby with other
// teams, signed up by their captains as a team cup is. A lobby holds as many sides as play in it,
// so a mode names the size of a side, never how many sides meet: 1v1v1…, 2v2v2…
export const FFA_TEAM_SIZES = [
  { value: 1, title: 'Solo (1v1v1…)' },
  { value: 2, title: 'Teams of 2 (2v2v2…)' },
  { value: 3, title: 'Teams of 3 (3v3v3…)' },
  { value: 4, title: 'Teams of 4 (4v4v4…)' },
];

/** The players a team of this cup fields, or null for a cup of single players: the game's team
 *  size, or a team FFA's mode.
 *  @param {any} form */
export const cupTeamSize = (form) => {
  if (!isFfa(form)) return isCustom(form) ? teamSizeOf(form.custom_mode) : teamSizeOf(form.game);
  const size = Number(form.ffa_team_size) || 1;
  return size > 1 ? size : null;
};

/** How the FFA mode reads: "every player for themselves", or "teams of 2" for teams of two; a
 *  lobby holds as many sides as play in it, so the line names no count of sides.
 *  @param {any} form */
export const ffaModeLine = (form) => {
  const size = cupTeamSize(form);
  return size ? `teams of ${size}` : 'every player for themselves';
};

// How a free for all cup is played: heats of lobbies down to one final lobby, or one lobby that
// plays several games and adds the place points up
export const FFA_MODES = [
  { value: 'heats', title: 'Heats down to a final', hint: 'Lobbies of a few players; the top places of each lobby go on until one final lobby decides the winner.' },
  { value: 'league', title: 'One lobby, several games', hint: 'Everyone plays in one lobby, several games in a row; the place points of every game add up.' },
];

/** The points each place of a lobby pays, best place first: the ones the organizer typed, or the
 *  lobby size counting down, so a lobby of 4 pays 4, 3, 2, 1.
 *  @param {any} form */
export const ffaPoints = (form) => {
  const typed = (form.ffa_points || []).map((value) => (value === '' || value === null || value === undefined ? null : Number(value)));
  while (typed.length && typed[typed.length - 1] === null) typed.pop();
  if (typed.length) return typed.map((value) => value ?? 0);
  const seats = Number(form.lobby_size) || 4;
  return Array.from({ length: seats }, (unused, index) => seats - index);
};

/** How many places of a heat go on: the organizer's number, or half the lobby.
 *  @param {any} form */
export const ffaAdvance = (form) => Number(form.lobby_advance) || Math.max(Math.floor((Number(form.lobby_size) || 4) / 2), 1);

/** How a free for all cup reads in a line, for the review.
 *  @param {any} form */
export const ffaLine = (form) => {
  const who = cupTeamSize(form) ? ' teams' : '';
  return form.ffa_mode === 'league'
    ? `One lobby of ${Number(form.lobby_size) || '?'}${who}, ${Number(form.ffa_games) || '?'} games, the points add up`
    : `Heats of ${Number(form.lobby_size) || '?'}${who}, the top ${ffaAdvance(form)} of each go on, down to one final lobby`;
};

export const CUP_FORMATS = [
  { value: 'single_elimination', title: 'Single elimination', hint: 'Lose once and you are out. 16 players play 4 rounds.' },
  { value: 'double_elimination', title: 'Double elimination', hint: 'Lose twice to go out; an upper and a lower bracket meet in the grand final.' },
  { value: 'placement', title: 'Placement bracket', hint: 'Nobody goes home early: every round splits each group into its winners and its losers, and the last round decides every place.' },
  { value: 'swiss', title: 'Swiss', hint: 'Every round pairs players on the same score; the table after the last round is the result, or the top of it plays off.' },
];

// How long a Swiss cup runs: a set number of rounds, paired on the table, or a full league
export const SWISS_MODES = [
  { value: 'rounds', title: 'A set number of rounds' },
  { value: 'all', title: 'Everyone plays everyone' },
];

// The playoff after the Swiss rounds: none, or the top four or eight in a single elimination
export const PLAYOFFS = [
  { value: 0, title: 'No playoff' },
  { value: 4, title: 'Top 4' },
  { value: 8, title: 'Top 8' },
];

/** The format whose bracket parts the best-of plan names: a Swiss cup's playoff, or the cup's own.
 *  @param {any} form */
export const planFormat = (form) => (form.format === 'swiss' ? (form.playoff ? 'single_elimination' : 'swiss') : form.format);

/** How a Swiss cup reads in a line: "Swiss, 3 rounds, then the top 4 play off".
 *  @param {any} form */
export const swissLine = (form) =>
  [
    form.swiss_mode === 'all' ? 'Swiss, everyone plays everyone' : `Swiss, ${Number(form.swiss_rounds) || '?'} rounds`,
    form.playoff ? `then the top ${form.playoff} play off` : null,
  ]
    .filter(Boolean)
    .join(', ');

// How many losses end a run in a placement bracket; null plays every place
export const PLACEMENT_LIVES = [
  { value: 1, title: '1 loss', hint: 'single elimination: the players who go out share their places' },
  { value: 2, title: '2 losses', hint: 'a second loss ends a run; that player shares the places of their group' },
  { value: 3, title: '3 losses', hint: 'a third loss ends a run; that player shares the places of their group' },
  { value: null, title: 'Every place', hint: 'every player plays every round, and every place is decided' },
];

/** The words for a placement bracket's loss limit, as the review and the stage line read it.
 *  @param {number | null | undefined} lives */
export const livesLine = (lives) => (lives ? `a run ends after ${lives} ${lives === 1 ? 'loss' : 'losses'}` : 'every place played out');

export const SIGNUP_POLICIES = [
  { value: 'members', title: 'Members of the Discord' },
  { value: 'anyone', title: 'Anyone with a battle tag' },
];

export const blankCup = () => ({
  name: '',
  description: '',
  start_date: null,
  start_time: '',
  game: '1v1',
  format: 'single_elimination',
  third_place: false,
  grand_final_reset: true,
  // on: only the organizers and admins read the seed numbers
  hide_seeds: false,
  // a placement bracket: the losses that end a run, null playing every place
  placement_lives: null,
  // a Swiss cup: a set number of rounds or a full league, and the playoff after it
  swiss_mode: 'rounds',
  swiss_rounds: 3,
  playoff: 0,
  // the early rounds; a bracket part that plays its own best-of names it in the plan
  best_of: 3,
  best_of_plan: {},
  // the maps the players veto from, in order: { id, name }
  pool: [],
  signup_policy: 'members',
  // who may sign up at all: a battle tag W3Champions rates, inside these bounds
  eligibility_required: true,
  // on top of that, the tag verified through Battle.net; off while the community starts out
  bnet_required: false,
  mmr_min: '',
  mmr_max: '',
  min_games: '',
  // the lifetime games a race needs before its MMR counts, so a few games on another race never decide
  race_games_min: 20,
  entrant_min: '',
  entrant_cap: '',
  // on: the players split into divisions, cut by MMR on the run page once they have signed up
  uses_divisions: false,
  // one evening, or several rounds: their count, the rounds after the first, and the points a place pays
  play: 'one',
  round_count: 3,
  later_rounds: [],
  points: DEFAULT_POINTS.map(String),
  // a free for all: heats or one lobby, the seats of a lobby, the places that go on, the games,
  // and the points each place pays (empty: the lobby size counting down)
  ffa_mode: 'heats',
  // 1 plays every player for themselves; 2 to 4 play teams in the lobbies
  ffa_team_size: 1,
  // a custom game: how it is played, and the one map it is played on, { id, name }
  custom_mode: '1v1',
  custom_map: null,
  lobby_size: 4,
  lobby_advance: '',
  ffa_games: 3,
  ffa_points: [],
  // on: the cup repeats on a rule from its own day, every week or the nth weekday of the month
  repeat: false,
  repeat_nth: null,
  repeat_name: '',
  repeat_until: null,
  checkin_enabled: true,
  published: true,
  signups_open: true,
});

const count = (value) => (value === '' || value === null || value === undefined ? null : Number(value));

/** The body POST /events takes for a cup: the event, and its one stage. The time is typed in
 *  the viewer's zone and stored as the UTC instant it names. */
export const cupPayload = (form) => ({
  name: (form.name || '').trim(),
  kind: 'cup',
  // a team cup enters the teams its captains sign up, each of team_size players
  entrant_kind: cupTeamSize(form) ? 'team' : 'solo',
  team_size: cupTeamSize(form),
  description: text(form.description),
  start_date: form.start_date ? dayIso(form.start_date) : null,
  // no end date: a cup ends on its finish or its last result, never at midnight while it is played
  end_date: null,
  starts_at: form.start_date && form.start_time ? storedUtc(form.start_date, form.start_time) : null,
  // a battle tag alone proves no Battle.net link, so a cup that asks for one takes members only
  signup_policy: form.eligibility_required && form.bnet_required ? 'members' : form.signup_policy,
  eligibility_required: !!form.eligibility_required,
  bnet_required: !!form.eligibility_required && !!form.bnet_required,
  mmr_min: count(form.mmr_min),
  mmr_max: count(form.mmr_max),
  min_games: count(form.min_games),
  race_games_min: count(form.race_games_min),
  entrant_min: count(form.entrant_min),
  // one lobby seats the whole field, so it takes no more players than its seats
  entrant_cap: isFfa(form) && form.ffa_mode === 'league' ? Math.min(count(form.entrant_cap) ?? Infinity, Number(form.lobby_size)) : count(form.entrant_cap),
  uses_divisions: !!form.uses_divisions,
  // a cup played over rounds checks its players in per round, never once for the cup
  checkin_enabled: form.play === 'rounds' ? false : !!form.checkin_enabled,
  ...roundsPayload(form),
  recurrence: repeatPayload(form),
  published: !!form.published,
  signups_open: !!form.signups_open,
  // every series vetoes from the pool by its own best-of, and game 1 plays the map left over
  // a lobby is one game, and a custom game plays its one map, so neither vetoes
  veto_by_best_of: !isFfa(form) && !isCustom(form),
  custom_game: isCustom(form),
  hide_seeds: !!form.hide_seeds,
  map_ids: isCustom(form) ? (form.custom_map ? [form.custom_map.id] : []) : (form.pool || []).map((row) => row.id),
  stages: isFfa(form) ? [ffaStage(form)] : form.format === 'swiss' ? swissStages(form) : [
    {
      format: form.format,
      best_of: Number(form.best_of),
      best_of_by_round: planText(form.best_of_plan || {}, form.format, Number(form.best_of)),
      // A cup is played on the evening: a series starts when both sides are there
      scheduling_mode: 'immediate',
      third_place: form.format === 'single_elimination' && !!form.third_place,
      grand_final_modifier: form.format === 'double_elimination' && form.grand_final_reset ? 'reset' : 'one',
      placement_lives: form.format === 'placement' ? form.placement_lives ?? null : null,
    },
  ],
});

/** The rule a repeating cup is created with, in the viewer's zone, or null.
 *  @param {any} form */
function repeatPayload(form) {
  if (!form.repeat || !(form.start_date instanceof Date)) return null;
  const choices = repeatChoices(form.start_date);
  return {
    name: repeatName(form),
    weekday: (form.start_date.getDay() + 6) % 7,
    nth: choices.some((item) => item.value === form.repeat_nth) ? form.repeat_nth : null,
    start_time: form.start_time,
    zone: viewerZone(),
    ends_on: form.repeat_until ? dayIso(form.repeat_until) : null,
  };
}

/** A cup played over rounds: one entry per round, each an instant in UTC, and the points table.
 *  @param {any} form */
function roundsPayload(form) {
  if (form.play !== 'rounds') return {};
  const first = form.start_date && form.start_time ? storedUtc(form.start_date, form.start_time) : null;
  return {
    legs: [{ starts_at: first }, ...laterRounds(form).map((row) => ({ starts_at: row.date && row.time ? storedUtc(row.date, row.time) : null }))],
    points_by_place: pointsOf(form),
  };
}

/** A free for all cup's one stage. Heats name the seats of a lobby, so a field larger than one
 *  lobby plays down to a final; one lobby seats the whole field and plays `ffa_games` games, which
 *  the stage holds in `swiss_rounds`. Every lobby is one game: no best-of, no veto.
 *  @param {any} form */
function ffaStage(form) {
  const league = form.ffa_mode === 'league';
  return {
    name: league ? 'Lobby' : 'Heats',
    format: 'ffa',
    best_of: 1,
    best_of_by_round: null,
    scheduling_mode: 'immediate',
    lobby_size: league ? null : Number(form.lobby_size),
    group_advance: league ? null : ffaAdvance(form),
    swiss_rounds: league ? Number(form.ffa_games) : null,
    points_by_place: ffaPoints(form).join(','),
    third_place: false,
    grand_final_modifier: 'one',
    placement_lives: null,
  };
}

/** A Swiss cup's stages: the rounds, paired on the table or a full league, then the playoff,
 *  which the last Swiss result seeds and draws.
 *  @param {any} form */
function swissStages(form) {
  const bestOf = Number(form.best_of);
  const playoff = Number(form.playoff) || 0;
  const league = form.swiss_mode === 'all';
  const stages = [
    {
      name: league ? 'League' : 'Swiss rounds',
      format: league ? 'round_robin' : 'swiss',
      best_of: bestOf,
      best_of_by_round: null,
      scheduling_mode: 'immediate',
      swiss_rounds: league ? null : Number(form.swiss_rounds),
      advance_count: playoff || null,
      auto_advance: playoff > 0,
      third_place: false,
      grand_final_modifier: 'one',
      placement_lives: null,
    },
  ];
  if (playoff) {
    stages.push({
      name: 'Playoff',
      format: 'single_elimination',
      best_of: bestOf,
      best_of_by_round: planText(form.best_of_plan || {}, 'single_elimination', bestOf),
      scheduling_mode: 'immediate',
      third_place: !!form.third_place,
      grand_final_modifier: 'one',
      placement_lives: null,
    });
  }
  return stages;
}

/** What keeps a step from being left, or null when it is complete. */
export function cupProblem(form, step) {
  if (step === 'format' && isFfa(form)) {
    const seats = Number(form.lobby_size);
    if (form.ffa_mode === 'league') {
      if (!Number.isInteger(seats) || seats < 3 || seats > 12) return 'One lobby seats 3 to 12 players.';
      const games = Number(form.ffa_games);
      if (!Number.isInteger(games) || games < 2 || games > 10) return 'One lobby plays 2 to 10 games.';
    } else {
      if (!Number.isInteger(seats) || seats < 3 || seats > 8) return 'A heat seats 3 to 8 players.';
      const advance = ffaAdvance(form);
      if (!Number.isInteger(advance) || advance < 1 || advance >= seats) return `1 to ${seats - 1} places of a heat go on.`;
    }
    const points = ffaPoints(form);
    if (points.some((value) => !Number.isInteger(value) || value < 0)) return 'Points are whole numbers, 0 or more.';
    return null;
  }
  if (step === 'format' && form.format === 'swiss' && form.swiss_mode !== 'all') {
    const rounds = Number(form.swiss_rounds);
    if (!Number.isInteger(rounds) || rounds < 2) return 'A Swiss cup plays at least 2 rounds.';
  }
  if (step === 'basics') {
    if (!(form.name || '').trim()) return 'Name the cup.';
    if (!form.start_date) return 'Pick the day the cup is played.';
    if (!form.start_time) return 'Pick the time it starts.';
    if (form.play === 'rounds') {
      const rounds = Number(form.round_count);
      if (!Number.isInteger(rounds) || rounds < 2 || rounds > MAX_ROUNDS) return `A cup plays 2 to ${MAX_ROUNDS} rounds.`;
      const later = laterRounds(form);
      const missing = later.findIndex((row) => !row.date || !row.time);
      if (missing >= 0) return `Pick the day and time of round ${missing + 2}.`;
      const stamps = [storedUtc(form.start_date, form.start_time), ...later.map((row) => storedUtc(row.date, row.time))];
      const early = stamps.findIndex((stamp, index) => index > 0 && stamp <= stamps[index - 1]);
      if (early > 0) return `Round ${early + 1} starts after round ${early}.`;
    }
  }
  if (step === 'basics' && form.repeat) {
    if (!repeatName(form)) return 'Name the recurring cup.';
    if (form.repeat_until && form.start_date && dayIso(form.repeat_until) < dayIso(form.start_date)) return 'The last day comes after the first cup.';
  }
  if (step === 'points') {
    const points = pointsOf(form);
    if (!points.length) return 'Give at least the winner of a round some points.';
    if (points.some((value) => !Number.isInteger(value) || value < 0)) return 'Points are whole numbers, 0 or more.';
  }
  if (step === 'maps' && isCustom(form)) {
    return form.custom_map ? null : 'Pick or add the map the cup is played on.';
  }
  if (step === 'maps' && isFfa(form)) {
    return (form.pool || []).length ? null : 'Add at least one map; every lobby plays a map of the pool.';
  }
  if (step === 'maps') {
    return poolProblem((form.pool || []).length, Number(form.best_of), form.best_of_plan || {});
  }
  if (step === 'signups') {
    const [least, most] = [count(form.entrant_min), count(form.entrant_cap)];
    if (least !== null && least < 2) return 'A cup needs at least 2 players.';
    if (most !== null && most < 2) return 'The maximum must be at least 2.';
    if (least !== null && most !== null && least > most) return 'The minimum cannot be above the maximum.';
    const [low, high] = [count(form.mmr_min), count(form.mmr_max)];
    if (low !== null && high !== null && low > high) return 'The lowest MMR cannot be above the highest.';
    if (count(form.min_games) !== null && count(form.min_games) < 0) return 'The games cannot be below zero.';
    if (count(form.race_games_min) !== null && count(form.race_games_min) < 1) return 'A race counts from 1 game or more.';
  }
  return null;
}
