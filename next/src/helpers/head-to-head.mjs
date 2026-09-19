// One row per opponent for the head to head card: the series record, the games
// behind it, every race matchup played, and the events of every kind the two met in.
import { eventLabel } from './event-labels.mjs';

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
  // One entry per event met in, of any kind, oldest event first
  const met = new Map();
  for (const meeting of meetings) {
    const seen = met.get(meeting.season_id);
    if (seen) seen.count += 1;
    else met.set(meeting.season_id, {
      id: meeting.season_id, name: eventLabel(meeting), kind: meeting.kind ?? 'gnl', count: 1,
    });
  }
  const events = [...met.values()].sort((a, b) => a.id - b.id);
  // The reads answer newest first, so the first meeting is the one last_season_name names
  const lastMet = [eventLabel(meetings[0] ?? { season_name: opponent.last_season_name }),
    // a no-break space, so the round and its number stay on one line in a narrow column
    opponent.last_playday ? `round\u00a0${opponent.last_playday}` : null]
    .filter(Boolean).join(', ');
  return { opponent, record, games, matchups, events, lastMet };
});
