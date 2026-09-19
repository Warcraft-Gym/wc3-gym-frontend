// The scoring rule, said once and shown wherever a scored number is
export const SCORED_NOTE = 'Only counts games longer than 2 minutes.';

export const LADDER_NOTE =
  '3 points for a win and 1 point for a loss. Only counts games longer than 2 minutes.';

export const ACHIEVEMENTS_NOTE =
  'Achievement points earned this season. Only counts games longer than 2 minutes.';

export const TEAM_BADGES_NOTE =
  'Achievement points of the roster plus the team badges. They add to no standing.';

// The three team points columns, said once and shown wherever they are printed
export const POINTS_NOTES = {
  'Points': "Every point your team's players took in their series this season.",
  'Points against': 'The points your opponents took in series against your team.',
  'Points available': "The points still to be played for: the season's whole pot minus the points already won by your team and by your opponents.",
};

// What the earned badges add to the ladder points
export function achievementPoints(earned) {
  return (earned ?? []).reduce((sum, badge) => sum + badge.points, 0);
}
