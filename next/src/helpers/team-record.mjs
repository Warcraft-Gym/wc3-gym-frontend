import { isUnscored } from './season-phase.mjs';
import { eventLabel } from './event-labels.mjs';

const infoOf = (team, seasonId) => team.seasons_info?.find(i => i.season_id === seasonId) || {};

// Most points, then fewest against, then the older team: the order app.services.derived crowns
export const seasonRank = (teams = [], teamId, seasonId) => {
  const order = teams
    .map(team => ({ id: team.id, ...infoOf(team, seasonId) }))
    .sort((a, b) => (b.final_score ?? 0) - (a.final_score ?? 0)
      || (a.points_against ?? 0) - (b.points_against ?? 0)
      || a.id - b.id);
  const index = order.findIndex(row => row.id === teamId);
  return index < 0 ? null : { rank: index + 1, of: order.length };
};

// One row per match: the opponent, series won, lost and still to play, points for and against
export const roundResults = (series = [], teamId) => {
  const byMatch = new Map();
  for (const s of series) {
    const match = s.match;
    if (!match || ![match.team1_id, match.team2_id].includes(teamId)) continue;
    const home = match.team1_id === teamId;
    const row = byMatch.get(s.match_id) ?? {
      matchId: s.match_id,
      playday: match.playday,
      opponent: home ? match.team2 : match.team1,
      wins: 0, losses: 0, toPlay: 0, pointsFor: 0, pointsAgainst: 0,
    };
    if (isUnscored(s)) {
      row.toPlay++;
    } else {
      const [own, opp] = home ? [s.player1_score, s.player2_score] : [s.player2_score, s.player1_score];
      if (own > opp) row.wins++;
      if (own < opp) row.losses++;
      row.pointsFor += (home ? s.player1_points : s.player2_points) ?? 0;
      row.pointsAgainst += (home ? s.player2_points : s.player1_points) ?? 0;
    }
    byMatch.set(s.match_id, row);
  }
  return [...byMatch.values()].sort((a, b) => a.playday - b.playday);
};

export const seriesRecord = (rounds = []) => rounds.reduce(
  (sum, r) => ({ wins: sum.wins + r.wins, losses: sum.losses + r.losses }),
  { wins: 0, losses: 0 },
);

// One tab per event the team played, newest first. The team route names the event and
// its league; a backend that does not carry those names yet falls back to the season
// list the page already loaded, so the tabs read the same at any deploy order.
export const seasonTabs = (seasonsInfo = [], seasons = []) => seasonsInfo
  .filter((info) => info.season_id != null)
  .slice()
  .sort((a, b) => b.season_id - a.season_id)
  .map((info) => ({
    id: info.season_id,
    label: eventLabel(info) || seasons.find((s) => s.id === info.season_id)?.name || '',
  }));
