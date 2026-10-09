import { DEFAULT_RULES } from './best-of.mjs';
import { orderOf, orderProblem } from './pick-ban.mjs';

// The season wizard's steps. A season with no map rules plays DEFAULT_RULES; the round maps
// step is the fixed game-1 map of each round, so a season whose rules name no fixed game skips it.
// The captains step and the matchups step never block; matchups asks nothing while its switch is off.
export const WIZARD_STEPS = [
  { key: 'general', title: 'General' },
  { key: 'teams', title: 'Teams' },
  { key: 'captains', title: 'Captains & rosters' },
  { key: 'matchups', title: 'Matchups' },
  { key: 'maps', title: 'Maps' },
  { key: 'rounds', title: 'Round maps' },
];

export const usesFixedMap = (mapRules) => (mapRules || DEFAULT_RULES).split(',').map((rule) => rule.trim()).includes('fixed');

export const wizardSteps = (season) => WIZARD_STEPS.filter((step) => step.key !== 'rounds' || usesFixedMap(season?.map_rules));

// What still blocks the step, as the admin reads it, or null
export const stepProblem = (form, key) => {
  const season = form.season || {};
  if (key === 'general') {
    if (!String(season.name ?? '').trim()) return 'Give the season a name.';
    if (!(Number(season.round_count) >= 1)) return 'A season has 1 round or more.';
    const over = season.min_games_seasons;
    if (over !== '' && over != null && !(Number(over) >= 1)) return 'Count the recent games over one W3C season or more.';
    if (Object.values(form.maxMmr || {}).some((value) => value !== '' && !(Number(value) >= 1))) return 'The largest MMR difference is 1 or more.';
  }
  // Drawn matchups need a round for every week they fill
  if (key === 'matchups' && form.matchups) {
    const teams = (form.teamIds || []).length;
    if (teams < 2) return 'Tick 2 teams or more to draw the matchups.';
    const needed = roundsNeeded(teams);
    if (!(Number(season.round_count) >= needed)) return `${teams} teams need ${needed} rounds to play each other once.`;
  }
  // The maps step is empty or complete: a pool once ticked needs an order it can play through
  if (key === 'maps' && (form.mapIds || []).length) {
    return orderProblem(orderOf(season.pick_ban), season.map_rules, form.mapIds.length);
  }
  if (key === 'rounds') {
    const pool = new Set(form.mapIds || []);
    if (Object.values(form.roundMaps || {}).some((id) => id != null && !pool.has(id))) return 'A round starts on a map that is not in the pool.';
  }
  return null;
};

// The ids to add and to remove to move a list from what it was to what it is now
export const idDiff = (before, after) => ({
  add: after.filter((id) => !before.includes(id)),
  remove: before.filter((id) => !after.includes(id)),
});

// Every round from 1 to the count takes the pool's maps in turn; a round already set keeps its map
export const fillRoundMaps = (roundCount, poolIds, current = {}) => {
  const filled = {};
  if (!poolIds.length) return { ...current };
  for (let playday = 1; playday <= roundCount; playday += 1) {
    filled[playday] = current[playday] ?? poolIds[(playday - 1) % poolIds.length];
  }
  return filled;
};

// A round whose map left the pool starts on no fixed map
export const dropUnpooled = (roundMaps, poolIds) =>
  Object.fromEntries(Object.entries(roundMaps).map(([playday, id]) => [playday, id != null && poolIds.includes(id) ? id : null]));

// The rounds whose map the save writes: every round from 1 to the count whose map moved
export const changedRounds = (roundCount, before, after) => {
  const changed = [];
  for (let playday = 1; playday <= roundCount; playday += 1) {
    if ((before[playday] ?? null) !== (after[playday] ?? null)) changed.push({ playday, map_id: after[playday] ?? null });
  }
  return changed;
};

// The weeks the backend gives a round with no dates: a week from the season start per round
export const weekOf = (startDate, playday) => {
  if (!startDate) return null;
  const start = new Date(`${startDate}T00:00:00Z`);
  if (Number.isNaN(start.getTime())) return null;
  const from = new Date(start.getTime() + (playday - 1) * 7 * 86400000);
  const to = new Date(from.getTime() + 6 * 86400000);
  const iso = (day) => day.toISOString().slice(0, 10);
  return { start_date: iso(from), end_date: iso(to) };
};

// The rounds a season needs for every team to meet every other team once, one match a week:
// an odd count gives one team a week off, so it needs as many rounds as teams
export const roundsNeeded = (teamCount) => (teamCount < 2 ? 0 : teamCount % 2 ? teamCount : teamCount - 1);

const shuffled = (items, random) => {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
};

// A random single round robin by the circle method: one team stays put while the others turn,
// so each week pairs every team once and every pair meets in exactly one week. The teams, the
// order of the weeks and the side each team takes are random. `rest` is the team off that week.
export const drawMatchups = (teamIds, random = Math.random) => {
  if (teamIds.length < 2) return [];
  const circle = shuffled(teamIds, random);
  if (circle.length % 2) circle.push(null);
  const size = circle.length;
  const weeks = [];
  for (let week = 0; week < size - 1; week += 1) {
    const pairs = [];
    let rest = null;
    for (let i = 0; i < size / 2; i += 1) {
      const a = circle[i];
      const b = circle[size - 1 - i];
      if (a == null || b == null) rest = a ?? b;
      else pairs.push(random() < 0.5 ? [a, b] : [b, a]);
    }
    weeks.push({ pairs, rest });
    circle.splice(1, 0, circle.pop());
  }
  return shuffled(weeks, random).map((week, index) => ({ playday: index + 1, ...week }));
};

// The drawn weeks as the match rows the save writes, round by round
export const matchupRows = (weeks) =>
  weeks.flatMap((week) => week.pairs.map(([team1_id, team2_id]) => ({ team1_id, team2_id, playday: week.playday })));

const dayText = (iso) =>
  iso ? new Date(`${iso}T00:00:00Z`).toLocaleDateString(undefined, { day: 'numeric', month: 'short', timeZone: 'UTC' }) : null;

// A round's week as the admin reads it: its stored dates, or a week from the start date while it has none
export const weekText = (rounds, startDate, playday) => {
  const stored = (rounds || []).find((round) => round.playday === playday);
  const week = stored?.start_date ? stored : weekOf(startDate, playday);
  const from = dayText(week?.start_date);
  const to = dayText(week?.end_date);
  return from ? `${from}${to ? ` – ${to}` : ''}` : 'No dates yet';
};

const sameIds = (a = [], b = []) => a.length === b.length && a.every((id) => b.includes(id));

// What the save writes for the captains and the rosters of the ticked teams: per team, the whole
// captain list when it moved (the write replaces it), and the players to add and to remove
export const crewChanges = (before, after, teamIds) =>
  teamIds
    .map((teamId) => {
      const wasCaptains = before.captains?.[teamId] ?? [];
      const nowCaptains = after.captains?.[teamId] ?? [];
      const roster = idDiff(before.rosters?.[teamId] ?? [], after.rosters?.[teamId] ?? []);
      return { team_id: teamId, captains: sameIds(wasCaptains, nowCaptains) ? null : nowCaptains, ...roster };
    })
    .filter((change) => change.captains || change.add.length || change.remove.length);

// The signups a team's roster may take: every signup on no other team's roster
export const freeSignups = (signups, rosters, teamId) => {
  const taken = new Set(Object.entries(rosters || {}).flatMap(([id, players]) => (Number(id) === teamId ? [] : players)));
  return (signups || []).filter((signup) => !taken.has(signup.id));
};
