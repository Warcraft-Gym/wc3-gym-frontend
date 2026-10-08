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

// The games a cup is played as; only 1v1 is built, the rest name what comes later
export const CUP_GAMES = [
  { value: '1v1', title: '1v1', ready: true },
  { value: '2v2', title: '2v2', ready: false },
  { value: 'custom', title: 'Custom game', ready: false },
  { value: 'ffa', title: 'FFA', ready: false },
];

export const CUP_FORMATS = [
  { value: 'single_elimination', title: 'Single elimination', hint: 'Lose once and you are out. 16 players play 4 rounds.' },
  { value: 'double_elimination', title: 'Double elimination', hint: 'Lose twice to go out; an upper and a lower bracket meet in the grand final.' },
];

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
  entrant_kind: 'solo',
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
  entrant_min: count(form.entrant_min),
  entrant_cap: count(form.entrant_cap),
  checkin_enabled: !!form.checkin_enabled,
  published: !!form.published,
  signups_open: !!form.signups_open,
  // every series vetoes from the pool by its own best-of, and game 1 plays the map left over
  veto_by_best_of: true,
  map_ids: (form.pool || []).map((row) => row.id),
  stages: [
    {
      format: form.format,
      best_of: Number(form.best_of),
      best_of_by_round: planText(form.best_of_plan || {}, form.format, Number(form.best_of)),
      // A cup is played on the evening: a series starts when both sides are there
      scheduling_mode: 'immediate',
      third_place: form.format === 'single_elimination' && !!form.third_place,
      grand_final_modifier: form.format === 'double_elimination' && form.grand_final_reset ? 'reset' : 'one',
    },
  ],
});

/** What keeps a step from being left, or null when it is complete. */
export function cupProblem(form, step) {
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
  }
  return null;
}
