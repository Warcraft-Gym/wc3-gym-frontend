// The sign-up list form and its create body, and the stage body the stage editors write back
import { dayIso } from './date-input.mjs';
import { text } from './event-labels.mjs';
import { storedUtc } from './timezone.mjs';

// A blank number field is no value at all, not a zero
const count = (value) => (value === '' || value === null || value === undefined ? null : Number(value));

// A sign-up list needs a name; everything else may stay blank
export const blankForm = () => ({ name: '', start_date: null, start_time: '', description: '', page_url: '', entrant_cap: '' });

// The body POST /events takes: members' names in no league, with no stage and no check-in
export const createPayload = (form) => ({
  name: (form.name || '').trim(),
  kind: 'signup',
  league_id: null,
  description: text(form.description),
  start_date: form.start_date ? dayIso(form.start_date) : null,
  // the pickers give a Date and an "HH:mm" in the viewer's zone, stored as the UTC instant they name
  starts_at: form.start_date && form.start_time ? storedUtc(form.start_date, form.start_time) : null,
  page_url: text(form.page_url),
  entrant_cap: count(form.entrant_cap),
  signup_policy: 'members',
  entrant_kind: 'solo',
  eligibility_required: false,
  checkin_enabled: false,
  // an explicit empty list writes no stage, where a missing field writes a default one
  stages: [],
});

// What the form still needs, in one sentence, or nothing when it is ready
export const formProblem = (form) => {
  if (!(form.name || '').trim()) return 'Name the list.';
  if (count(form.entrant_cap) !== null && !(Number(form.entrant_cap) >= 2)) return 'A cap holds two sign-ups or more.';
  if (form.start_time && !form.start_date) return 'Pick a date for the start time.';
  return null;
};

// The fields PUT /events/{id}/stages takes; a read also carries an id, a position and a seed lock
const STAGE_WRITE_FIELDS = [
  'name', 'format', 'best_of', 'series_per_entrant_per_round', 'swiss_rounds', 'points_by_place',
  'lobby_size', 'group_advance', 'map_rules', 'scheduling_mode', 'ranking_rule',
  'points_series_won', 'points_series_drawn', 'points_game_won', 'advance_count', 'group_size',
  'auto_advance', 'third_place', 'grand_final_modifier', 'best_of_by_round', 'placement_lives',
  'seed_source',
];

// The write replaces every field of every stage, so each stage goes back as it was read
export const readStagesPayload = (stages, edits = {}) => (stages || []).map((stage) => ({
  ...Object.fromEntries(
    STAGE_WRITE_FIELDS.filter((field) => stage[field] !== undefined).map((field) => [field, stage[field]]),
  ),
  max_mmr_difference: stage.format === 'gnl'
    ? count(stage.id in edits ? edits[stage.id] : stage.max_mmr_difference)
    : null,
}));
