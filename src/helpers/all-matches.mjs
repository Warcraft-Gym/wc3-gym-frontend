// Vuetify sends -1 for 'Items per page: All'. The ladder route caps one read at
// 500 matches, so 'All' reads it again from where the last page stopped.
// ponytail: every extra read also re-sends the record, the achievements and the
// per-day rows; give the route a matches-only mode if a player ever passes 1000
export async function allMatches(readPage) {
    const answer = await readPage(0);
    while (answer.matches.length < answer.games) {
        const next = await readPage(answer.matches.length);
        if (!next.matches.length) break;  // the route sent no more, so stop
        answer.matches.push(...next.matches);
    }
    return answer;
}
