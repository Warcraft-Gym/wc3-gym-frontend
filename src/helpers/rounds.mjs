import { DateTime } from 'luxon';
import { isUnscored } from './season-phase.mjs';

// "13 to 19 Sep", "28 Sep to 4 Oct", "13 Sep", or "Round n" for a round with no date
export const roundLabel = (round) => {
  if (!round?.start_date) return `Round ${round?.playday ?? '?'}`;
  const start = DateTime.fromISO(round.start_date);
  if (!round.end_date || round.end_date === round.start_date) return start.toFormat('d LLL');
  const end = DateTime.fromISO(round.end_date);
  return `${start.toFormat(start.hasSame(end, 'month') ? 'd' : 'd LLL')} to ${end.toFormat('d LLL')}`;
};

// A round is over the day after its window closes; a round with no date never is
export const roundOver = (round, today = DateTime.now()) => {
  const last = round?.end_date || round?.start_date;
  return !!last && DateTime.fromISO(last).endOf('day') < today;
};

// The round in play: the first one not over. Null once every round is done.
export const currentRound = (rounds = [], today = DateTime.now()) => rounds.find(r => !roundOver(r, today)) ?? null;

// One card per round of a season: the round window, the team the player's team
// meets, the player's series of that round, and the answer they gave. A season
// with no rounds falls back to the weeks its unplayed series carry.
export const roundCards = ({ rounds = [], series = [], matches = [], teamId = null, answers = [] }, today = DateTime.now()) => {
  const weeks = rounds.length ? rounds : [...new Set(
    series.filter(isUnscored).map(s => s.match?.playday).filter(Boolean),
  )].sort((a, b) => a - b).map(playday => ({ playday }));

  let currentSeen = false;
  return weeks.map(round => {
    const over = roundOver(round, today);
    const current = !over && !currentSeen;
    if (current) currentSeen = true;
    const match = matches.find(m => m.playday === round.playday && [m.team1_id, m.team2_id].includes(teamId));
    return {
      playday: round.playday,
      label: roundLabel(round),
      over,
      current,
      series: series.find(s => s.match?.playday === round.playday) ?? null,
      answer: answers.find(a => a.playday === round.playday)?.available ?? null,
      opponentTeam: (match && (match.team1_id === teamId ? match.team2 : match.team1)) ?? null,
    };
  });
};

const opponentName = (series, playerId) =>
  (series.player1_id === playerId ? series.player2 : series.player1)?.name ?? 'your opponent';

// The read-only line of one round card, read from the player's side. Null while
// the round is still open, which is where the Can play question belongs.
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
// and the round in play if he has not answered it. One line each, in round order.
// `asks` is false for a season that does not run the availability question.
export const waitingLines = (seasons = [], playerId = null) =>
  seasons.flatMap(({ season, cards = [], asks = true }) => cards.flatMap((card) => {
    if (card.series) {
      return isUnscored(card.series)
        ? [{
            key: `s${card.series.id}`,
            kind: 'series',
            series: card.series,
            text: `Round ${card.playday} · ${season.name} · vs ${opponentName(card.series, playerId)}`,
          }]
        : [];
    }
    if (card.over || !card.current || card.answer !== null || !asks) return [];
    return [{
      key: `r${season.id}-${card.playday}`,
      kind: 'round',
      seasonId: season.id,
      playday: card.playday,
      text: `Round ${card.playday} · ${season.name} · Can you play ${card.label}?`,
    }];
  }));
