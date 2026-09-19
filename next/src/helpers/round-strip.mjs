// The round strip of one player in one event: one mark per round, and the words its
// tooltip and its label read. The mark names the winner of the series; the margin
// lives in the tooltip, so best of 1, 3 and 5 all draw the same strip.
import { isUnscored } from './season-phase.mjs';

const WORD = { won: 'Won', lost: 'Lost', drawn: 'Drew' };

// One series through the eyes of one player: how it ended, the score in his order, his opponent
const sideOf = (series, playerId) => {
  const mine = series.player1_id === playerId;
  const [me, them] = mine ? [series.player1_score, series.player2_score] : [series.player2_score, series.player1_score];
  return {
    result: isUnscored(series) ? 'pending' : me > them ? 'won' : me < them ? 'lost' : 'drawn',
    score: `${me}-${them}`,
    opponent: (mine ? series.player2 : series.player1) ?? null,
    opponentRace: mine ? series.player2_race : series.player1_race,
    // the rating the row names on that race; null where the payload carries none
    opponentMmr: (mine ? series.player2_mmr : series.player1_mmr) ?? null,
  };
};

/** One mark per round of the event. `state` is 'won', 'lost', 'mixed' (one won and one
 *  lost in that round), 'pending' (a series still to play) or 'none' (no series). */
export const roundMarks = (series = [], playerId, roundCount = 0) =>
  Array.from({ length: roundCount }, (_, index) => {
    const round = index + 1;
    const list = series
      .filter((row) => row.match?.playday === round && (row.player1_id === playerId || row.player2_id === playerId))
      .map((row) => sideOf(row, playerId));
    const won = list.filter((one) => one.result === 'won').length;
    const lost = list.filter((one) => one.result === 'lost').length;
    const state = !list.length ? 'none'
      : list.some((one) => one.result === 'pending') ? 'pending'
        : won && lost ? 'mixed' : won ? 'won' : lost ? 'lost' : 'none';
    return { round, state, series: list };
  });

// The first line of one series in a tooltip: the round and the result
export const seriesHead = (round, one) => `Round ${round} · ${one.result === 'pending' ? 'To play' : `${WORD[one.result]} ${one.score}`}`;

// What one mark says to a screen reader: every series it holds, with the opponent named
export const markText = (mark) => (mark.series.length
  ? mark.series.map((one) => `${seriesHead(mark.round, one)}, vs ${one.opponent?.name ?? 'an unnamed player'}`).join('; ')
  : `Round ${mark.round} · No series`);

// The record beside the strip, and the rounds the player has a result in
export const stripRecord = (marks = []) => marks.reduce((sum, mark) => {
  const won = mark.series.filter((one) => one.result === 'won').length;
  const lost = mark.series.filter((one) => one.result === 'lost').length;
  return { wins: sum.wins + won, losses: sum.losses + lost, played: sum.played + (won || lost ? 1 : 0) };
}, { wins: 0, losses: 0, played: 0 });

// The one name the whole strip carries, because the strip is one keyboard stop
export const stripLabel = (marks = []) => {
  const { wins, losses, played } = stripRecord(marks);
  return `Won ${wins}, lost ${losses}, played ${played} of ${marks.length} rounds`;
};
