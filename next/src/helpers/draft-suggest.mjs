// The round draft board: the figures it prints and the pairings it suggests for the open places.

/** The MMR distance of two board players. A player with no MMR is never inside a difference. */
export const mmrGap = (a, b) => (a?.mmr == null || b?.mmr == null ? Infinity : Math.abs(a.mmr - b.mmr));

/** The board answers one row per possible pairing; this reads one of them by the two ids. */
export function pairIndex(board) {
  const map = new Map();
  for (const pair of board?.pairs || []) map.set(`${pair.player1_id}-${pair.player2_id}`, pair);
  return (player1Id, player2Id) => map.get(`${player1Id}-${player2Id}`);
}

// Most pairings first, then the smallest total difference, then the smaller largest
// difference, then the most shared hours.
const better = (x, y) => {
  if (x.count !== y.count) return y.count - x.count;
  if (x.total !== y.total) return x.total - y.total;
  if (x.widest !== y.widest) return x.widest - y.widest;
  return y.hours - x.hours;
};

const EMPTY = { count: 0, total: 0, widest: 0, hours: 0, took: null };

const made = (a, b, difference) => ({ player1_id: a.user_id, player2_id: b.user_id, difference });

// Smallest difference first, each player used once
function greedy(left, right, open, maxDifference) {
  const all = [];
  for (const a of left) for (const b of right) if (mmrGap(a, b) <= maxDifference) all.push(made(a, b, mmrGap(a, b)));
  all.sort((x, y) => x.difference - y.difference);
  const used = new Set();
  const pairs = [];
  for (const pair of all) {
    if (pairs.length >= open) break;
    if (used.has(pair.player1_id) || used.has(pair.player2_id)) continue;
    used.add(pair.player1_id);
    used.add(pair.player2_id);
    pairs.push(pair);
  }
  return pairs;
}

// ponytail: the exact search runs to 12 free rated players a side, its worst case measured at 77 ms
// in node; above that greedy takes over and can leave a place open. A worker would raise the ceiling.
const EXACT = 12;

function best(left, right, open, maxDifference, hoursOf) {
  if (!open || !left.length || !right.length) return [];
  if (left.length > EXACT || right.length > EXACT) return greedy(left, right, open, maxDifference);
  const memo = new Map();
  // A state holds its own figures and the one pairing it took, so no state copies the list.
  // Every take fills one place and one right player, so the mask already carries the room left.
  const go = (i, mask, room) => {
    if (i === left.length || room === 0) return EMPTY;
    const key = i * (1 << right.length) + mask;
    const found = memo.get(key);
    if (found) return found;
    let win = go(i + 1, mask, room);
    for (let j = 0; j < right.length; j++) {
      const difference = mmrGap(left[i], right[j]);
      if (mask & (1 << j) || difference > maxDifference) continue;
      const rest = go(i + 1, mask | (1 << j), room - 1);
      const take = {
        count: rest.count + 1,
        total: rest.total + difference,
        widest: Math.max(rest.widest, difference),
        hours: rest.hours + (hoursOf(left[i].user_id, right[j].user_id) || 0),
        took: { i, j, difference, rest },
      };
      if (better(take, win) < 0) win = take;
    }
    memo.set(key, win);
    return win;
  };
  const pairs = [];
  for (let state = go(0, 0, open); state.took; state = state.took.rest) {
    const { i, j, difference } = state.took;
    pairs.push(made(left[i], right[j], difference));
  }
  return pairs;
}

// The most pairings a difference allows, by augmenting paths. The count alone, so the fill steps
// never run the exact search.
function reach(left, right, open, maxDifference) {
  const partner = new Array(right.length).fill(-1);
  let count = 0;
  for (let i = 0; i < left.length && count < open; i++) {
    const seen = new Array(right.length).fill(false);
    const grow = (a) => {
      for (let j = 0; j < right.length; j++) {
        if (seen[j] || mmrGap(left[a], right[j]) > maxDifference) continue;
        seen[j] = true;
        if (partner[j] === -1 || grow(partner[j])) {
          partner[j] = a;
          return true;
        }
      }
      return false;
    };
    if (grow(i)) count++;
  }
  return count;
}

// The smallest differences above the working value at which one more place fills
function fillSteps(left, right, open, maxDifference, filled) {
  const gaps = new Set();
  for (const a of left) for (const b of right) gaps.add(mmrGap(a, b));
  const steps = [...gaps].filter((gap) => gap > maxDifference && Number.isFinite(gap)).sort((x, y) => x - y).slice(0, 40);
  const fills = [];
  let count = filled;
  for (const difference of steps) {
    if (count >= open || fills.length >= 3) break;
    const reached = reach(left, right, open, difference);
    if (reached > count) {
      fills.push({ difference, pairs: reached });
      count = reached;
    }
  }
  return fills;
}

/** Fill the open places of the round. The pairings already drafted stay, a player with no MMR
 *  is skipped, and no suggested pairing is wider than the working difference. `fills` names the
 *  differences at which one more place would fill. */
export function suggestPairings(board, maxDifference, drafted = []) {
  const taken = new Set(drafted.flatMap((row) => [row.player1_id, row.player2_id]));
  const free = (board?.players || []).filter((player) => !taken.has(player.user_id));
  // The places of the round the published series and the drafts leave
  const open = Math.max(0, (board?.series_per_round || 0) - (board?.published_series || 0) - drafted.length);
  const left = free.filter((player) => player.team_id === board?.team1_id && player.mmr != null);
  const right = free.filter((player) => player.team_id === board?.team2_id && player.mmr != null);
  const pairOf = pairIndex(board);
  const hoursOf = (player1Id, player2Id) => pairOf(player1Id, player2Id)?.hours;
  const pairs = best(left, right, open, maxDifference, hoursOf);
  return { pairs, open, fills: fillSteps(left, right, open, maxDifference, pairs.length) };
}
