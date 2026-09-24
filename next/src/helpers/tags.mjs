// A person's battle tags: the rows of UserPublic.tags, one of them active.
// Each row is { id, tag, verified, active, source, first_seen, last_seen }.

const same = (a, b) => String(a ?? '').trim().toLowerCase() === String(b ?? '').trim().toLowerCase();

// The tag a season row was played as, when it is not the person's tag today; else null
export const playedAsTag = (playedAs, battleTag) => (playedAs && !same(playedAs, battleTag) ? playedAs : null);

// The active tag first, then the rest by the newest sighting
export const tagsActiveFirst = (tags = []) =>
  [...(tags ?? [])].sort((a, b) => Number(!!b.active) - Number(!!a.active) || String(b.last_seen ?? '').localeCompare(String(a.last_seen ?? '')));

// The tags a person holds besides the active one
export const otherTags = (player) => tagsActiveFirst(player?.tags).filter((row) => !row.active && !same(row.tag, player?.battleTag));

// Where a refused "Add a tag" shows: a 404 or a 409 is about the tag, so it goes under the field
export const addTagError = (error) => {
  const message = error?.message || error?.error || String(error ?? '');
  if (error?.status === 404) return { field: 'Not found on W3Champions.', page: null };
  return error?.status === 409 ? { field: message, page: null } : { field: null, page: message };
};

// The tag a Battle.net verify just marked: the newest verified row; else null
export const verifiedTag = (tags = []) =>
  [...(tags ?? [])].filter((row) => row.verified).sort((a, b) => String(b.last_seen ?? '').localeCompare(String(a.last_seen ?? '')))[0]?.tag ?? null;

// The error MyAccounts shows when Blizzard sends the browser back with ?bnet=error&reason=; else null
export const BNET_REASONS = {
  denied: 'You cancelled on Battle.net.',
  taken: 'That Battle.net account or tag belongs to another player. Ask an admin.',
};
export const bnetNote = (bnet, reason) => (bnet === 'error' ? BNET_REASONS[reason] ?? 'Linking failed. Try again.' : null);

// A merge runs only after its check came back with nothing that stops it
export const canConfirmMerge = (preview) => !!preview && Array.isArray(preview.stops) && preview.stops.length === 0;

// The users list filter each server-side "Show only" entry sends
const LIST_FILTERS = { no_discord: 'no_discord=true', claimed: 'tag_source=claim' };
export const listFilterQuery = (flag) => LIST_FILTERS[flag] ?? null;
export const isListFilter = (flag) => flag in LIST_FILTERS;
