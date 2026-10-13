// A cup's divisions and seeds as its run page and its event page draw them. A cup chooses at
// creation whether it splits its players (`uses_divisions`); a cup that does not shows no division
// anywhere, so every helper here answers one field without a title for it.
import { entrantMmr, entrantName } from './entrants.mjs';

// The players a draw plays: neither withdrawn nor waiting on the waitlist
const playing = (rows) => rows.filter((row) => !row.withdrawn_at && !row.waitlisted_at);

/** The groups a cup lists its players in: one per division, strongest first, then "Not in a
 *  division" only while a player stands in none. A cup without divisions is one untitled group.
 *  @param {any[]} entrants @param {any[]} divisions @param {boolean} usesDivisions */
export function divisionGroups(entrants = [], divisions = [], usesDivisions = false) {
  const rows = playing(entrants);
  if (!usesDivisions || !divisions.length) return [{ id: null, title: null, rows }];
  const ordered = [...divisions].sort((a, b) => a.position - b.position);
  const groups = ordered.map((division) => ({ id: division.id, title: division.name, rows: rows.filter((row) => row.division_id === division.id) }));
  const loose = rows.filter((row) => !ordered.some((division) => division.id === row.division_id));
  return loose.length ? [...groups, { id: null, title: 'Not in a division', rows: loose }] : groups;
}

/** Whether the draw would leave a player out: a cup with divisions and a player in none of them.
 *  @param {any[]} entrants @param {any[]} divisions @param {boolean} usesDivisions */
export const unplaced = (entrants = [], divisions = [], usesDivisions = false) =>
  !!usesDivisions && divisions.length > 0 && playing(entrants).some((row) => !divisions.some((division) => division.id === row.division_id));

/** One group's players in seed order: the seeded by their seed, then the rest strongest first.
 *  @param {any[]} rows */
export const inSeedOrder = (rows = []) =>
  [...rows].sort((a, b) => (a.seed ?? Infinity) - (b.seed ?? Infinity) || (entrantMmr(b) ?? 0) - (entrantMmr(a) ?? 0) || entrantName(a).localeCompare(entrantName(b)));

/** The ids of a group after one player moves `step` places up (-1) or down (+1); a move past
 *  either end leaves the order as it is.
 *  @param {any[]} rows @param {number} id @param {number} step */
export function movedOrder(rows, id, step) {
  const ids = rows.map((row) => row.id);
  const from = ids.indexOf(id);
  const to = from + step;
  if (from < 0 || to < 0 || to >= ids.length) return ids;
  ids.splice(to, 0, ...ids.splice(from, 1));
  return ids;
}

/** The body of one seed write: by MMR, shuffled, or a manual order, for one division or, on a
 *  cup without divisions, for the whole field.
 *  @param {string} source @param {number|null} divisionId @param {number[]} [order] */
export const seedBody = (source, divisionId, order) => ({
  source,
  ...(order ? { order } : {}),
  ...(divisionId != null ? { division_id: divisionId } : {}),
});
