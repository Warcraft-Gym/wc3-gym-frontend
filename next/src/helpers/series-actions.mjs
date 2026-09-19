// The three steps two sides take on a series, in order: agree a time, veto the maps,
// report the result. One rule set answers them for every surface that draws them.
import { rulesOf } from './map-order.mjs';
import { isUnscored } from './season-phase.mjs';

export const STEP_ORDER = ['schedule', 'veto', 'report'];
export const STEP_LABEL = { schedule: 'Schedule', veto: 'Veto maps', report: 'Report result' };
// A step already taken keeps its place and names what it left behind. The schedule step
// names the time it booked, which only the surface can read in the viewer's own zone.
export const DONE_LABEL = { veto: 'Veto done', report: 'Edit result' };

// A game draws its map from the veto board under the veto and the loser rules, so a
// series of fixed and host games alone leaves the board nothing to do. A series that
// carries no rules plays the default, which is a loser rule.
export const needsVeto = (series) => rulesOf(series?.rules?.map_rules).some((rule) => rule === 'veto' || rule === 'loser');

// The board is done once both sides have picked; the series payload carries one pick a side.
export const vetoDone = (series) => !!series?.player1_pick_map && !!series?.player2_pick_map;

// A team side names no player of its own, so any signed-in member may act on it and the
// API answers whether he acts for the side; the 403 reads as the surface's alert.
export const teamSided = (series) => !!series
  && (!!series.entrant1_id || !!series.entrant2_id || (!series.match && !series.player1_id && !series.player2_id));

/** Who may act on a series, as the backend gates it (`acts_for_side`): the two players,
 *  a rostered member of the team that fields a side, and an admin. A stricter rule here
 *  would draw buttons that answer 403 or hide ones that work, so it stays one function.
 *  @param {any} series
 *  @param {{ id?: number|null, isAdmin?: boolean }} [viewer] */
export const actsForSeries = (series, { id = null, isAdmin = false } = {}) => {
  if (isAdmin) return true;
  if (id == null || !series) return false;
  if (series.player1_id === id || series.player2_id === id) return true;
  return teamSided(series);
};

/** The three steps of one series for one viewer: each with its word and its state
 *  (`done`, `next`, `later`, `not needed`), which step comes next, and whether the
 *  viewer may act at all.
 *  @param {any} series
 *  @param {{ id?: number|null, isAdmin?: boolean }} [viewer] */
export const seriesSteps = (series, viewer = {}) => {
  // ponytail: a scheduling mode of assigned or immediate needs no time from the players,
  // and no payload carries it yet, so the schedule step is always needed
  const needed = { schedule: true, veto: needsVeto(series), report: true };
  const done = {
    schedule: !!series?.date_time,
    veto: vetoDone(series),
    report: !!series && !isUnscored(series),
  };
  // A reported series has nothing left to take, so the steps it never took fall away
  const next = done.report ? null : STEP_ORDER.find((step) => needed[step] && !done[step]) ?? null;
  const steps = STEP_ORDER.map((step) => ({
    step,
    label: (done[step] && DONE_LABEL[step]) || STEP_LABEL[step],
    state: done[step] ? 'done' : !needed[step] || done.report ? 'not needed' : step === next ? 'next' : 'later',
  }));
  return { steps, next, mayAct: actsForSeries(series, viewer) };
};

/** The other side of a series, read from one player's side. Null when the series is not his.
 *  @param {any} series @param {number|null} [playerId] */
export const opponentOf = (series, playerId) => {
  if (playerId == null) return null;
  if (series?.player1_id === playerId) return series?.player2 ?? null;
  if (series?.player2_id === playerId) return series?.player1 ?? null;
  return null;
};

/** Where a series sits: "GNL - Season 19 - Regular season - Round 2 - vs Scorch". A part
 *  the series names no value for is left out with its separator. The opponent shows only
 *  for a player of the series.
 *  @param {any} series
 *  @param {{ event?: any, stage?: any, round?: number|null, playerId?: number|null }} [options] */
export const seriesContext = (series, { event = null, stage = null, round = null, playerId = null } = {}) => {
  const run = event ?? series?.match?.season ?? null;
  const playday = round ?? series?.match?.playday ?? null;
  const mine = playerId != null && [series?.player1_id, series?.player2_id].includes(playerId);
  const league = run?.league_short_name || run?.league_name || null;
  const name = run?.name || run?.season_name || null;
  return [
    // an event name that already opens with its league, "GNL S18", says it once
    league && !String(name ?? '').toLowerCase().startsWith(league.toLowerCase()) ? league : null,
    name,
    stage?.name || null,
    playday ? `Round ${playday}` : null,
    mine ? `vs ${opponentOf(series, playerId)?.name ?? 'your opponent'}` : null,
  ].filter(Boolean).join(' - ');
};
