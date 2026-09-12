// The public side of the events module (#36): what the caller may do with an event,
// how a stage draws as a bracket or as rounds, and the spoiler-free choice of the device.
import { isUnscored } from './season-phase.mjs';

// What the viewer's own button offers on an event page: sign up, withdraw, check in, or nothing
export const callerAction = (event, entrant) => {
  if (!event) return null;
  if (entrant && !entrant.withdrawn_at) {
    // checking in comes first while the window runs; an entrant who has checked in may still withdraw
    if (event.phase === 'checkin' && !entrant.checked_in_at) return 'checkin';
    return ['signups', 'checkin'].includes(event.phase) ? 'withdraw' : null;
  }
  return event.phase === 'signups' && event.signups_open !== false ? 'signup' : null;
};

export const ACTION_LABEL = { signup: 'Sign up', withdraw: 'Withdraw', checkin: 'Check in' };

// The state of one series as a reader reads it: a result, two known sides, or nothing yet
export const seriesState = (series) => {
  if (!series) return 'pending';
  if (!isUnscored(series)) return 'complete';
  return series.player1_id || series.player1 ? 'open' : 'pending';
};
export const STATE_LABEL = { complete: 'Complete', open: 'Open', pending: 'Pending' };
export const STATE_COLOR = { complete: 'draw', open: 'primary', pending: undefined };

export const roundLabel = (round) => round?.name || `Round ${round?.number ?? '?'}`;

// A round is keyed by its id; a payload that names only the number still groups
const roundKey = (round) => round?.id ?? round?.number;

// The rounds of a stage in order, each with its series; a round with no series is still drawn,
// because a stage names every round the moment it is generated
export const roundGroups = (rounds = [], series = []) => [...rounds]
  .sort((a, b) => (a.number ?? 0) - (b.number ?? 0))
  .map((round) => {
    const rows = series.filter((row) => roundKey(row.round ?? { id: row.round_id }) === roundKey(round));
    const state = !rows.length ? 'pending' : rows.every((row) => !isUnscored(row)) ? 'complete' : 'open';
    return { key: `round:${roundKey(round)}`, round, label: roundLabel(round), state, rows };
  });

// A single-elimination tree, one column per round. The last round holds one box, so a round
// n places back holds 2^n; a box with no series names the two boxes that feed it (NE-10).
// A series sits at `bracket_order`, its 0-based slot inside the round's full 2^n slots, so a
// round short of series (byes are not series) still places the ones it has on the right slots.
// `hidden` answers whether a series' result is held back, so a spoiler-free board blinds
// the sides a revealed-elsewhere result would give away.
export const bracketColumns = (rounds = [], series = [], hidden = () => false) => {
  const ordered = [...rounds].sort((a, b) => (a.number ?? 0) - (b.number ?? 0));
  if (!ordered.length) return [];
  const at = new Map(series.map((row) => [`${roundKey(row.round ?? { id: row.round_id })}:${row.bracket_order ?? 0}`, row]));

  const columns = ordered.map((round, index) => ({
    round,
    label: roundLabel(round),
    boxes: Array.from({ length: 2 ** (ordered.length - 1 - index) }, (_, position) => ({
      key: `${roundKey(round)}:${position}`,
      position,
      series: at.get(`${roundKey(round)}:${position}`) ?? null,
    })),
  }));

  // A box with no series reads off the column before it; the first column has nobody to read
  return columns.map((column, index) => ({
    ...column,
    boxes: column.boxes.map((box) => ({
      ...box,
      // an empty slot of a drawn first round is a bye; before the draw nobody is known yet
      feeders: index === 0 ? (box.series || !column.boxes.some((other) => other.series)
        ? ['To be decided', 'To be decided'] : ['Bye', 'Bye']) : [
        feederLabel(columns[index - 1], box.position * 2, index === 1),
        feederLabel(columns[index - 1], box.position * 2 + 1, index === 1),
      ],
      // A side whose feeder result is held back is named "Winner of" instead, or the box
      // would spoil the series the viewer has not revealed
      blind: [0, 1].map((side) => {
        const feeder = index === 0 ? null : columns[index - 1].boxes[box.position * 2 + side];
        return !!feeder?.series && hidden(feeder.series);
      }),
    })),
  }));
};

// "Winner of Semifinals, series 2", counting the slot, not the series that exist. An empty slot
// of a drawn first round is a bye: nobody plays it and its entrant is already through. A later
// round's empty slot only waits for its feeders, so it names them instead.
const feederLabel = (column, position, first) => {
  if (first && !column.boxes[position]?.series && column.boxes.some((box) => box.series)) return 'Bye';
  return `Winner of ${column.label}${column.boxes.length > 1 ? `, series ${position + 1}` : ''}`;
};

// The viewer's own spoiler choice, on this device only: one switch and the series he revealed
export const SPOILER_KEY = 'eventSpoiler';

export const loadSpoiler = () => {
  try {
    const stored = JSON.parse(localStorage.getItem(SPOILER_KEY) || '{}');
    return { hide: !!stored.hide, revealed: stored.revealed || {} };
  } catch {
    return { hide: false, revealed: {} };
  }
};

export const saveSpoiler = (state) => {
  try {
    localStorage.setItem(SPOILER_KEY, JSON.stringify(state));
  } catch {
    // a browser that stores nothing still reads the page
  }
};

// Whether this series' result is held back: the switch is on, the series has one, and
// the viewer has not asked for it
export const isHidden = (state, eventId, series) =>
  !!state.hide && seriesState(series) === 'complete' && !(state.revealed[eventId] || []).includes(series.id);

export const reveal = (state, eventId, seriesId) => ({
  ...state,
  revealed: { ...state.revealed, [eventId]: [...new Set([...(state.revealed[eventId] || []), seriesId])] },
});
