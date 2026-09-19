import test from 'node:test';
import assert from 'node:assert/strict';
import { teamLabel, teamPath } from './teams.mjs';

test('a team reads by its long name and falls back to its tag', () => {
  assert.equal(teamLabel({ name: 'SA', long_name: "Saul's Angels" }), "Saul's Angels");
  assert.equal(teamLabel({ name: 'SA' }), 'SA');
  assert.equal(teamLabel(null), '');
});

// A season page names the team page of that season; a page with no season context
// links the plain team page. A payload with no id carries no link at all.
test('a season key picks the season team page', () => {
  assert.equal(teamPath({ id: 5 }, 'gnl-s18'), '/team/5/season/gnl-s18');
  assert.equal(teamPath({ id: 5 }, 4), '/team/5/season/4');
  assert.equal(teamPath({ id: 5 }), '/team/5');
  assert.equal(teamPath({ id: 5 }, ''), '/team/5');
  assert.equal(teamPath({ name: 'SA' }, 'gnl-s18'), null);
});
