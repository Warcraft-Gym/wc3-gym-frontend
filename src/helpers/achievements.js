// The scoring rule, said once and shown wherever a scored number is
export const SCORED_NOTE = 'Only counts games longer than 2 minutes.';

export const LADDER_NOTE =
  '3 points for a win and 1 point for a loss. Only counts games longer than 2 minutes.';

export const ACHIEVEMENTS_NOTE =
  'Achievement points earned this season. Only counts games longer than 2 minutes.';

// What the earned badges add to the ladder points
export function achievementPoints(earned) {
  return (earned ?? []).reduce((sum, badge) => sum + badge.points, 0);
}

// The CC BY 3.0 credit for the badge glyphs, shown wherever badges are
export const BADGES_CREDIT = 'Achievement badges by Lorc, Delapouite and Caro Asercion (game-icons.net, CC BY 3.0).';
