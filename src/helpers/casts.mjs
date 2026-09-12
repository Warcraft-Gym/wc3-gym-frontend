import { isUnscored } from './season-phase.mjs';

// The host without www or m, and the path without its query or a trailing slash
const hostPath = (url) => {
  const clean = (url || '').trim().replace(/^https?:\/\//, '').replace(/^(www|m)\./, '').split(/[?#]/)[0];
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

export const PLATFORM_ICONS = { twitch: 'mdi-twitch', youtube: 'mdi-youtube' };
export const PLATFORM_NAMES = { twitch: 'Twitch', youtube: 'YouTube' };

// One video rather than a channel. The backend decides the stored VOD; this only writes the advice
const VIDEO_PATHS = { 'twitch.tv': /^\/videos\/\d+$/, 'youtube.com': /^(\/watch|\/live\/[\w-]+)$/, 'youtu.be': /^\/[\w-]+$/ };
const YOUTUBE_LIVE_PAGE = /^\/@[\w.-]+\/live$/;

// What a viewer gets from this link, as a sentence, so the field answers back while you type
export const linkAdvice = (url, wantVideo) => {
  const text = (url || '').trim();
  if (!text) {
    return wantVideo
      ? 'Paste the video of your cast of this series.'
      : 'Paste the page where people watch you cast this series.';
  }
  const platform = platformOf(text);
  if (!platform) return 'Paste a twitch.tv or youtube.com link.';
  const [host, path] = hostPath(text);
  const isVideo = VIDEO_PATHS[host]?.test(path) ?? false;
  if (wantVideo) {
    return isVideo
      ? `Viewers open this ${PLATFORM_NAMES[platform]} video.`
      : `Paste the video itself, not a ${PLATFORM_NAMES[platform]} channel.`;
  }
  if (isVideo && platform === 'youtube') return 'Viewers open this video, and it stays the VOD after the stream.';
  if (isVideo) return 'Viewers open this Twitch video.';
  if (YOUTUBE_LIVE_PAGE.test(path)) return 'Viewers open your live page. Add the video link as the VOD afterwards.';
  return `Viewers open your ${PLATFORM_NAMES[platform]} channel. Add the video link as the VOD afterwards.`;
};

// A profile channel, typed as a handle or pasted as a link, normalised to what gets stored.
// A video link is refused here: a profile holds the channel, a cast holds the video
const CHANNEL_ERROR = {
  twitch: 'Type your Twitch handle, or paste a twitch.tv channel link.',
  youtube: 'Type your YouTube @handle, or paste a youtube.com channel link.',
};
const YOUTUBE_CHANNEL_PATH = /^\/(channel|c|user)\/[\w.-]+/;
// A Twitch handle holds letters, digits and underscores; a YouTube handle also takes a dot or a dash
const HANDLE = { twitch: /^\w+$/, youtube: /^[\w.-]+$/ };

export const channelInput = (platform, text) => {
  const raw = (text || '').trim();
  if (!raw) return { url: null };
  const wrong = { url: null, error: CHANNEL_ERROR[platform] };
  const typed = platformOf(raw);
  if (!typed) {  // a bare handle, with or without the @ YouTube writes
    const handle = raw.replace(/^@/, '');
    if (raw.includes('/') || !HANDLE[platform]?.test(handle)) return wrong;
    return { url: platform === 'twitch' ? `https://twitch.tv/${handle}` : `https://youtube.com/@${handle}` };
  }
  const [host, path] = hostPath(raw);
  if (VIDEO_PATHS[host]?.test(path)) return { url: null, error: 'That link opens one video. Paste your channel page instead.' };
  if (typed !== platform) return wrong;
  if (platform === 'twitch') {
    // The first path segment is the channel, so a sub-page link works the way the YouTube branch does
    const handle = path.match(/^\/(\w+)(?:\/|$)/);
    return handle ? { url: `https://twitch.tv/${handle[1]}` } : wrong;
  }
  const at = path.match(/^\/@([\w.-]+)/);
  if (at) return { url: `https://youtube.com/@${at[1]}` };
  const channel = path.match(YOUTUBE_CHANNEL_PATH);
  return channel ? { url: `https://youtube.com${channel[0]}` } : wrong;
};

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
