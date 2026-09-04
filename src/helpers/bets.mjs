// Returns the error text for a bet amount, or null when it is acceptable.
export const validateBetPoints = (points, minPoints, maxPoints) => {
  if (!points || points <= 0) {
    return 'Bet points must be greater than 0';
  }
  if (minPoints && points < minPoints) {
    return `Bet points must be at least ${minPoints}`;
  }
  if (maxPoints && points > maxPoints) {
    return `Bet points must not exceed ${maxPoints}`;
  }
  return null;
};

// The two sides of a series, each carrying the race the other player signed up on
export const sides = (series) => [
  { player: series.player1, vsRace: series.player2?.signup_race },
  { player: series.player2, vsRace: series.player1?.signup_race },
];
