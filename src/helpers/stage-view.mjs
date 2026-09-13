// The pure parts of a stage drawing: what state a series is in, which sides walked
// through, the columns of a bracket and where each box sits, the order of a KOTH
// chain, and the standings rows a table shows.

// A generated series carries a result kind; an unscored one is open once both sides are known
export const SERIES_STATES = ['pending', 'open', 'played', 'walkover', 'forfeit'];

export const isScored = (row) => row?.player1_score != null || row?.player2_score != null;

export const seriesState = (row) => {
  if (isScored(row)) return SERIES_STATES.includes(row.result_kind) ? row.result_kind : 'played';
  return row?.player1_id && row?.player2_id ? 'open' : 'pending';
};

// The side a scored series sends on, 1 or 2; a draw and an unscored series send nobody
export const winnerSide = (row) => {
  if (!isScored(row)) return null;
  const [a, b] = [row.player1_score ?? 0, row.player2_score ?? 0];
  return a === b ? null : (a > b ? 1 : 2);
};

const feederOf = (row, side) => (side === 1 ? row.slot1_from_series_id : row.slot2_from_series_id);

// A side can never fill when it has neither an entrant nor a feeder: it is a bye, and
// the other side passes through. That is how a padded pair reaches the next column.
export const isByeSide = (row, side) => !feederOf(row, side)
  && !(side === 1 ? row.player1_id : row.player2_id);
export const isBye = (row) => [1, 2].some((side) => isByeSide(row, side));

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
      label: group.division_name || 'Standings',
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
