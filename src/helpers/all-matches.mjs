// Matches the route hands out for one race. The scored games and the signup
// race's count are the same number, so this is right before a race is chosen.
// A backend without by_race offers no race to pick, so its scored count is the total.
export const raceTotal = (answer, race) =>
    answer.by_race ? (answer.by_race[race ?? answer.race] ?? 0) : (answer.games ?? 0);

// Vuetify sends -1 for 'Items per page: All'. The ladder route caps one read at
// 500 matches, so 'All' reads it again from where the last page stopped.
// ponytail: every extra read also re-sends the record, the achievements and the
// per-day rows; give the route a matches-only mode if a player ever passes 1000
export async function allMatches(readPage, race) {
    const answer = await readPage(0);
    const total = raceTotal(answer, race);
    while (answer.matches.length < total) {
        const next = await readPage(answer.matches.length);
        if (!next.matches.length) break;  // the route sent no more, so stop
        answer.matches.push(...next.matches);
    }
    return answer;
}
