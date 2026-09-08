import { test } from 'node:test';
import assert from 'node:assert/strict';
import { platformOf, onNow, isVideoUrl, vodOf } from './casts.mjs';

test('the platform is the host of the channel URL', () => {
  assert.equal(platformOf('https://www.twitch.tv/grubby'), 'twitch');
  assert.equal(platformOf('twitch.tv/grubby'), 'twitch');
  assert.equal(platformOf('https://youtu.be/abc'), 'youtube');
  assert.equal(platformOf('https://m.youtube.com/watch?v=abc'), 'youtube');
  assert.equal(platformOf('https://kick.com/x'), null);
});

test('a claimed series is on now inside its window and with no result', () => {
  const at = Date.parse('2026-09-08T20:00:00Z');
  const series = { date_time: '2026-09-08T20:00:00Z', casts: [{ id: 1 }] };
  assert.equal(onNow(series, at - 29 * 60 * 1000), true);
  assert.equal(onNow(series, at + 4 * 60 * 60 * 1000), true);
  assert.equal(onNow(series, at - 31 * 60 * 1000), false);
  assert.equal(onNow(series, at + 5 * 60 * 60 * 1000), false);
  assert.equal(onNow({ ...series, casts: [] }, at), false);
  assert.equal(onNow({ ...series, date_time: null }, at), false);
  assert.equal(onNow({ ...series, player1_score: 2, player2_score: 0 }, at), false);
});

test('a video URL is a Twitch video, a YouTube watch or live page, or a youtu.be link', () => {
  assert.equal(isVideoUrl('https://www.twitch.tv/videos/2233445566?t=1h2m'), true);
  assert.equal(isVideoUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ'), true);
  assert.equal(isVideoUrl('youtube.com/live/dQw4w9WgXcQ/'), true);
  assert.equal(isVideoUrl('youtu.be/dQw4w9WgXcQ?t=42'), true);
  assert.equal(isVideoUrl('https://www.twitch.tv/grubby'), false);
  assert.equal(isVideoUrl('https://www.youtube.com/@grubby'), false);
  assert.equal(isVideoUrl(null), false);
});

test('the VOD is the pasted one, or a YouTube video URL once the series has a result', () => {
  const scored = { player1_score: 2, player2_score: 1 };
  const yt = { channel_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' };
  const twitch = { channel_url: 'https://www.twitch.tv/grubby' };
  assert.equal(vodOf(scored, yt), yt.channel_url);
  assert.equal(vodOf({}, yt), null);
  assert.equal(vodOf(scored, twitch), null);
  assert.equal(vodOf({}, { ...twitch, vod_url: 'https://www.twitch.tv/videos/1' }), 'https://www.twitch.tv/videos/1');
});
