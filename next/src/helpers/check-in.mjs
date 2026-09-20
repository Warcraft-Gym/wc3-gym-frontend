// A `blocked_out` row is derived from the blocked times and never stored, so no screen offers it as a value

const NO_ANSWER = { title: 'No answer', short: 'No answer', color: null, icon: 'mdi-clock-outline', derived: false };

// `row` is the answer of that player and round, or undefined where none was read
export const checkInStatus = (row) => {
  if (row?.blocked_out) return { title: 'Out (blocked times)', short: 'Out', color: 'error', icon: 'mdi-calendar-remove', derived: true, hint: 'Blocked times cover this round' };
  if (row?.available === true) return { title: 'Checked in', short: 'In', color: 'success', icon: 'mdi-check', derived: false };
  if (row?.available === false) return { title: 'Out', short: 'Out', color: 'error', icon: 'mdi-close', derived: false };
  return NO_ANSWER;
};

// "set by you", "set by <name>". A derived row and a round nobody answered carry no note.
export const setByText = (row, viewerId) => {
  if (!row || row.blocked_out || row.available == null || row.set_by_user_id == null) return '';
  return `set by ${row.set_by_user_id === viewerId ? 'you' : row.set_by_name}`;
};

// "4 checked in · 1 out · 1 no answer" over one round of the roster; a state nobody is in is left out
export const checkInCounts = (players = [], rows = [], playday) => {
  const counts = { 'checked in': 0, out: 0, 'no answer': 0 };
  for (const player of players) {
    const status = checkInStatus(rows.find((row) => row.user_id === player.id && row.playday === playday));
    if (status.title === 'Checked in') counts['checked in'] += 1;
    else if (status.title === 'No answer') counts['no answer'] += 1;
    else counts.out += 1;
  }
  return Object.entries(counts).filter(([, count]) => count).map(([word, count]) => `${count} ${word}`).join(' · ');
};
