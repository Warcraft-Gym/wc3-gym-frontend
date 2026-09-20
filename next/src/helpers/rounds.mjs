import { DateTime } from 'luxon';
import { seriesContext } from './series-actions.mjs';
import { isUnscored } from './season-phase.mjs';
import { checkInStatus } from './check-in.mjs';

// A round card read as the check-in answer it holds, so the card and the captain grid say one thing
export const cardStatus = (card) => checkInStatus({ available: card?.answer, blocked_out: card?.blocked });

// "13 to 19 Sep", "28 Sep to 4 Oct", "13 Sep", or "Round n" for a round with no date
export const roundLabel = (round) => {
  if (!round?.start_date) return `Round ${round?.playday ?? '?'}`;
  const start = DateTime.fromISO(round.start_date);
  if (!round.end_date || round.end_date === round.start_date) return start.toFormat('d LLL');
  const end = DateTime.fromISO(round.end_date);
  return `${start.toFormat(start.hasSame(end, 'month') ? 'd' : 'd LLL')} to ${end.toFormat('d LLL')}`;
};

// The instant a round ends: midnight after its last day in the event's zone, or null with no date
/** @param {*} round @param {string|null} [zone] */
export const roundEnd = (round, zone = null) => {
  const last = round?.end_date || round?.start_date;
  if (!last) return null;
  const end = DateTime.fromISO(last, zone ? { zone } : undefined).plus({ days: 1 }).startOf('day');
  return end.isValid ? end : null;
};

// A round is over once that midnight has passed; a round with no date never is
/** @param {*} round @param {*} [today] @param {string|null} [zone] */
export const roundOver = (round, today = DateTime.now(), zone = null) => {
  const end = roundEnd(round, zone);
  return !!end && end <= today;
};

// "Ends 27 Sep 00:00 Europe/Berlin · 26 Sep 18:00 your time", or '' for an event with no zone
/** @param {*} end @param {string|null} [zone] @param {string|null} [viewer] */
export const roundEndLine = (end, zone = null, viewer = null) => {
  if (!end || !zone) return '';
  const stamp = (dt) => dt.toFormat('d LLL HH:mm');
  const mine = viewer && viewer !== zone ? end.setZone(viewer) : null;
  return `Ends ${stamp(end)} ${zone}${mine?.isValid ? ` · ${stamp(mine)} your time` : ''}`;
};

// "Check-in opens 10 Oct" for a round whose window is still ahead; '' once it has opened
export const checkinOpensLine = (card) => (card?.opens && !card.open ? `Check-in opens ${card.opens.toFormat('d LLL')}` : '');

// The round in play: the first one not over. Null once every round is done.
export const currentRound = (rounds = [], today = DateTime.now()) => rounds.find(r => !roundOver(r, today)) ?? null;

// One card per round of a season: the round window, the team the player's team
// meets, the player's series of that round, the answer they gave and the check-in
// window. A season with no rounds falls back to the weeks its unplayed series carry.
// `answers` of null means no answers were read (yet), and every card is pending.
// `earlyCheckin` is the event switch that takes an answer before the window opens.
export const roundCards = (
  { rounds = [], series = [], matches = [], teamId = null, answers = null, checkinDays = null, earlyCheckin = false, zone = null },
  today = DateTime.now(),
) => {
  const weeks = rounds.length ? rounds : [...new Set(
    series.filter(isUnscored).map(s => s.match?.playday).filter(Boolean),
  )].sort((a, b) => a - b).map(playday => ({ playday }));

  let currentSeen = false;
  return weeks.map(round => {
    const over = roundOver(round, today, zone);
    const current = !over && !currentSeen;
    if (current) currentSeen = true;
    const match = matches.find(m => m.playday === round.playday && [m.team1_id, m.team2_id].includes(teamId));
    // The check-in window opens checkinDays before the round starts; a season
    // that names no checkin_days has no window, so the check-in is always open
    const opens = round.start_date && checkinDays != null
      ? DateTime.fromISO(round.start_date, { zone: 'utc' }).minus({ days: checkinDays })
      : null;
    const open = opens === null ? true : today >= opens && !over;
    const answer = answers?.find(a => a.playday === round.playday) ?? null;
    return {
      playday: round.playday,
      label: roundLabel(round),
      over,
      current,
      opens,
      open,
      // Early check-in takes an answer before the window opens; a round that is over takes none
      takes: !over && (open || earlyCheckin),
      endsAt: roundEnd(round, zone),
      series: series.find(s => s.match?.playday === round.playday) ?? null,
      // An unread answer is not "no answer": a pending card draws no state of its own
      pending: answers === null,
      answer: answer?.available ?? null,
      // A derived row is the player's own blocks covering the whole round, never a stored answer
      blocked: !!answer?.blocked_out,
      setBy: answer?.set_by_name ?? null,
      setById: answer?.set_by_user_id ?? null,
      opponentTeam: (match && (match.team1_id === teamId ? match.team2 : match.team1)) ?? null,
    };
  });
};

// The chip of a round card with no series: the answer given, the pairing state, or
// the day the check-in opens, which is of use only to the player who checks in.
export const roundStateChip = (card, asks = true) => {
  const { title } = cardStatus(card);
  if (card.answer === false) return title;
  if (!asks) return card.over ? 'Not paired' : 'Not paired yet';
  if (card.answer === true) return title;
  if (card.over) return 'Not paired';
  if (!card.takes) return checkinOpensLine(card) || 'Not paired yet';
  return title;
};

const opponentName = (series, playerId) =>
  (series.player1_id === playerId ? series.player2 : series.player1)?.name ?? 'your opponent';

// The read-only line of one round card, read from the player's side. Null while
// the round is still open, which is where the check-in belongs.
export const roundLine = (card, playerId, when = '') => {
  const series = card?.series;
  if (!series) return card?.over ? 'Not paired' : null;
  const mine = series.player1_id === playerId;
  const name = opponentName(series, playerId);
  if (isUnscored(series)) return [`vs ${name}`, when].filter(Boolean).join(' · ');
  const my = (mine ? series.player1_score : series.player2_score) ?? 0;
  const theirs = (mine ? series.player2_score : series.player1_score) ?? 0;
  return `Played · ${my > theirs ? 'won' : my < theirs ? 'lost' : 'drew'} vs ${name}`;
};

// What the player still owes, over every season he is in: a series with no result,
// and every round whose check-in window is open and unanswered. One line each, in
// round order. `asks` is false for a season that does not run the check-in.
export const waitingLines = (seasons = [], playerId = null) =>
  seasons.flatMap(({ season, cards = [], asks = true }) => cards.flatMap((card) => {
    if (card.series) {
      return isUnscored(card.series)
        ? [{
            key: `s${card.series.id}`,
            kind: 'series',
            series: card.series,
            text: seriesContext(card.series, { event: season, round: card.playday, playerId }),
          }]
        : [];
    }
    // Without a window only the round in play asks; a pending round asks nothing
    if (card.pending || !(card.opens ? card.open : card.current) || card.answer !== null || !asks) return [];
    return [{
      key: `r${season.id}-${card.playday}`,
      kind: 'round',
      seasonId: season.id,
      playday: card.playday,
      text: [seriesContext(null, { event: season, round: card.playday }), `Check in for ${card.label}`].join(' - '),
    }];
  }));
