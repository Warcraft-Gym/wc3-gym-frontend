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
  min_games_seasons: 1,
  checkin_enabled: false,
  checkin_days: 3,
  division_count: 0,
  division_names: [],
  stages: [blankStage()],
});

// A blank number field is no value at all, not a zero
const count = (value) => (value === '' || value === null || value === undefined ? null : Number(value));

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
  min_games_seasons: count(form.min_games) ? count(form.min_games_seasons) : null,
  checkin_enabled: !!form.checkin_enabled,
  checkin_days: form.checkin_enabled ? count(form.checkin_days) : null,
});

// The body PUT /events/{id}/stages takes: the positions must run 1..n. One map rule stands
// for every game of the best-of, and the group settings are cut on the stage page later.
export const stagesPayload = (form) => (form.stages || []).map((stage, index) => ({
  position: index + 1,
  name: text(stage.name),
  format: stage.format,
  best_of: Number(stage.best_of),
  map_rules: Array(Number(stage.best_of)).fill(stage.map_rule).join(','),
  scheduling_mode: stage.scheduling_mode,
  advance_count: count(stage.advance_count),
  auto_advance: !!stage.auto_advance,
  group_size: null,
  group_advance: null,
}));

// The body PUT /events/{id}/divisions takes; the MMR bounds are cut on the entrants page later
export const divisionsPayload = (form) => Array.from({ length: form.division_count || 0 }, (unused, index) => ({
  position: index + 1,
  name: text(form.division_names?.[index]) || `Division ${index + 1}`,
}));

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
    return null;
  }
  if (key === 'divisions') {
    if (form.division_count === 1) return 'Two divisions or more, or none at all.';
    return null;
  }
  return null;
};

// The wizard may create once every step before the review is answered
export const wizardProblem = (form) => STEPS.map((step) => stepProblem(form, step.key)).find(Boolean) || null;
