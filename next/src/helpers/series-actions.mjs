// The three steps two sides take on a series, in order: agree a time, veto the maps, report the result
import { DateTime } from 'luxon';
import { rulesOf } from './map-order.mjs';
import { isUnscored } from './season-phase.mjs';

const STEP_ORDER = ['schedule', 'veto', 'report'];
const STEP_LABEL = { schedule: 'Schedule', veto: 'Veto maps', report: 'Report result' };

// A game draws its map from the board under the veto and the loser rules, and a series with no rules plays the loser rule
export const needsVeto = (series) => rulesOf(series?.rules?.map_rules).some((rule) => rule === 'veto' || rule === 'loser');

// The board is done once both sides have picked; the series payload carries one pick a side
const vetoDone = (series) => !!series?.player1_pick_map && !!series?.player2_pick_map;

// A team side names no player of its own, so any signed-in member may act and the API answers whether he acts for the side
const teamSided = (series) => !!series
  && (!!series.entrant1_id || !!series.entrant2_id || (!series.match && !series.player1_id && !series.player2_id));

/** Who may act on a series: the two players and a rostered member of a team side, the rule the API gate `acts_for_side` applies, and an admin, who takes the admin routes instead.
 *  @param {any} series
 *  @param {{ id?: number|null, isAdmin?: boolean }} [viewer] */
export const actsForSeries = (series, { id = null, isAdmin = false } = {}) => {
  if (isAdmin) return true;
  if (id == null || !series) return false;
  if (series.player1_id === id || series.player2_id === id) return true;
  return teamSided(series);
};

// A series is played once its booked time has passed; one with no time never is
const seriesPlayed = (series, now) =>
  !!series?.date_time && DateTime.fromISO(series.date_time, { zone: 'utc' }) <= now;

/** The three steps of one series for one viewer: each with its word and its state (`done`, `next`, `later`, `not needed`), which step comes next, and whether the viewer may act.
 *  @param {any} series
 *  @param {{ id?: number|null, isAdmin?: boolean }} [viewer]
 *  @param {any} [now] */
export const seriesSteps = (series, viewer = {}, now = DateTime.now()) => {
  // ponytail: no payload carries a scheduling mode of assigned or immediate yet, so the schedule step is always needed
  const needed = { schedule: true, veto: needsVeto(series), report: true };
  const done = {
    schedule: !!series?.date_time,
    veto: vetoDone(series),
    report: !!series && !isUnscored(series),
  };
  // A reported series has nothing left to take, and once the booked time has passed the result leads, because a missing veto warns and never blocks
  const next = done.report ? null
    : seriesPlayed(series, now) ? 'report'
    : STEP_ORDER.find((step) => needed[step] && !done[step]) ?? null;
  const steps = STEP_ORDER.map((step) => ({
    step,
    // Every step keeps its own word; the report step alone renames itself once the score stands
    label: step === 'report' && done.report ? 'Edit result' : STEP_LABEL[step],
    state: done[step] ? 'done' : !needed[step] || done.report ? 'not needed' : step === next ? 'next' : 'later',
  }));
  return { steps, next, mayAct: actsForSeries(series, viewer) };
};

/** The other side of a series, read from one player's side. Null when the series is not his.
 *  @param {any} series @param {number|null} [playerId] */
const opponentOf = (series, playerId) => {
  if (playerId == null) return null;
  if (series?.player1_id === playerId) return series?.player2 ?? null;
  if (series?.player2_id === playerId) return series?.player1 ?? null;
  return null;
};

/** Where a series sits: "GNL - Season 19 - Regular season - Round 2 - vs Scorch". A part the series names no value for is left out with its separator. The opponent shows only for a player of the series. `event` of false leaves the event out, where the page title already names it.
 *  @param {any} series
 *  @param {{ event?: any, stage?: any, round?: number|null, playerId?: number|null }} [options] */
export const seriesContext = (series, { event = null, stage = null, round = null, playerId = null } = {}) => {
  const run = event === false ? null : event ?? series?.match?.season ?? null;
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
