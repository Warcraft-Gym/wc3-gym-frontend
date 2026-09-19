// A count with its share: "19/30 (63%)" from ten up, "3/4" under ten; the title names what it counts.

export const countShare = (count, total) => {
  if (!total) return null;
  return total >= 10 ? `${count}/${total} (${Math.round((100 * count) / total)}%)` : `${count}/${total}`;
};
