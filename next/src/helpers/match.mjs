// Why a match cannot be created or saved, or null. The backend refuses the same
// two cases; checking here names the reason in the dialog instead of the console.
export const matchProblem = (match) => {
  if (!match?.team1_id || !match?.team2_id) return 'Pick both teams.';
  if (match.team1_id === match.team2_id) return 'A team cannot play itself.';
  return null;
};
