// Cutting a player pool into MMR divisions. Bands ascend: index 0 is the lowest MMR band,
// and `cuts` holds the ascending lower bounds of bands 1..n-1.

// The cuts that give `count` bands about the same number of players: the pool's quantiles.
// Ties share a band, so counts can differ a little. Players with no MMR are left out.
export function quantileCuts(mmrs, count) {
  const asc = mmrs.filter((m) => m > 0).sort((a, b) => a - b);
  if (!asc.length) return Array.from({ length: count - 1 }, (_, k) => (k + 1) * 100);
  const cuts = [];
  for (let k = 1; k < count; k++) cuts.push(asc[Math.min(asc.length - 1, Math.round((asc.length * k) / count))]);
  return cuts;
}

// The band an MMR falls in: the number of cuts at or below it.
export function bandOf(mmr, cuts) {
  return cuts.filter((c) => mmr >= c).length;
}

// One cut moved to `value`, kept inside the domain and off its neighbours so bands never cross.
export function moveCut(cuts, index, value, [low, high]) {
  const next = cuts.slice();
  const min = index === 0 ? low + 1 : next[index - 1] + 1;
  const max = index === cuts.length - 1 ? high : next[index + 1] - 1;
  next[index] = Math.max(min, Math.min(max, Math.round(value)));
  return next;
}

// The MMR axis the strip draws: the pool's span padded to whole hundreds.
export function domainOf(mmrs) {
  const withMmr = mmrs.filter((m) => m > 0);
  if (!withMmr.length) return [0, 3000];
  const low = Math.floor(Math.min(...withMmr) / 100) * 100;
  const high = Math.ceil(Math.max(...withMmr) / 100) * 100;
  return low === high ? [low - 100, high + 100] : [low, high];
}

// The range a band covers, as a person reads it.
export function rangeText(index, cuts) {
  if (!cuts.length) return 'all MMRs';
  if (index === 0) return `below ${cuts[0]}`;
  if (index === cuts.length) return `${cuts[index - 1]} and above`;
  return `${cuts[index - 1]} to ${cuts[index] - 1}`;
}

// Beeswarm rows: every dot keeps its exact x and takes the lowest row with no dot
// within `diameter` of it, so a column of dots is the local density at that MMR.
export function dodge(xs, diameter) {
  const rows = []; // rows[r] = the rightmost x placed in row r so far
  const out = new Array(xs.length);
  for (const i of xs.map((_, k) => k).sort((a, b) => xs[a] - xs[b])) {
    let r = 0;
    while (rows[r] !== undefined && xs[i] - rows[r] < diameter) r++;
    rows[r] = xs[i];
    out[i] = r;
  }
  return out;
}
