// The pure parts of the entrants page: what an eligibility warning says, how the rows
// group by division, and the bodies the division and seed writes take.
// Divisions run strongest first, the way event_division.position reads them, so the
// bands of the MMR strip ascend where the divisions descend.

// A warning names what an admin should look at; none of them refused the signup.
export function warningLabel(code, event = {}) {
  if (code === 'under_min_games') return event.min_games ? `under ${event.min_games} games` : 'under the game count';
  if (code === 'over_mmr_max') return 'over the MMR cap';
  if (code === 'banned') return 'banned';
  return code;
}

// What a row is called: the team of a team entrant, else the player.
export const entrantName = (row) => row.team?.name || row.user?.name || '';

// Seeded entrants first in seed order, the rest strongest first, the name breaking a tie.
export function bySeed(rows) {
  return [...rows].sort((a, b) => (a.seed ?? Infinity) - (b.seed ?? Infinity)
    || (b.mmr ?? 0) - (a.mmr ?? 0)
    || entrantName(a).localeCompare(entrantName(b)));
}

// A sign-up list holds no seed and no draw, so it reads in the order people entered.
export const bySignup = (rows) => [...rows].sort((a, b) => a.id - b.id);

// The line over a sign-up list: who is in, against the cap when the event holds one.
// A withdrawn entrant keeps its row but gives its place back, so it is not counted.
export function signupCount(event, rows = []) {
  const live = rows.filter((row) => !row.withdrawn_at).length;
  return event?.entrant_cap ? `${live} of ${event.entrant_cap} signed up` : `${live} signed up`;
}

// One group per division in position order, and the entrants no division holds last.
export function groupByDivision(rows, divisions = []) {
  const held = new Set(divisions.map((division) => division.id));
  const groups = divisions.map((division, index) => ({
    key: division.id,
    id: division.id,
    title: division.name || `Division ${division.position ?? index + 1}`,
    rows: bySeed(rows.filter((row) => row.division_id === division.id)),
  }));
  const none = bySeed(rows.filter((row) => !held.has(row.division_id)));
  return none.length ? [...groups, { key: 'none', id: null, title: 'No division', rows: none }] : groups;
}

// The body PUT .../seeds takes once an admin ordered the rows by hand: every live entrant
// of every division, because the stage numbers them 1..n inside each one. A withdrawn
// entrant is left out; the stage refuses an id it does not seed.
export const seedPayload = (groups) => ({
  source: 'manual',
  order: groups.flatMap((group) => group.rows.filter((row) => !row.withdrawn_at).map((row) => row.id)),
});

// The seed answer holds the live entrants alone, so it merges into the list instead of
// replacing it: a withdrawn entrant keeps its row and loses its seed.
export function mergeSeeds(entrants, seeded) {
  const byId = new Map(seeded.map((row) => [row.id, row]));
  return entrants.map((row) => byId.get(row.id) ?? { ...row, seed: null });
}

// The body PUT /events/{id}/divisions takes, read off the ascending strip: the highest cut
// is the lower bound of the strongest division and the weakest one opens at no bound.
// The cuts and the names arrive as the strip holds them, lowest MMR first.
export const divisionsPayload = (cuts, names = []) => {
  const descending = [...names].reverse();
  return [...cuts].reverse().concat(null)
    .map((bound, index) => ({ name: descending[index] || `Division ${index + 1}`, lower_bound: bound }));
};

// The ascending cuts the strip opens on, read back from the stored divisions.
export const cutsOf = (divisions = []) => divisions
  .map((division) => division.lower_bound).filter((bound) => bound != null).reverse();

// The band names the strip prints, lowest MMR first.
export const bandNames = (divisions = []) => [...divisions]
  .map((division, index) => division.name || `Division ${division.position ?? index + 1}`).reverse();
