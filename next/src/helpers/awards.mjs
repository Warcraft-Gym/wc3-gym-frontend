// What an event hands out when it closes. Closing freezes the table of the last stage as
// award rows, so the places the page prints are that table. The names match
// app/services/awards.py title_of, so a chip reads what the award row holds.

const TITLES = { 1: 'Champion', 2: 'Runner-up', 3: 'Third' };
export const placeTitle = (place) => TITLES[place] || `Placed ${place}`;

// The mark a place wears beside its name; third takes bronze, which is the app's primary
const MEDALS = { 1: 'medal-gold', 2: 'medal-silver', 3: 'primary' };
export const placeMedal = (place) => MEDALS[place] || null;
export const placeIcon = (place) => (place === 1 ? 'mdi-trophy' : 'mdi-medal');

// Where every entrant placed, keyed by entrant id, read off the table the close froze
export function placings(standings = []) {
  const places = {};
  for (const group of standings) {
    for (const row of group.rows || []) {
      places[row.entrant_id] = { place: row.position, title: placeTitle(row.position) };
    }
  }
  return places;
}

// Who the finish awards, best place first, division by division: what the confirm names
// before it writes the places.
export function awardList(standings = []) {
  return standings.flatMap((group) => (group.rows || []).map((row) => ({
    key: `${group.division_id ?? 'all'}:${row.entrant_id}`,
    division: group.division_name || null,
    name: row.name || '',
    place: row.position,
    title: placeTitle(row.position),
  })));
}
