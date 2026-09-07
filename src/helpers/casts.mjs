// The platform of a cast, read off its channel URL; nothing is stored
export const platformOf = (url) => {
  const host = (url || '').replace(/^https?:\/\//, '').replace(/^(www|m)\./, '').split('/')[0];
  if (host === 'twitch.tv') return 'twitch';
  if (host === 'youtube.com' || host === 'youtu.be') return 'youtube';
  return null;
};

export const PLATFORM_ICONS = { twitch: 'mdi-twitch', youtube: 'mdi-youtube' };

// A cast series counts as on now from half an hour before its time to four hours after
const BEFORE = 30 * 60 * 1000;
const AFTER = 4 * 60 * 60 * 1000;

// A claimed series with no result, inside its window. No platform is asked
export const onNow = (series, now = Date.now()) => {
  if (!series?.casts?.length || !series.date_time) return false;
  if (series.player1_score != null || series.player2_score != null) return false;
  const at = Date.parse(series.date_time);
  return at - BEFORE <= now && now <= at + AFTER;
};
