import { test } from 'node:test';
import assert from 'node:assert/strict';
import { linkAdvice, platformOf, onNow } from './casts.mjs';

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

test('the field says what a viewer gets from the link that was typed', () => {
  assert.equal(linkAdvice('', false), 'Paste the page where people watch you cast this series.');
  assert.equal(linkAdvice('', true), 'Paste the video of your cast of this series.');
  assert.equal(linkAdvice('twitch.tv/grubby', false), 'Viewers open your Twitch channel. Add the video link as the VOD afterwards.');
  assert.equal(linkAdvice('https://youtube.com/@grubby/live', false), 'Viewers open your live page. Add the video link as the VOD afterwards.');
  assert.equal(linkAdvice('https://www.youtube.com/watch?v=dQw4w9WgXcQ', false), 'Viewers open this video, and it stays the VOD after the stream.');
  assert.equal(linkAdvice('twitch.tv/videos/2233445566', false), 'Viewers open this Twitch video.');
  assert.equal(linkAdvice('twitch.tv/videos/2233445566', true), 'Viewers open this Twitch video.');
  assert.equal(linkAdvice('twitch.tv/grubby', true), 'Paste the video itself, not a Twitch channel.');
  assert.equal(linkAdvice('kick.com/grubby', true), 'Paste a twitch.tv or youtube.com link.');
});
