// One row per opponent for the head to head card: the series record, the games
// behind it, every race matchup played, and the seasons the two met in.

const scored = (m) => m.my_score != null && m.their_score != null;

// Counted in first-seen order, so ties keep the order the meetings arrived in
const tally = (keyOf, meetings) => {
  const counts = new Map();
  for (const meeting of meetings) {
    const key = keyOf(meeting);
    if (key == null) continue;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
};

export const opponentRows = (opponents = []) => opponents.map((opponent) => {
  const meetings = opponent.meetings ?? [];
  const played = meetings.filter(scored);
  const record = {
    won: played.filter((m) => m.my_score > m.their_score).length,
    lost: played.filter((m) => m.my_score < m.their_score).length,
  };
  const games = played.reduce(
    (sum, m) => ({ mine: sum.mine + m.my_score, theirs: sum.theirs + m.their_score }),
    { mine: 0, theirs: 0 },
  );
  const matchups = [...tally((m) => (m.my_race && m.their_race ? `${m.my_race}|${m.their_race}` : null), meetings)]
    .map(([pair, count]) => ({ mine: pair.split('|')[0], theirs: pair.split('|')[1], count }))
    .sort((a, b) => b.count - a.count);
  const names = new Map(meetings.map((m) => [m.season_id, m.season_name]));
  const seasons = [...tally((m) => m.season_id, meetings)]
    .sort(([a], [b]) => a - b)
    .map(([id, count]) => ({ id, name: names.get(id), count }));
  const lastMet = [opponent.last_season_name, opponent.last_playday ? `round ${opponent.last_playday}` : null]
    .filter(Boolean).join(', ');
  return { opponent, record, games, matchups, seasons, lastMet };
});
