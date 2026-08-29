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
