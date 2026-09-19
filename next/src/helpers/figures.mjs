// A record as wins and losses: "19 – 11 (63%)" from ten up, "3 – 1" under ten; the title names what it counts.

export const record = (wins, losses) => {
  const won = wins || 0;
  const lost = losses || 0;
  const total = won + lost;
  if (!total) return null;
  return total >= 10 ? `${won} – ${lost} (${Math.round((100 * won) / total)}%)` : `${won} – ${lost}`;
};
