// Fantasy tier names and colours from the lowest band up; tier 1 is the last of a season's slice
export const ALL_NAMES = ['Grass', 'Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond'];
export const ALL_COLORS = ['#4CAF50', '#795548', '#9E9E9E', '#FF9800', '#2196F3', '#9C27B0'];

// What the chart changed since the last Apply, as lines a person reads. Empty means it matches.
// `pins` and `storedPins` map a player id to the tier a hand-move gave them.
export function tierChanges(cuts, stored, names, pins, storedPins) {
  const out = [];
  // A different count moves every cut, so naming each one is noise
  if (stored.length !== cuts.length) out.push(`${stored.length + 1} tiers → ${cuts.length + 1} tiers`);
  else cuts.forEach((c, i) => {
    if (c !== stored[i]) out.push(`${names[i]} to ${names[i + 1]}: ${stored[i]} → ${c}`);
  });
  const ids = new Set([...Object.keys(pins), ...Object.keys(storedPins)]);
  const moved = ids.size ? [...ids].filter((id) => pins[id] !== storedPins[id]).length : 0;
  if (moved) out.push(`${moved} ${moved === 1 ? 'player' : 'players'} moved by hand`);
  return out;
}
