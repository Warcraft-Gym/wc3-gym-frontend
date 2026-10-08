// The best-of of each part of a cup's bracket, mirroring app/core/best_of.py. The field size is
// unknown when the cup is made, so a part names a place counted back from the end, never a round
// number. The stage stores the plan as "semifinal:3,final:5"; a part it leaves out plays the
// stage's own best_of, which the form calls the early rounds.

export const BEST_OFS = [1, 3, 5];

// The parts a format names, latest last, so the form reads down the bracket
export const PARTS = {
  single_elimination: [
    { role: 'quarterfinal', title: 'Quarterfinals' },
    { role: 'semifinal', title: 'Semifinals' },
    { role: 'final', title: 'Final', hint: 'and the match for third place' },
  ],
  double_elimination: [
    { role: 'upper_semifinal', title: 'Upper semifinal' },
    { role: 'upper_final', title: 'Upper final' },
    { role: 'lower_semifinal', title: 'Lower semifinal' },
    { role: 'lower_final', title: 'Lower final' },
    { role: 'grand_final', title: 'Grand final', hint: 'and its reset' },
  ],
};

/** @param {string | null | undefined} format */
export const partsOf = (format) => PARTS[/** @type {keyof typeof PARTS} */ (format)] || [];

/** The plan the stage stores, as an object of part to best-of.
 *  @param {string | null | undefined} text
 *  @returns {Record<string, number>} */
export function parsePlan(text) {
  /** @type {Record<string, number>} */
  const plan = {};
  for (const token of (text || '').split(',')) {
    const [role, games] = token.split(':').map((part) => part.trim());
    if (role && /^\d+$/.test(games || '')) plan[role] = Number(games);
  }
  return plan;
}

/** The text the stage stores: only the parts the format names that play their own best-of.
 *  @param {Record<string, number>} plan @param {string} format @param {number} bestOf */
export const planText = (plan, format, bestOf) =>
  partsOf(format)
    .filter((part) => plan?.[part.role] && Number(plan[part.role]) !== Number(bestOf))
    .map((part) => `${part.role}:${plan[part.role]}`)
    .join(',') || null;

/** The most games one series of the stage plays: what the map pool must hold.
 *  @param {number} bestOf @param {Record<string, number>} plan */
export const largestBestOf = (bestOf, plan) => Math.max(Number(bestOf) || 1, ...Object.values(plan || {}).map(Number));

/** One line for the stage: the early rounds, then every part that plays its own best-of.
 *  @param {number} bestOf @param {Record<string, number>} plan @param {string} format */
export function bestOfLine(bestOf, plan, format) {
  const own = partsOf(format).filter((part) => plan?.[part.role] && Number(plan[part.role]) !== Number(bestOf));
  if (!own.length) return `Bo${bestOf}`;
  return [`Bo${bestOf} early`, ...own.map((part) => `${part.title.toLowerCase()} Bo${plan[part.role]}`)].join(' · ');
}

/** What a pool this size cannot play, or null when every series has a map for each game.
 *  @param {number} size @param {number} bestOf @param {Record<string, number>} plan */
export function poolProblem(size, bestOf, plan) {
  const need = largestBestOf(bestOf, plan);
  if (size >= need) return null;
  return `A Bo${need} needs at least ${need} ${need === 1 ? 'map' : 'maps'} in the pool; it holds ${size}.`;
}
