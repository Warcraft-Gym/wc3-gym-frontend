// The pure parts of Create cup: the blank form, the one body POST /events takes, and what a step
// still needs. A cup plays one elimination stage on the evening it starts, so the form asks only
// what an organizer decides; everything else keeps the backend's default.
import { planText, poolProblem } from './best-of-plan.mjs';
import { dayIso } from './date-input.mjs';
import { text } from './event-labels.mjs';
import { storedUtc } from './timezone.mjs';

export const CUP_STEPS = [
  { key: 'basics', title: 'Basics' },
  { key: 'format', title: 'Format' },
  { key: 'maps', title: 'Maps' },
  { key: 'signups', title: 'Sign-ups' },
  { key: 'review', title: 'Review' },
];

// The games a cup is played as: one against one, or real team games of a size; custom games
// and FFA name what comes later
export const CUP_GAMES = [
  { value: '1v1', title: '1v1', ready: true, size: null },
  { value: '2v2', title: '2v2', ready: true, size: 2 },
  { value: '3v3', title: '3v3', ready: true, size: 3 },
  { value: '4v4', title: '4v4', ready: true, size: 4 },
  { value: 'custom', title: 'Custom game', ready: false, size: null },
  { value: 'ffa', title: 'FFA', ready: false, size: null },
];

/** How many players a team of this game fields, or null for 1v1.
 *  @param {string} game */
export const teamSizeOf = (game) => CUP_GAMES.find((item) => item.value === game)?.size ?? null;

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

export const CUP_BEST_OF = [1, 3, 5].map((value) => ({ value, title: `Bo${value}` }));

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
  entrant_kind: teamSizeOf(form.game) ? 'team' : 'solo',
  team_size: teamSizeOf(form.game),
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
  entrant_cap: count(form.entrant_cap),
  checkin_enabled: !!form.checkin_enabled,
  published: !!form.published,
  signups_open: !!form.signups_open,
  // every series vetoes from the pool by its own best-of, and game 1 plays the map left over
  veto_by_best_of: true,
  hide_seeds: !!form.hide_seeds,
  map_ids: (form.pool || []).map((row) => row.id),
  stages: form.format === 'swiss' ? swissStages(form) : [
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

/** What keeps a step from being left, or null when it is complete. */
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

export function cupProblem(form, step) {
  if (step === 'format' && form.format === 'swiss' && form.swiss_mode !== 'all') {
    const rounds = Number(form.swiss_rounds);
    if (!Number.isInteger(rounds) || rounds < 2) return 'A Swiss cup plays at least 2 rounds.';
  }
  if (step === 'basics') {
    if (!(form.name || '').trim()) return 'Name the cup.';
    if (!form.start_date) return 'Pick the day the cup is played.';
    if (!form.start_time) return 'Pick the time it starts.';
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
