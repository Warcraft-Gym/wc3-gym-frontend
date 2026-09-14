// The pure parts of the event wizard: the blank form, the three bodies the create writes,
// and what a step still needs before it may be left.
import { dayIso } from './date-input.mjs';
import { ENTRANT_KINDS, EVENT_KINDS, text } from './event-labels.mjs';
import { storedUtc } from './timezone.mjs';

export const STEPS = [
  { key: 'basics', title: 'Basics' },
  { key: 'entrants', title: 'Entrants' },
  { key: 'stages', title: 'Stages' },
  { key: 'divisions', title: 'Divisions' },
  { key: 'review', title: 'Review' },
];

// A signup-only event plays no stage, so the wizard never asks for one
export const stepsFor = (form) => (form?.kind === 'signup'
  ? STEPS.filter((step) => step.key !== 'stages')
  : STEPS);

// A wizard writes a new run of a league; a GNL season and a KOTH night are made elsewhere
export const WIZARD_KINDS = EVENT_KINDS.filter((kind) => kind.value === 'cup' || kind.value === 'signup');
// A drafted-team event needs the team draft, which is not part of creating the event
export const WIZARD_ENTRANT_KINDS = ENTRANT_KINDS.filter((kind) => kind.value !== 'drafted_teams');

export const BEST_OF = [1, 3, 5, 7].map((value) => ({ value, title: `Best of ${value}` }));

export const blankStage = () => ({
  name: '',
  format: 'single_elimination',
  best_of: 3,
  map_rule: 'veto',
  series_per_entrant_per_round: 1,
  lobby_size: '',
  points_by_place: '',
  scheduling_mode: 'agreed',
  advance_count: '',
  auto_advance: false,
});

// A new event inherits what the league already answers; everything else starts empty
export const blankForm = (league = null) => ({
  league_id: league?.id ?? null,
  parent_id: null,
  name: '',
  kind: 'cup',
  start_date: null,
  end_date: null,
  start_time: '',
  region: '',
  description: '',
  page_url: '',
  stream_url: '',
  signup_policy: 'members',
  entrant_kind: league?.entrant_kind === 'team' ? 'team' : 'solo',
  entrant_cap: '',
  mmr_max: '',
  min_games: '',
  checkin_enabled: false,
  checkin_days: 3,
  series_per_round: 1,
  division_count: 0,
  division_names: [],
  stages: [blankStage()],
});

// A blank number field is no value at all, not a zero
const count = (value) => (value === '' || value === null || value === undefined ? null : Number(value));

// Only a round robin plays more than one series an entrant a round; every other format plays one
export const seriesPerRound = (stage) => (stage.format === 'round_robin'
  ? Math.max(1, Number(stage.series_per_entrant_per_round) || 1)
  : 1);

// The body POST and PUT /events take. The pickers hand over Dates and "HH:mm" typed in
// the viewer's zone, so a start time is stored as the UTC instant it names.
export const eventPayload = (form) => ({
  league_id: form.league_id ?? null,
  parent_id: form.parent_id ?? null,
  name: (form.name || '').trim(),
  kind: form.kind,
  description: text(form.description),
  region: text(form.region),
  start_date: form.start_date ? dayIso(form.start_date) : null,
  end_date: form.end_date ? dayIso(form.end_date) : null,
  starts_at: form.start_date && form.start_time ? storedUtc(form.start_date, form.start_time) : null,
  page_url: text(form.page_url),
  stream_url: text(form.stream_url),
  signup_policy: form.signup_policy,
  entrant_kind: form.entrant_kind,
  entrant_cap: count(form.entrant_cap),
  mmr_max: count(form.mmr_max),
  min_games: count(form.min_games),
  checkin_enabled: !!form.checkin_enabled,
  checkin_days: form.checkin_enabled ? count(form.checkin_days) : null,
  // A fixture pairs two team entrants, so a solo event always holds one series a pairing
  series_per_round: form.entrant_kind === 'team' ? Math.max(1, Number(form.series_per_round) || 1) : 1,
});

