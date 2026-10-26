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
  placement: [
    { role: 'last_round', title: 'Last round', hint: 'every other place, decided in the same round' },
    { role: 'final', title: 'Final', hint: 'places 1 and 2' },
  ],
};

/** @param {string | null | undefined} format */
export const partsOf = (format) => PARTS[/** @type {keyof typeof PARTS} */ (format)] || [];

/** The parts the editor lists under "Longer rounds": those the plan names, in bracket order. A
 *  part of another format, left over from a format change, is not one of them.
 *  @param {Record<string, number>} plan @param {string | null | undefined} format */
export const listedParts = (plan, format) => partsOf(format).filter((part) => plan?.[part.role]);

/** The parts "+ Another round" still offers: the format's parts the plan does not name.
 *  @param {Record<string, number>} plan @param {string | null | undefined} format */
export const freeParts = (plan, format) => partsOf(format).filter((part) => !plan?.[part.role]);

/** The best-of a newly listed part starts on: one step longer than the cup's, or one shorter
 *  when the cup already plays the longest.
 *  @param {number} bestOf */
export function stepFrom(bestOf) {
  const at = BEST_OFS.indexOf(Number(bestOf));
  if (at < 0) return BEST_OFS[0];
  return BEST_OFS[at + 1] ?? BEST_OFS[at - 1] ?? BEST_OFS[at];
}

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

/** The most games one series of the stage plays: what the map pool must hold. Only the parts
 *  the format plays count, as `planText` keeps them; a part of another format plays nothing.
 *  @param {number} bestOf @param {Record<string, number>} plan @param {string | null} format */
export const largestBestOf = (bestOf, plan, format) =>
  Math.max(Number(bestOf) || 1, ...partsOf(format).filter((part) => plan?.[part.role]).map((part) => Number(plan[part.role])));

/** One line for the stage: the early rounds, then every part that plays its own best-of.
 *  @param {number} bestOf @param {Record<string, number>} plan @param {string} format */
export function bestOfLine(bestOf, plan, format) {
  const own = partsOf(format).filter((part) => plan?.[part.role] && Number(plan[part.role]) !== Number(bestOf));
  if (!own.length) return `Bo${bestOf}`;
  return [`Bo${bestOf} early`, ...own.map((part) => `${part.title.toLowerCase()} Bo${plan[part.role]}`)].join(' · ');
}

/** What a pool this size cannot play, or null when every series has a map for each game.
 *  @param {number} size @param {number} bestOf @param {Record<string, number>} plan @param {string | null} format */
export function poolProblem(size, bestOf, plan, format) {
  const need = largestBestOf(bestOf, plan, format);
  if (size >= need) return null;
  return `A Bo${need} needs at least ${need} ${need === 1 ? 'map' : 'maps'} in the pool; it holds ${size}.`;
}
