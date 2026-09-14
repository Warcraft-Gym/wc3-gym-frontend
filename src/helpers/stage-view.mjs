// The pure parts of a stage drawing: what state a series is in, which sides walked
// through, the columns of a bracket and where each box sits, the order of a KOTH
// chain, and the standings rows a table shows.

// A generated series carries a result kind; an unscored one is open once both sides are known
export const SERIES_STATES = ['pending', 'open', 'played', 'walkover', 'forfeit'];

export const isScored = (row) => row?.player1_score != null || row?.player2_score != null;

// Who stands on one side: its entrant, else the player a GNL row names, the way
// app/services/series_rules.py stands_on_side reads the pair.
export const standsOn = (row, side) => row?.[`entrant${side}_id`] ?? row?.[`player${side}_id`] ?? null;

export const seriesState = (row) => {
  if (isScored(row)) return SERIES_STATES.includes(row.result_kind) ? row.result_kind : 'played';
  // A lobby names nobody in the player columns; its seats say whether it can be played
  if (row?.sides?.length) return row.sides.every((seat) => seat.entrant_id) ? 'open' : 'pending';
  return standsOn(row, 1) && standsOn(row, 2) ? 'open' : 'pending';
};

// The side a scored series sends on, 1 or 2; a draw and an unscored series send nobody
export const winnerSide = (row) => {
  if (!isScored(row)) return null;
  const [a, b] = [row.player1_score ?? 0, row.player2_score ?? 0];
  return a === b ? null : (a > b ? 1 : 2);
};

const feederOf = (row, side) => (side === 1 ? row.slot1_from_series_id : row.slot2_from_series_id);

// A side can never fill when it has neither an entrant nor a feeder while the other side
// is named: it is a bye, and the other side passes through. That is how a padded pair
// reaches the next column, and it is the pair stage_engine._row awards a walkover to.
// A row that names neither side is a payload without them, never a bye.
export const isByeSide = (row, side) => !feederOf(row, side) && !standsOn(row, side)
  && !!standsOn(row, side === 1 ? 2 : 1);
export const isBye = (row) => [1, 2].some((side) => isByeSide(row, side));

// The side a box may name. A feeder fills its side with the winner of the series before
// it, so while results are hidden that side reads as undecided instead of naming him.
export const shownPlayer = (row, side, hidden = false) => (
  hidden && feederOf(row, side) ? null : row?.[`player${side}`] || null);

// The team a box may name, hidden behind a feeder the same way a player is
export const shownTeam = (row, side, hidden = false) => (
  hidden && feederOf(row, side) ? null : row?.[`team${side}`] || null);

// What a side is called in a sentence: the team of a team entrant, else the player
export const sideName = (row, side) => row?.[`team${side}`]?.name || row?.[`player${side}`]?.name || '';

// One column per round, in round order, each holding its series in sequence order.
// The rounds name the columns; a round the list does not name reads as its number.
export function columns(series, rounds = []) {
  const byId = new Map(rounds.map((round) => [round.id, round]));
  const order = new Map(rounds.map((round, index) => [round.id, round.number ?? index]));
  const groups = new Map();
  for (const row of series) {
    const key = row.round_id ?? 0;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  }
  return [...groups.entries()]
    .sort((a, b) => (order.get(a[0]) ?? a[0]) - (order.get(b[0]) ?? b[0]))
    .map(([key, rows]) => ({
      key,
      name: byId.get(key)?.name || `Round ${byId.get(key)?.number ?? key}`,
      series: [...rows].sort((a, b) => (a.sequence ?? a.id) - (b.sequence ?? b.id)),
    }));
}

// Where every box sits. A box follows the middle of the feeders that fill it, and
// drops far enough down the column to clear the box above it.
export function layout(cols, { boxH = 88, gap = 12, colW = 244, boxW = 208 } = {}) {
  const unit = boxH + gap;
  const centre = new Map();
  const boxes = [];
  cols.forEach((column, index) => {
    let cursor = null;
    for (const row of column.series) {
      const fed = [row.slot1_from_series_id, row.slot2_from_series_id]
        .map((id) => centre.get(id))
        .filter((value) => value !== undefined);
      const ideal = fed.length ? fed.reduce((sum, value) => sum + value, 0) / fed.length : 0;
      const cy = Math.max(cursor === null ? unit / 2 : cursor + unit, ideal);
      cursor = cy;
      centre.set(row.id, cy);
      boxes.push({ row, column: index, x: index * colW, cy, key: `s${row.id}` });
    }
  });
  const lines = [];
  for (const box of boxes) {
    for (const side of [1, 2]) {
      const from = centre.get(feederOf(box.row, side));
      if (from === undefined) continue;
      const fed = boxes.find((other) => other.row.id === feederOf(box.row, side));
      const midX = fed.x + boxW + Math.round((box.x - fed.x - boxW) / 2);
      lines.push({
        key: `${box.key}-${side}`,
        d: `M${fed.x + boxW} ${from} H${midX} V${box.cy} H${box.x}`,
      });
    }
  }
  return {
    boxes,
    lines,
    boxW,
    boxH,
    width: cols.length ? (cols.length - 1) * colW + boxW : 0,
    height: boxes.reduce((tall, box) => Math.max(tall, box.cy + boxH / 2), 0),
  };
}

