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

// On the reader's clock: "Check-in opens 10 Oct, 02:00" while the window is ahead, and "Check-in
// closes 16 Oct, 22:00" or "Check-in closed ..." when it closes before the round ends; else ''
export const checkinLine = (card) => {
  if (!card || card.over) return '';
  const stamp = (at) => at.toLocal().toFormat('d LLL, HH:mm');
  if (card.opens && !card.open && !card.shut) return `Check-in opens ${stamp(card.opens)}`;
  if (card.closesEarly) return `Check-in ${card.shut ? 'closed' : 'closes'} ${stamp(card.closes)}`;
  return '';
};

// The round in play: the first one not over in the event's zone. Null once every round is done.
/** @param {any[]} [rounds] @param {*} [today] @param {string|null} [zone] */
export const currentRound = (rounds = [], today = DateTime.now(), zone = null) => rounds.find(r => !roundOver(r, today, zone)) ?? null;

// One card per round of a season: the round window, the team the player's team
// meets, the player's series of that round, the answer they gave and the check-in
// window the server sends with the round. A season with no rounds falls back to the
// weeks its unplayed series carry. `answers` of null means no answers were read (yet),
// and every card is pending. `earlyCheckin` is the event switch that takes an answer
// before the window opens. A round ends at midnight in `zone`, else in UTC, as the server ends it.
export const roundCards = (
  { rounds = [], series = [], matches = [], teamId = null, answers = null, earlyCheckin = false, zone = null },
  today = DateTime.now(),
) => {
  const clock = zone || 'utc';
  const instant = (iso) => (iso ? DateTime.fromISO(iso, { zone: 'utc' }) : null);
  const weeks = rounds.length ? rounds : [...new Set(
    series.filter(isUnscored).map(s => s.match?.playday).filter(Boolean),
  )].sort((a, b) => a - b).map(playday => ({ playday }));

  let currentSeen = false;
  return weeks.map(round => {
    const over = roundOver(round, today, clock);
    const current = !over && !currentSeen;
    if (current) currentSeen = true;
    const match = matches.find(m => m.playday === round.playday && [m.team1_id, m.team2_id].includes(teamId));
    // No opening is open from sign-up; the close is the round's end, an early close or the event's close
    const opens = instant(round.checkin_opens_at);
    const closes = instant(round.checkin_closes_at);
    const endsAt = roundEnd(round, clock);
    const shut = !!closes && today >= closes;
    const open = opens === null ? !shut : today >= opens && !over && !shut;
    const answer = answers?.find(a => a.playday === round.playday) ?? null;
    // A round may hold more than one series of the player, so a list keeps every one
    const seriesList = series.filter(s => s.match?.playday === round.playday);
    return {
      playday: round.playday,
      label: roundLabel(round),
      // The name of the stage the round sits in; GET /player-series names it, another read leaves it null
      stageName: round.stage_name ?? null,
      over,
      current,
      opens,
      closes,
      open,
      shut,
      // The check-in closes before the round ends, so the card names the close
      closesEarly: !!closes && !!endsAt && closes < endsAt,
      // Early check-in takes an answer before the window opens; a closed window takes none
      takes: !over && !shut && (open || earlyCheckin),
      endsAt,
      series: seriesList[0] ?? null,
      seriesList,
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

/** The answer a round takes when the player presses one of its two buttons: the state he pressed,
 *  or no answer when he pressed the state it already holds.
 *  @param {boolean|null} current @param {boolean} want */
export const nextAnswer = (current, want) => (current === want ? null : want);

/** The way back from "sit out all remaining rounds": each round the bulk write turned out, with
 *  the answer it held before, and how many of them the ask named. A derived out on blocked times
 *  holds no stored answer, so its way back is no answer; a round with a series, or one already out
 *  on blocked times, was not in the ask, so it is not counted.
 *  @param {any[]} [before] the answers before the write @param {any[]} [rows] the answers after it
 *  @param {any[]} [cards] the round cards of the event */
export const sitOutUndo = (before = [], rows = [], cards = []) => {
  const rowOf = (playday) => before.find((item) => item.playday === playday);
  const held = (playday) => (rowOf(playday)?.blocked_out ? null : rowOf(playday)?.available ?? null);
  const paired = new Set(cards.filter((card) => card.series).map((card) => card.playday));
  const rounds = rows
    .filter((row) => row.available === false && held(row.playday) !== false)
    .map((row) => ({ playday: row.playday, available: held(row.playday) }));
  const count = rounds.filter((row) => !paired.has(row.playday) && !rowOf(row.playday)?.blocked_out).length;
  return { rounds, count };
};

// The chip of a round card with no series: the answer given, the pairing state, or
// the day the check-in opens, which is of use only to the player who checks in.
export const roundStateChip = (card, asks = true) => {
  const { title } = cardStatus(card);
  if (card.answer === false) return title;
  if (!asks) return card.over ? 'Not paired' : 'Not paired yet';
  if (card.answer === true) return title;
  if (card.over) return 'Not paired';
  if (!card.takes) return checkinLine(card) || 'Not paired yet';
  return title;
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
