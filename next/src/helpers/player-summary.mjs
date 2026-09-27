// The facts the Home stats panel shows about the player: the GNL seasons they took part in, the
// achievements they earned this season and overall, the best three of this season, and their GNL
// points this season. Every figure comes from reads the browser already makes, so no route is new.
import { stripPoints } from './round-strip.mjs';

/** The GNL seasons of a player's history (`GET /users/{id}/history`), newest first as it answers. */
export const gnlSeasons = (history) => (history?.events ?? []).filter((event) => event.kind === 'gnl');

/** How many GNL seasons the player took part in. */
export const seasonsPlayed = (history) => gnlSeasons(history).length;

/** The achievement figures from one ladder read per GNL season (`GET /users/{id}/ladder?season_id=`).
 *  `ladders` is `[{ seasonId, ladder }]`, with `ladder` null where the read failed: that season adds
 *  nothing, and `complete` says a count may be short. `thisSeason` is null when the current season
 *  has no ladder. The best three sort by points, then by name.
 *  @param {{ seasonId: number, ladder: any }[]} [ladders] @param {number|null} [currentSeasonId] */
export function achievementSummary(ladders = [], currentSeasonId = null) {
  const earned = (row) => row?.ladder?.achievements ?? [];
  const current = ladders.find((row) => Number(row.seasonId) === Number(currentSeasonId)) ?? null;
  const thisSeason = earned(current);
  return {
    thisSeason: current?.ladder ? thisSeason.length : null,
    overall: ladders.reduce((sum, row) => sum + earned(row).length, 0),
    top3: [...thisSeason].sort((a, b) => b.points - a.points || a.name.localeCompare(b.name)).slice(0, 3),
    complete: ladders.every((row) => row.ladder),
  };
}

/** The player's GNL points in a season: the points of their series under the season's score
 *  system, from the `/player-series` rows. Null when the player has no series yet. */
export const seasonScore = (series, playerId) => stripPoints(series, playerId);
