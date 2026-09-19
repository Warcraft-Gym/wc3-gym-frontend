import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = (name) => readFileSync(new URL(name, import.meta.url), 'utf8');

const NAMES = [
  'availability', 'config', 'event', 'fantasy', 'ladder', 'map',
  'match', 'player', 'player_career_stats', 'season', 'series', 'team',
];

test('the season clients use the event API and no deprecated season route', () => {
  const store = Object.fromEntries(NAMES.map((name) => [name, source(`./${name}.ts`)]));
  const fetchWrapper = source('../helpers/fetch-wrapper.js');

  for (const text of [...Object.values(store), fetchWrapper]) {
    assert.doesNotMatch(text, /\/seasons(?:[/?`])/);
    assert.doesNotMatch(text, /teams\/season|series\/season|\/season\/\$\{/);
  }
  assert.match(store.season, /\/events\?league_id=/);
  assert.match(store.season, /\/events\/\$\{season_id\}/);
  assert.match(store.ladder, /\/events\/\$\{season_id\}\/ladder/);
  assert.match(store.team, /\/leagues\/\$\{leagueId\}\/teams/);
  assert.match(store.team, /\/events\/\$\{season_id\}\/teams/);
  assert.match(store.series, /\/events\/\$\{season_id\}\/series\/search/);
  assert.match(fetchWrapper, /\\\/events\\\/\\d\+\\\/ladder/);
});
