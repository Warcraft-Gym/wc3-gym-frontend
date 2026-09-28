import { test } from 'node:test';
import assert from 'node:assert/strict';
import { activeAdminPath, adminFrame } from './admin-nav.mjs';

const admin = (path, adminOnly = false) => adminFrame(path, { adminHat: true, adminOnly });

// An admin who opens a season or its draft from the Admin tab keeps the sidebar, so the way back is one click
test('a page under a section keeps the sidebar, with no phone back link there', () => {
  assert.deepEqual(admin('/seasons/12'), { sidebar: true, backLink: false });
  assert.deepEqual(admin('/seasons/12/assign'), { sidebar: true, backLink: false });
  assert.deepEqual(admin('/events/5'), { sidebar: true, backLink: false });
});

test('a match or a series opened from a season keeps the sidebar and marks Seasons', () => {
  assert.deepEqual(admin('/match/7'), { sidebar: true, backLink: false });
  assert.deepEqual(admin('/series/9'), { sidebar: true, backLink: false });
  assert.equal(activeAdminPath('/match/7'), '/seasons');
  assert.equal(activeAdminPath('/series/9'), '/seasons');
});

// The Teams section leads to a team, and a season to its teams; the admin's own team reads the same
test('a team page, overall or in a season, keeps the sidebar and marks Teams', () => {
  assert.deepEqual(admin('/team/3'), { sidebar: true, backLink: false });
  assert.deepEqual(admin('/team/3/season/12'), { sidebar: true, backLink: false });
  assert.equal(activeAdminPath('/team/3/season/12'), '/teams');
  assert.equal(activeAdminPath('/teams'), '/teams');
});

// Home and a player page are the admin's own pages as a player; they keep the plain layout
test('an admin sees no sidebar on the pages the Admin tab does not lead to', () => {
  for (const path of ['/', '/player/Name%231234', '/profile', '/availability', '/matches']) {
    assert.deepEqual(admin(path), { sidebar: false, backLink: false }, path);
  }
});

test('a page of the admin area has the sidebar and the phone back link', () => {
  assert.deepEqual(admin('/seasons'), { sidebar: true, backLink: true });
  assert.deepEqual(admin('/seasons/12/maps', true), { sidebar: true, backLink: true });
});

test('the admin home needs no back link to itself', () => {
  assert.deepEqual(admin('/admin'), { sidebar: true, backLink: false });
});

// A player or a captain reads the same season pages; the sidebar is the admin's alone
test('a session without the admin hat gets no frame anywhere', () => {
  for (const path of ['/', '/seasons', '/seasons/12', '/match/7', '/team/3/season/12', '/admin']) {
    assert.deepEqual(adminFrame(path, { adminHat: false, adminOnly: false }), { sidebar: false, backLink: false });
  }
});

test('a page under a listed section marks that section', () => {
  assert.equal(activeAdminPath('/seasons/12/assign'), '/seasons');
  assert.equal(activeAdminPath('/config/discord-roles'), '/config/discord-roles');
  assert.equal(activeAdminPath('/'), null);
  assert.equal(activeAdminPath('/matches'), null);
});
