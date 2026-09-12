// The admin side of the events module (#36): the words a payload uses, the map pool
// import, division and seed maths, and the body the new-event wizard posts.
import { DateTime } from 'luxon';

import { gamesOf } from './best-of.mjs';
import { storedUtc } from './timezone.mjs';

// A stored date, as a reader wants it; an event without one shows a dash
export const dateText = (value) => (value ? DateTime.fromISO(value).toFormat('d LLL yyyy') : '—');

// The backend derives the phase of an event from published, the check-in window and its series
export const PHASE_LABEL = {
  draft: 'Draft',
  signups: 'Signups open',
  checkin: 'Check-in',
  seeded: 'Seeded',
  running: 'Running',
  finished: 'Finished',
};
export const PHASE_COLOR = {
  draft: 'default',
  signups: 'success',
  checkin: 'info',
  seeded: 'secondary',
  running: 'primary',
  finished: 'draw',
};

// How an entrant reached the event
export const CHANNEL_LABEL = {
  web: 'The website',
  bot: 'The Discord bot',
  twitch: 'Twitch',
};

export const ENTRANT_KINDS = [
  { value: 'solo', title: 'Solo players' },
  { value: 'drafted_teams', title: 'Drafted teams' },
];

export const EVENT_KINDS = [
  { value: 'gnl', title: 'GNL season' },
  { value: 'cup', title: 'Cup' },
  { value: 'koth', title: 'KOTH' },
  { value: 'signup', title: 'Signup only' },
];

// Only round robin, single elimination and koth generate series in v1; the rest
// are named here so an event can be drawn, and `generate` answers format_not_built
export const FORMATS = [
  { value: 'round_robin', title: 'Round robin', built: true },
  { value: 'single_elimination', title: 'Single elimination', built: true },
  { value: 'koth', title: 'KOTH', built: true },
  { value: 'double_elimination', title: 'Double elimination', built: false },
  { value: 'swiss', title: 'Swiss', built: false },
  { value: 'ffa', title: 'Free for all', built: false },
];

export const SCHEDULING_MODES = [
  { value: 'assigned', title: 'Admin assigns the time' },
  { value: 'agreed', title: 'The two sides agree a time' },
  { value: 'immediate', title: 'Played straight away' },
];

// A stage stores the map rule of every game, so the best-of follows from the rules
export const MAP_RULE_PRESETS = [
  { value: 'fixed,loser,loser', title: 'Bo3 · round map, then loser picks (GNL)' },
  { value: 'veto,veto,veto', title: 'Bo3 · veto every map' },
  { value: 'veto,veto,veto,veto,veto', title: 'Bo5 · veto every map' },
  { value: 'fixed', title: 'Bo1 · round map' },
  { value: 'veto', title: 'Bo1 · veto' },
];

export const newStage = (position = 1) => ({
  name: `Stage ${position}`,
  format: 'round_robin',
  map_rules: 'fixed,loser,loser',
  scheduling_mode: 'agreed',
  ranking_rule: 'points,game_diff,head_to_head',
  points_series_won: 1,
  points_series_drawn: 0,
  points_game_won: 0,
  advance_count: null,
});

export const formatTitle = (value) => FORMATS.find((f) => f.value === value)?.title || value;
export const isBuiltFormat = (value) => !!FORMATS.find((f) => f.value === value)?.built;

// A trailing version word: "v2", "2.0", "v1.3"
const VERSION = /^v?\d+(?:\.\d+)*$/;

// A map name folded to its lineage the way the backend folds it: case, spacing and
// the version word dropped, so "Autumn Leaves v2" and "autumnleaves" are one map
const foldedBase = (name) => {
  const words = String(name || '').toLowerCase().replace(/[^a-z0-9.]+/g, ' ').trim().split(' ').filter(Boolean);
  if (words.length && VERSION.test(words[words.length - 1])) words.pop();
  return words.join('');
};

// The W3C 1v1 pool against the maps table: the ids it holds, and the ladder names it
// does not. A preview row names both the warcraft3.info name and the W3C one, and the
// app may hold the map under either, or under an older name of the same lineage.
export const ladderPool = (maps, rows) => {
  const byName = new Map();
  const byBase = new Map();
  for (const map of maps || []) {
    if (!map.name) continue;
    byName.set(map.name.toLowerCase(), map.id);
    if (!byBase.has(foldedBase(map.name))) byBase.set(foldedBase(map.name), map.id);
  }
  const find = (name) => (name ? byName.get(name.toLowerCase()) ?? byBase.get(foldedBase(name)) : undefined);

  const ids = [];
  const missing = [];
  for (const row of rows || []) {
    if (row.status === 'off_ladder') continue;  // the app already holds it off the ladder
    const id = find(row.matched_name) ?? find(row.w3c_name);
    if (id === undefined) missing.push(row.w3c_name || row.matched_name);
    else if (!ids.includes(id)) ids.push(id);
  }
  return { ids, missing };
};