// One word per game of the best-of, as the veto engine reads it. A veto runs once for the
// series, so it names game 1 and the loser picks the rest; every other rule repeats.
export const gameRules = (rule, bestOf) => Array.from(
  { length: Math.max(1, Number(bestOf) || 1) },
  (unused, index) => (rule === 'veto' && index ? 'loser' : rule),
).join(',');

// The body PUT /events/{id}/stages takes: the positions must run 1..n, and the group
// settings are cut on the stage page later.
export const stagesPayload = (form) => (form.stages || []).map((stage, index) => ({
  position: index + 1,
  name: text(stage.name),
  format: stage.format,
  best_of: Number(stage.best_of),
  series_per_entrant_per_round: seriesPerRound(stage),
  map_rules: gameRules(stage.map_rule, stage.best_of),
  scheduling_mode: stage.scheduling_mode,
  advance_count: count(stage.advance_count),
  auto_advance: !!stage.auto_advance,
  // A lobby seats a free for all; every other format plays two sides a series
  lobby_size: stage.format === 'ffa' ? count(stage.lobby_size) : null,
  points_by_place: stage.format === 'ffa' ? text(stage.points_by_place) : null,
  group_size: null,
  group_advance: null,
}));

// The body POST /events takes: the event and its stages in one write, so a later failure
// cannot leave an event that has no stage. A signup-only event sends an explicit empty
// list, which the API reads as no stage at all where a missing field writes a default one.
export const createPayload = (form) => ({
  ...eventPayload(form),
  stages: form.kind === 'signup' ? [] : stagesPayload(form),
});

// The body PUT /events/{id}/divisions takes; the MMR bounds are cut on the entrants page later
export const divisionsPayload = (form) => Array.from({ length: form.division_count || 0 }, (unused, index) => ({
  position: index + 1,
  name: text(form.division_names?.[index]) || `Division ${index + 1}`,
}));

// What a free for all stage still needs. A lobby seats two or more, and the place points
// are the points each place pays, best place first.
export const lobbyProblem = (stage) => {
  if (stage.format !== 'ffa') return null;
  const seats = count(stage.lobby_size);
  if (seats !== null && !(seats >= 2)) return 'A lobby seats two players or more.';
  const points = (stage.points_by_place || '').trim();
  if (points && !/^\d+(\s*,\s*\d+)*$/.test(points)) return 'Write the place points as numbers, best place first: 4,3,2,1.';
  return null;
};

// What the step still needs, in one sentence, or nothing when it is ready
export const stepProblem = (form, key) => {
  if (key === 'basics') {
    if (!form.league_id) return 'Pick the league this event runs in.';
    if (!(form.name || '').trim()) return 'Name the event.';
    if (form.start_date && form.end_date && dayIso(form.end_date) < dayIso(form.start_date)) {
      return 'The end date falls before the start date.';
    }
    return null;
  }
  if (key === 'entrants') {
    if (form.entrant_cap !== '' && Number(form.entrant_cap) < 2) return 'A cap holds at least two entrants.';
    if (form.checkin_enabled && !(Number(form.checkin_days) > 0)) return 'Say how many days before a round check-in opens.';
    return null;
  }
  if (key === 'stages') {
    if (!(form.stages || []).length) return 'Add at least one stage.';
    if (form.stages.some((stage) => Number(stage.best_of) % 2 === 0)) return 'A best-of is an odd number of games.';
    return form.stages.map(lobbyProblem).find(Boolean) || null;
  }
  if (key === 'divisions') {
    if (form.division_count === 1) return 'Two divisions or more, or none at all.';
    return null;
  }
  return null;
};

// The wizard may create once every step it asks for is answered
export const wizardProblem = (form) => stepsFor(form)
  .map((step) => stepProblem(form, step.key)).find(Boolean) || null;
