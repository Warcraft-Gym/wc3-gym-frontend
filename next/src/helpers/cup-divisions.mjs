// A cup's divisions and seeds as its run page and its event page draw them. A cup chooses at
// creation whether it splits its players (`uses_divisions`); a cup that does not shows no division
// anywhere, so every helper here answers one field without a title for it.
import { bandOf } from './divisions.mjs';
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

/** Whether the cut on the strip differs from the divisions the cup has saved: another count, or
 *  another threshold. A cup with no divisions saved yet always differs.
 *  @param {number[]} cuts ascending thresholds @param {any[]} divisions */
export function cutChanged(cuts = [], divisions = []) {
  if (!divisions.length) return true;
  const saved = [...divisions]
    .sort((a, b) => b.position - a.position)
    .map((division) => division.lower_bound)
    .filter((bound) => bound != null);
  return saved.length !== cuts.length || saved.some((bound, index) => bound !== cuts[index]);
}

/** The divisions as saving this cut would make them, strongest first, before anything is saved.
 *  Saving places every player by the MMR of their signup race, the ones placed by hand included,
 *  and an unrated player in the weakest division, the backend's rule. Each row says the division
 *  it stands in today (`from`) when the cut moves it.
 *  @param {any[]} entrants @param {number[]} cuts ascending thresholds
 *  @param {string[]} names one per band, weakest first @param {any[]} divisions the saved ones */
export function previewDivisions(entrants = [], cuts = [], names = [], divisions = []) {
  const rows = playing(entrants);
  const current = new Map(divisions.map((division) => [division.id, division.name]));
  const bands = Array.from({ length: cuts.length + 1 }, (unused, index) => index).reverse();
  return bands.map((band) => {
    const title = names[band] || `Division ${cuts.length + 1 - band}`;
    const low = band === 0 ? null : cuts[band - 1];
    const high = band === cuts.length ? null : cuts[band];
    const members = rows
      .filter((row) => bandOf(entrantMmr(row) || 0, cuts) === band)
      .sort((a, b) => (entrantMmr(b) ?? 0) - (entrantMmr(a) ?? 0) || entrantName(a).localeCompare(entrantName(b)))
      .map((row) => {
        const today = row.division_id != null ? current.get(row.division_id) ?? null : null;
        return { ...row, from: divisions.length && today !== title ? today ?? 'no division' : null };
      });
    return { band, title, low, high, rows: members };
  });
}

/** How a preview band reads its MMR range: "1800+", "1500–1799" or "below 1500".
 *  @param {{ low: number | null, high: number | null }} band */
export const bandRange = ({ low, high }) =>
  low == null && high == null ? 'everyone' : low == null ? `below ${high}` : high == null ? `${low}+` : `${low}–${high - 1}`;

/** Whether the draw would leave a player out: a cup with divisions and a player in none of them.
 *  @param {any[]} entrants @param {any[]} divisions @param {boolean} usesDivisions */
export const unplaced = (entrants = [], divisions = [], usesDivisions = false) =>
  !!usesDivisions && divisions.length > 0 && playing(entrants).some((row) => !divisions.some((division) => division.id === row.division_id));

/** One group's players in seed order: the seeded by their seed, then the rest strongest first.
 *  @param {any[]} rows */
export const inSeedOrder = (rows = []) =>
  [...rows].sort((a, b) => (a.seed ?? Infinity) - (b.seed ?? Infinity) || (entrantMmr(b) ?? 0) - (entrantMmr(a) ?? 0) || entrantName(a).localeCompare(entrantName(b)));

/** The ids of a group after one player moves to seed `place` (1 is the top), dragged there or
 *  typed in; a place past either end is the end. Null when the player stays where it is.
 *  @param {any[]} rows @param {number} id @param {number} place */
export function placedOrder(rows, id, place) {
  const ids = rows.map((row) => row.id);
  const from = ids.indexOf(id);
  if (from < 0 || !Number.isFinite(place)) return null;
  const to = Math.min(Math.max(Math.round(place), 1), ids.length) - 1;
  if (to === from) return null;
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
