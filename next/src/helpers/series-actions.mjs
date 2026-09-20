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

// A side whose entrant names no player is the team itself, so any member of its roster acts; no payload names the roster, so the API answers for the member
const unnamedSide = (series) => [1, 2].some((side) => series[`entrant${side}_id`] && !series[`player${side}_id`]);

// The team and the event behind each side: the team an entrant side names, else the two teams of the fixture. A side row names no event of its own, so an entrant side matches a seat on its team alone.
const teamSides = (series) => {
  const entrants = [1, 2].filter((side) => series[`entrant${side}_id`]);
  if (entrants.length) return entrants.map((side) => [series[`team${side}`]?.id, null]);
  return series.match ? [1, 2].map((side) => [series.match[`team${side}_id`], series.match.season_id]) : [];
};

// The viewer captains the team a side fields: `/me` lists one seat per (team, event) pair he captains
const captainOfSide = (series, seats) => teamSides(series).some(([team, event]) => team != null
  && seats.some((seat) => Number(seat.team_id) === Number(team) && (event == null || Number(seat.season_id) === Number(event))));

/** Who may act on a series, the rule the API gate `acts_for_side` applies: the player a side names, a captain of the team that fields a side, a member of the roster of a side that names no player, and an admin, who acts for either side on the same routes.
 *  @param {any} series
 *  @param {{ id?: number|null, isAdmin?: boolean, seats?: { team_id: number, season_id: number }[] }} [viewer] */
export const actsForSeries = (series, { id = null, isAdmin = false, seats = [] } = {}) => {
  if (isAdmin) return true;
  if (id == null || !series) return false;
  if (series.player1_id === id || series.player2_id === id) return true;
  return captainOfSide(series, seats) || unnamedSide(series);
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

// How each rule gives the map of the game after the next one
const NEXT_MAP = { fixed: 'the round map', loser: 'the loser picks', veto: 'the veto gives it', host: 'the host picks' };

/** The map fact of a series: the next game to play, the map it plays, and the rule that gives the
 *  map after it. Null once every game is played. `games` names the map and the winner of each game.
 *  @param {string|null|undefined} mapRules
 *  @param {{ map?: string|null, winner?: string|null }[]} [games] */
export const seriesMapLine = (mapRules, games = []) => {
  const rules = rulesOf(mapRules);
  const index = games.findIndex((game) => !game.winner);
  if (index === -1) return null;
  const map = games[index]?.map || null;
  if (!map) return `Game ${index + 1} map: ${NEXT_MAP[rules[index]] ?? 'the reporter names it'}`;
  const after = NEXT_MAP[rules[index + 1]];
  return after ? `Game ${index + 1} on ${map}, then ${after}` : `Game ${index + 1} on ${map}`;
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
