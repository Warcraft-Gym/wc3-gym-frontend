import { DEFAULT_RULES } from './best-of.mjs';

// A new season's veto: three bans a side, then a pick a side
export const DEFAULT_PICK_BAN = 'Ban_A|Ban_B|Ban_B|Ban_A|Ban_A|Ban_B|Pick_A|Pick_B';

// The steps the board knows, as the backend names them
export const PICK_BAN_STEPS = ['Ban_A', 'Ban_B', 'Pick_A', 'Pick_B'];

// The order as the season stores it, one step a list entry
export const orderOf = (pickBan) => (pickBan || '').split('|').filter(Boolean);

// The picks the games take and the bans the pool then allows, as the backend counts them: a veto or
// loser game draws its map from the picks, a fixed game takes one map off the board, and every map
// left after the picks may be banned
export const vetoLimits = (mapRules, poolSize) => {
  const rules = (mapRules || DEFAULT_RULES).split(',').map((rule) => rule.trim());
  const picksMax = rules.filter((rule) => rule === 'veto' || rule === 'loser').length;
  const vetoPool = Math.max(poolSize - (rules.includes('fixed') ? 1 : 0), 0);
  return { picksMax, bansMax: Math.max(vetoPool - picksMax, 0), vetoPool };
};

// Why the backend refuses this order on this pool, in its own words, or null
export const orderProblem = (order, mapRules, poolSize) => {
  const unknown = order.find((step) => !PICK_BAN_STEPS.includes(step));
  if (unknown) return `'${unknown}' is not a veto step. Valid steps are ${PICK_BAN_STEPS.join(', ')}.`;
  const { picksMax, bansMax } = vetoLimits(mapRules, poolSize);
  const picks = order.filter((step) => step.startsWith('Pick')).length;
  const bans = order.length - picks;
  if (picks > picksMax) return `The games take ${picksMax} picks, the order has ${picks}`;
  if (bans > bansMax) return `The pool allows ${bansMax} bans after ${picksMax} picks, the order has ${bans}`;
  return null;
};
