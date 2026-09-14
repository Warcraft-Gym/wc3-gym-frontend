// Which KOTH event the public page draws tonight: the newest published night that is
// not finished. The list read answers every published event of the kind, so the page
// picks from it instead of asking for a stored "active" flag.
export const openNight = (events = []) => [...events]
  .filter((event) => event.published !== false && event.phase !== 'finished')
  .sort((a, b) => when(b).localeCompare(when(a)) || (b.id ?? 0) - (a.id ?? 0))[0] ?? null;

// A night carries an instant; an event with dates alone falls back to its start day
const when = (event) => String(event?.starts_at ?? event?.start_date ?? '');
