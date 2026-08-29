// The scoring rule, said once and shown wherever a scored number is
export const SCORED_NOTE =
  'Ladder points plus achievement points, the season total. Both count only games longer than 2 minutes.';

export const LADDER_NOTE =
  'Three points a win and one a loss, counting only games longer than 2 minutes.';

// MMR is w3champions data, so it does not follow the scoring rule
export const MMR_NOTE =
  'MMR comes from w3champions and moves on every game, including the ones too short to score.';

export const ACHIEVEMENTS_NOTE =
  'Badges earned this season and what each paid; the total is in Points. They count only games longer than 2 minutes.';

// What the earned badges add to the ladder points
export function achievementPoints(earned) {
  return (earned ?? []).reduce((sum, badge) => sum + badge.points, 0);
}

// The CC BY 3.0 credit for the badge glyphs, shown wherever badges are
export const BADGES_CREDIT = 'Achievement badges by Lorc, Delapouite and Caro Asercion (game-icons.net, CC BY 3.0).';