// A double elimination bracket runs two ladders and a final that joins them. Drawn as
// one row of columns it is wider than a screen and its feeder lines cross the columns
// between, so the columns are split into blocks that are drawn one under the other.
// A column belongs to the lower ladder when every series in it takes a beaten side, or
// when it feeds only from lower columns; a block is a run of columns on the same side.
export function blocks(cols) {
  const columnOf = new Map();
  cols.forEach((column, index) => column.series.forEach((row) => columnOf.set(row.id, index)));
  const lower = new Set();
  cols.forEach((column, index) => {
    const beaten = column.series.every((row) => row.slot1_takes_loser || row.slot2_takes_loser);
    const feeders = column.series
      .flatMap((row) => [row.slot1_from_series_id, row.slot2_from_series_id])
      .filter((id) => id != null);
    const below = feeders.length > 0 && feeders.every((id) => lower.has(columnOf.get(id)));
    if (beaten || below) lower.add(index);
  });
  const made = [];
  cols.forEach((column, index) => {
    const side = lower.has(index) ? 'lower' : 'upper';
    const last = made.at(-1);
    if (last?.side === side) last.columns.push(column);
    else made.push({ key: `${side}-${index}`, side, columns: [column] });
  });
  return made;
}

// A KOTH chain in play order: the first series, then whichever takes its winner, and on.
// A series the chain never reaches is appended, so nothing is dropped from the screen.
export function chainOrder(series) {
  const next = new Map(series.map((row) => [row.slot1_from_series_id, row]));
  const chain = [];
  const seen = new Set();
  let row = series.find((candidate) => !candidate.slot1_from_series_id);
  while (row && !seen.has(row.id)) {
    seen.add(row.id);
    chain.push(row);
    row = next.get(row.id);
  }
  return [...chain, ...series.filter((other) => !seen.has(other.id))];
}

// One group of standings per division, in division order, for the grouped table
export function standingsGroups(standings = [], divisions = []) {
  const order = new Map(divisions.map((division) => [division.id, division.position]));
  return [...standings]
    .sort((a, b) => (order.get(a.division_id) ?? 0) - (order.get(b.division_id) ?? 0))
    .map((group) => ({
      key: group.division_id ?? 'all',
      label: group.division_name || 'All entrants',
      division_id: group.division_id ?? null,
      rows: group.rows || [],
    }));
}

// The series of one division, or every series when the stage runs no divisions
export const inDivision = (series, divisionId) => (divisionId == null
  ? series.filter((row) => row.division_id == null)
  : series.filter((row) => row.division_id === divisionId));

// The maps one side must win to take the series
export const winsFor = (bestOf) => Math.floor((bestOf || 3) / 2) + 1;

const ELIMINATION = ['single_elimination', 'double_elimination'];

// What a generate will play over, read the way app/services/stage_engine.py does: a
// withdrawn entrant never plays, and once any entrant carries a seed the seeded alone
// stand. Only an elimination bracket pads to a power of two, so only it counts byes.
export function generateFields(entrants = [], divisions = [], format = null) {
  const bands = divisions?.length
    ? [...divisions].sort((a, b) => a.position - b.position)
    : [{ id: null, position: 1, name: null }];
  const standing = entrants.filter((row) => !row.withdrawn_at);
  const seeded = standing.filter((row) => row.seed != null);
  const field = seeded.length ? seeded : standing;
  const pads = ELIMINATION.includes(format);
  return bands.map((band) => {
    const count = field.filter((row) => band.id == null || row.division_id === band.id).length;
    let size = 1;
    while (size < count) size *= 2;
    return {
      key: band.id ?? 'all',
      name: band.name || `Division ${band.position}`,
      entrants: count,
      byes: pads && count ? size - count : null,
    };
  });
}

// Who the next stage takes, read the way app/services/stage_engine.py _advance does:
// the top of every division's table, and the whole table when the stage names no count.
export function advancingRows(standings = [], advanceCount = null) {
  return standings.flatMap((group) => (advanceCount
    ? (group.rows || []).slice(0, advanceCount)
    : group.rows || []));
}

// The series closing a KOTH night deletes, read the way app/services/koth_night
// close_night does: the unplayed tail of every division's chain, in play order.
export function pendingChainSeries(series = [], divisions = []) {
  const bands = divisions.length ? divisions.map((band) => band.id) : [null];
  return bands.flatMap((id) => {
    const chain = [...inDivision(series, id)]
      .sort((a, b) => (a.sequence ?? a.id) - (b.sequence ?? b.id));
    let tail = chain.length;
    while (tail > 0 && !isScored(chain[tail - 1])) tail -= 1;
    return chain.slice(tail);
  });
}

// The entrants a chain can still take: standing, and on no side of any series yet
export function chainChallengers(entrants = [], series = []) {
  const playing = new Set(series
    .flatMap((row) => [row.player1_id, row.player2_id])
    .filter((id) => id != null));
  return entrants.filter((row) => !row.withdrawn_at && !playing.has(row.user?.id ?? row.user_id));
}

// A free for all series is a lobby: one series holding one `series_side` row a seat,
// each with the place it finished. A series with two sides writes no seat at all.
export const isLobby = (row) => (row?.sides?.length ?? 0) > 0;

// The seats of one lobby as its box reads them: the winner first, then the rest by
// place, then the seats nobody placed yet. While results are hidden every seat keeps
// its seat order and carries no place, so the box gives nothing away.
export function lobbySeats(row, hidden = false) {
  const seats = [...(row?.sides || [])].sort((a, b) => a.side_no - b.side_no);
  if (hidden) {
    return seats.map((seat) => ({ ...seat, key: seat.side_no, place: null, result: null }));
  }
  return seats
    .map((seat) => ({
      ...seat,
      key: seat.side_no,
      result: seat.place == null ? null : (seat.place === 1 ? 'won' : 'lost'),
    }))
    .sort((a, b) => (a.place ?? Infinity) - (b.place ?? Infinity) || a.side_no - b.side_no);
}
