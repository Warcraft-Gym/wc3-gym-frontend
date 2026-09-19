// A record: "19 – 11 (63%)" from ten up, "3 – 1" under ten; null when nothing was played, so the cell prints its own dash.

export const record = (wins, losses) => {
  const total = (wins ?? 0) + (losses ?? 0);
  if (!total) return null;
  return total >= 10 ? `${wins} – ${losses} (${Math.round((100 * wins) / total)}%)` : `${wins} – ${losses}`;
};
