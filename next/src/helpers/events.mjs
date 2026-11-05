// What a player can do with a season: sign up, ask an admin, or nothing; an absent signups_open reads as open
export function seasonAction(season) {
  const action = { open: 'signup', commenced: 'request', overdue: 'request' }[season?.phase] ?? null;
  return action === 'signup' && season.signups_open === false ? 'request' : action;
}

// Why My Season offers the token admin no sign up: it holds no Discord account
export const SUPERADMIN_SIGNUP_NOTE = 'The admin token has no player account, so it cannot sign up. Sign in as a player to sign up.';

// What the next round's check-in shows the caller when he has not answered it and his own
// blocks cover the whole round window. Blocks inform: the hint offers the answer and the
// player writes it, so nothing here refuses anyone.
export const blocksHint = (row) => (row?.availability_hint === 'blocked_by_blocks'
  ? { title: 'Your blocks cover this round', text: 'Sit out' }
  : null);

// The one button an event page offers a member, from the action word /me/events answers.
// `checked_in` reads as a chip and `closed` offers nothing, so both answer null.
const ACTION_BUTTON = {
  sign_up: { text: 'Sign up', icon: 'mdi-account-plus', color: 'primary', variant: 'elevated' },
  withdraw: { text: 'Withdraw', icon: 'mdi-account-remove', color: 'error', variant: 'outlined' },
  check_in: { text: 'Check in', icon: 'mdi-check', color: 'primary', variant: 'elevated' },
  // a signup on a cup's waitlist leaves it the way a signup withdraws
  waitlisted: { text: 'Leave the waitlist', icon: 'mdi-account-clock', color: 'error', variant: 'outlined' },
  view: { text: 'View the stage', icon: 'mdi-tournament', color: 'primary', variant: 'outlined' },
};

export const eventActionButton = (action) => ACTION_BUTTON[action] ?? null;

/** The word of the second button a cup's player gets, or null. Check-in takes the one action, and
 *  the player may still leave beside it; a team leaves on its own panel, and every other kind of
 *  event keeps its one action.
 *  @param {any} row a GET /me/events row @param {any} event */
export const leaveWord = (row, event) => {
  if (event?.kind !== 'cup' || event.team_size || !['check_in', 'checked_in'].includes(row?.action)) return null;
  return row.waitlisted ? 'waitlisted' : 'withdraw';
};

// The Events tab's card button from the caller's own /me/events row. Every card button opens
// the cup, so it names where the caller stands; an action to take is filled, a state is outlined.
const CARD_BUTTON = {
  sign_up: { text: ACTION_BUTTON.sign_up.text, outline: false },
  check_in: { text: ACTION_BUTTON.check_in.text, outline: false },
  withdraw: { text: 'Signed up', outline: true },
  checked_in: { text: 'Checked in', outline: true },
  waitlisted: { text: 'On the waitlist', outline: true },
  closed: { text: 'View', outline: true },
};

/** The card button for the caller's row: a joined event that runs reads "Signed up", and one
 *  closed to the caller "View". A guest, or an event with no row, reads its phase: "Sign up"
 *  while sign-ups stand open, else "View", since only an entrant checks in.
 *  @param {any} row a GET /me/events row @param {string | null} [state] the event's `stateOf` */
export const cardButton = (row, state = null) => {
  if (row?.action === 'view') return row.joined ? CARD_BUTTON.withdraw : CARD_BUTTON.closed;
  return CARD_BUTTON[row?.action] ?? (state === 'signups_open' ? CARD_BUTTON.sign_up : CARD_BUTTON.closed);
};

// The action word the home card and the event page both act on: a withdraw asks once,
// then the store call and the reload. It answers the sentence a failure reads, or null,
// so each page keeps its own loading flag. `sign_up` and `view` never reach here, because
// one opens its own dialog and the other scrolls its own draw. A withdraw with a race
// gives back that race alone; without one, every race the caller entered goes. Once a cup is
// drawn the question says the withdraw forfeits every match still open.
export async function actOnEvent(action, { store, eventId, row, reload, race = null, raceName = race, drawn = false }) {
  if (action === 'waitlisted') {
    if (!globalThis.confirm('Leave the waitlist?')) return null;
    action = 'withdraw';
  } else {
    const question = (race ? `Withdraw ${raceName}?` : 'Withdraw from this event? Every race you entered is withdrawn.')
      + (drawn ? ' You forfeit every match you still have, and your opponents go through.' : '');
    if (action === 'withdraw' && !globalThis.confirm(question)) return null;
  }
  try {
    if (action === 'withdraw') await store.withdraw(eventId, race);
    if (action === 'check_in') await store.checkInRow(row);
    await reload();
    return null;
  } catch (error) {
    return `That did not go through: ${error.message}`;
  }
}

// The call a check-in makes, from the shape the event answers: an event checks in through the
// caller's own entrant row, a round through the next round's availability. Every caller
// dispatches here, so the two shapes are decided in one place.
export function checkInFor(row) {
  if (row?.checkin_shape === 'round') {
    return { shape: 'round', answer: { season_id: row.id, playday: row.next_round?.number, available: true } };
  }
  return { shape: 'event', event_id: row?.id, entrant_id: row?.entrant_id };
}

// A viewer who says he wants no results keeps that answer past a logout, so the key
// stays out of SESSION_KEYS. One key for the whole app: the switch is the viewer's.
const HIDE_RESULTS_KEY = 'hideResults';

// The Vue provide key the stage drawing reads the switch through; a Symbol, so it can
// never be confused with the storage key above
export const HIDE_RESULTS = Symbol('hideResults');

export function hideResultsStored(store = globalThis.localStorage) {
  try {
    return store.getItem(HIDE_RESULTS_KEY) === '1';
  } catch {
    return false;  // a browser with storage blocked shows the results
  }
}

export function storeHideResults(on, store = globalThis.localStorage) {
  try {
    if (on) store.setItem(HIDE_RESULTS_KEY, '1');
    else store.removeItem(HIDE_RESULTS_KEY);
  } catch {
    // a browser with storage blocked forgets the choice on the next load
  }
}
