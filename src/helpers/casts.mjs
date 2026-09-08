import { isUnscored } from './season-phase.mjs';

// The host without www or m, and the path without its query or a trailing slash
const hostPath = (url) => {
  const clean = (url || '').replace(/^https?:\/\//, '').replace(/^(www|m)\./, '').split(/[?#]/)[0];
  const cut = clean.indexOf('/');
  return cut < 0 ? [clean, ''] : [clean.slice(0, cut), clean.slice(cut).replace(/\/$/, '')];
};

// The platform of a cast, read off its channel URL; nothing is stored
export const platformOf = (url) => {
  const [host] = hostPath(url);
  if (host === 'twitch.tv') return 'twitch';
  if (host === 'youtube.com' || host === 'youtu.be') return 'youtube';
  return null;
};

// A Twitch video, a YouTube watch or live page, or a youtu.be short link: a video, not a channel
const VIDEO_PATHS = { 'twitch.tv': /^\/videos\/\d+$/, 'youtube.com': /^(\/watch|\/live\/[\w-]+)$/, 'youtu.be': /^\/[\w-]+$/ };
export const isVideoUrl = (url) => {
  const [host, path] = hostPath(url);
  return VIDEO_PATHS[host]?.test(path) ?? false;
};

// The VOD a chip links: the pasted one, or a YouTube video URL once the series has a result
export const vodOf = (series, cast) => {
  if (cast.vod_url) return cast.vod_url;
  return !isUnscored(series) && isVideoUrl(cast.channel_url) ? cast.channel_url : null;
};

export const PLATFORM_ICONS = { twitch: 'mdi-twitch', youtube: 'mdi-youtube' };

// A cast series counts as on now from half an hour before its time to four hours after
const BEFORE = 30 * 60 * 1000;
const AFTER = 4 * 60 * 60 * 1000;

// A claimed series with no result, inside its window. No platform is asked
export const onNow = (series, now = Date.now()) => {
  if (!series?.casts?.length || !series.date_time) return false;
  if (!isUnscored(series)) return false;
  const at = Date.parse(series.date_time);
  return at - BEFORE <= now && now <= at + AFTER;
};
