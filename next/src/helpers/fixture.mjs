// The pure parts of a fixture: the ordered series it holds, what each one plays, and who
// each side fields. A fixture pairs two team entrants in a round and holds series; a
// series has one opponent per side and a best-of.

import { teamRoster } from './entrants.mjs';
import { isScored, winnerSide } from './stage-view.mjs';

// How many players a side fields, the way the players say it
export const modeLabel = (sideSize) => `${sideSize || 1}v${sideSize || 1}`;

// How the two sides of a series are picked
export const PICK_RULES = { drafted: 'Drafted', any: 'Any pick' };
export const pickLabel = (rule) => PICK_RULES[rule] || PICK_RULES.any;

// Who one side of a series fields, in side order; empty until the side is named
export const sideRoster = (row, side) => (row?.sides || [])
  .filter((seat) => seat.side_no === side && seat.user)
  .sort((a, b) => a.user_id - b.user_id)
  .map((seat) => seat.user);

// The series of one fixture as the fixture page lists them: in play order, each with
// what it plays and how it ended.
export function fixtureRows(series = []) {
  return [...series]
    .sort((a, b) => (a.sequence ?? a.id) - (b.sequence ?? b.id))
    .map((row, index) => ({
      id: row.id,
      series: row,
      number: row.sequence ?? index + 1,
      mode: modeLabel(row.side_size),
      pick: pickLabel(row.pick_rule),
      scored: isScored(row),
      winner: winnerSide(row),
    }));
}

// The fixture score: how many series each side took. A series with no result counts for
// nobody, so the score reads the same before and after the last one is played.
export const fixtureScore = (series = []) => [1, 2]
  .map((side) => series.filter((row) => winnerSide(row) === side).length);

// The roster each side of a fixture fields for the event, keyed by entrant id. The series
// rows name the team standing on each side, so the entrants read is not needed.
export function fixtureRosters(series = [], teams = [], eventId = null) {
  const rosters = {};
  for (const row of series) {
    for (const side of [1, 2]) {
      const entrant = row[`entrant${side}_id`];
      const team = teams.find((one) => one.id === row[`team${side}`]?.id);
      if (entrant == null || !team) continue;
      rosters[entrant] = teamRoster(team, eventId);
    }
  }
  return rosters;
}