// The division an MMR falls in: the last one whose lower bound it reaches. A division
// with no bound, and an entrant with no MMR, both fall to the lowest division.
export const divisionOf = (mmr, divisions) => {
  const bands = [...(divisions || [])].sort((a, b) => (a.lower_bound ?? 0) - (b.lower_bound ?? 0));
  if (!bands.length) return null;
  const hit = [...bands].reverse().find((band) => (mmr ?? 0) >= (band.lower_bound ?? 0));
  return (hit || bands[0]).id;
};

// Every entrant put in a division by his MMR and seeded inside it, the highest MMR first
export const assignFromMmr = (entrants, divisions) => {
  const rows = (entrants || []).map((row) => ({ ...row, division_id: divisionOf(row.mmr, divisions) }));
  const seeded = [...rows].sort((a, b) => (b.mmr ?? 0) - (a.mmr ?? 0));
  const nextSeed = new Map();
  for (const row of seeded) {
    const seed = (nextSeed.get(row.division_id) ?? 0) + 1;
    nextSeed.set(row.division_id, seed);
    row.seed = seed;
  }
  return rows;
};

// One entrant moved a place up or down his division; the division's seeds stay 1..n
export const moveSeed = (entrants, id, delta) => {
  const row = (entrants || []).find((e) => e.id === id);
  if (!row) return entrants;
  const band = entrants
    .filter((e) => e.division_id === row.division_id)
    .sort((a, b) => (a.seed ?? 0) - (b.seed ?? 0));
  const at = band.indexOf(row);
  const to = at + delta;
  if (to < 0 || to >= band.length) return entrants;
  band.splice(to, 0, ...band.splice(at, 1));
  const seeds = new Map(band.map((e, index) => [e.id, index + 1]));
  return entrants.map((e) => (seeds.has(e.id) ? { ...e, seed: seeds.get(e.id) } : e));
};

// A blank number field is no value at all, which Number() would read as a zero
const number = (value) => (value === null || value === undefined || value === '' ? null : Number(value));
const text = (value) => (value ? String(value).trim() : null) || null;
// A "datetime-local" field is wall time in the browser's zone, stored as naive UTC like starts_at
const instant = (value) => (value ? DateTime.fromISO(value).toUTC().toFormat("yyyy-MM-dd'T'HH:mm:ss") : null);

// The body POST /events takes: the event, its stages in order and its map pool
export const eventPayload = (form) => ({
  league_id: form.league_id,
  name: (form.name || '').trim(),
  description: text(form.description),
  kind: form.kind,
  start_date: form.start_date || null,
  end_date: form.end_date || null,
  starts_at: form.start_date && form.start_time
    ? storedUtc(new Date(`${form.start_date}T00:00:00`), form.start_time)
    : null,
  page_url: text(form.page_url),
  stream_url: text(form.stream_url),
  published: !!form.published,
  signups_open: !!form.signups_open,
  entrant_cap: number(form.entrant_cap),
  min_games: number(form.min_games),
  mmr_max: number(form.mmr_max),
  checkin_opens_at: instant(form.checkin_opens_at),
  checkin_closes_at: instant(form.checkin_closes_at),
  map_ids: [...(form.map_ids || [])],
  stages: (form.stages || []).map((stage, index) => ({
    position: index + 1,
    name: (stage.name || '').trim() || `Stage ${index + 1}`,
    format: stage.format,
    best_of: gamesOf(stage.map_rules),
    map_rules: stage.map_rules,
    scheduling_mode: stage.scheduling_mode,
    ranking_rule: stage.ranking_rule,
    points_series_won: Number(stage.points_series_won),
    points_series_drawn: Number(stage.points_series_drawn),
    points_game_won: Number(stage.points_game_won),
    advance_count: number(stage.advance_count),
  })),
});

// What the wizard still needs before it may create the event
export const wizardProblem = (form) => {
  if (!form.league_id) return 'Pick a league';
  if (!(form.name || '').trim()) return 'Name the event';
  if (!form.stages?.length) return 'Add a stage';
  return null;
};
