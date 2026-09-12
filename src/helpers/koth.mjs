// The body of the open KOTH signup POST (/koth/signups). The route is open by
// decision and ignores the token, but its model still declares client_token, so
// a body without one is refused 422 before the route runs. event_id names the
// event the page is showing; the route reads the active event until it takes one.
export const publicSignupBody = ({ event_id, twitch_username, battle_tag, race }) => ({
  client_token: '',
  event_id: event_id ?? null,
  twitch_username: twitch_username || '',
  battle_tag: battle_tag || '',
  race: race || null,
});
