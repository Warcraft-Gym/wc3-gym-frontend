// A cup played over rounds: each round a competition of its own with its own copy of the cup's
// stages and the players checked in for it. The event read answers the rounds as `cup_legs`; a cup
// of one evening has none, and every helper here then answers as if the cup were one round.

/** The rounds of the cup in order, or an empty list.
 *  @param {any} event */
export const legsOf = (event) => [...(event?.cup_legs || [])].sort((a, b) => a.number - b.number);

/** The round a page opens on: the first one not finished, or the last.
 *  @param {any[]} legs */
export const openLegIndex = (legs) => {
  const open = legs.findIndex((leg) => !leg.finished_at);
  return open < 0 ? Math.max(legs.length - 1, 0) : open;
};

/** A round's name: the one it was given, or "Round n".
 *  @param {any} leg */
export const legTitle = (leg) => leg?.name || `Round ${leg?.number ?? ''}`.trim();

/** The stages one round plays, in play order; every stage when the cup has no rounds.
 *  @param {any[]} stages
 *  @param {any} leg */
export const legStages = (stages, leg) => {
  const sorted = [...stages].sort((a, b) => a.position - b.position);
  return leg ? sorted.filter((stage) => leg.stage_ids.includes(stage.id)) : sorted;
};

/** The entrants a round draws: the ones checked in for it; everyone when the cup has no rounds.
 *  @param {any[]} entrants
 *  @param {any} leg */
export const legField = (entrants, leg) => (leg ? entrants.filter((row) => leg.checked_in.includes(row.id)) : entrants);

/** Where a round stands: checking in, drawn and played, or finished.
 *  @param {any} leg
 *  @param {boolean} drawn */
export const legState = (leg, drawn) => (leg.finished_at ? 'finished' : drawn ? 'playing' : 'checkin');

/** The playing entry of this user: their own, or the cup team they play in. With `waiting` an
 *  entry on the cup's waitlist counts too, as it checks in for a round as one that is in does.
 *  @param {any[]} entrants
 *  @param {number | null | undefined} userId
 *  @param {{ waiting?: boolean }} [options] */
export const ownEntry = (entrants, userId, { waiting = false } = {}) =>
  userId
    ? entrants.find(
        (row) =>
          !row.withdrawn_at &&
          (waiting || !row.waitlisted_at) &&
          (row.user?.id === userId || row.user_id === userId || (row.roster || []).some((/** @type {any} */ one) => one.user?.id === userId)),
      ) || null
    : null;

/** One line of the overall table for a round's column: the place and points, or a dash for a
 *  round the entrant did not play.
 *  @param {any} row
 *  @param {any} leg */
export const legCell = (row, leg) => {
  const one = (row.legs || []).find((/** @type {any} */ item) => item.leg_id === leg.id);
  return one ? { place: one.place, points: one.points } : null;
};

/** Every round finished, so the cup's own Finish pays the overall table.
 *  @param {any[]} legs */
export const allLegsFinished = (legs) => legs.length > 0 && legs.every((leg) => !!leg.finished_at);
