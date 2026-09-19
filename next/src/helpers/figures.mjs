// The one form a count with its share reads on every surface: "19/30 (63%)". The percent
// shows from ten counted items up; under ten the count stands alone, "3/4". The column
// title or the icon beside the figure names what it counts, so the figure carries no word.

export const countShare = (count, total) => {
  if (!total) return null;
  return total >= 10 ? `${count}/${total} (${Math.round((100 * count) / total)}%)` : `${count}/${total}`;
};
