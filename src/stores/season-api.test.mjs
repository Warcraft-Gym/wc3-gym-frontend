import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = (name) => readFileSync(new URL(name, import.meta.url), 'utf8');

test('the season clients use the event API and no deprecated season route', () => {
  const season = source('./season.store.js');
  const ladder = source('./ladder.store.js');
  const teams = source('./team.store.js');
  const availability = source('./availability.store.js');
  const series = source('./series.store.js');
  const fantasy = source('./fantasy.store.js');
  const players = source('./player.store.js');
  const fetchWrapper = source('../helpers/fetch-wrapper.js');
  // The Next port calls the same routes
  const nextSeason = source('../../next/src/stores/season.ts');
  const nextLadder = source('../../next/src/stores/ladder.ts');
  const nextModules = [
    'availability', 'config', 'event', 'fantasy', 'map',
    'match', 'player', 'player_career_stats', 'series', 'team',
  ].map((name) => source(`../../next/src/stores/${name}.ts`));

  for (const text of [season, ladder, teams, availability, series, fantasy, players, fetchWrapper, nextSeason, nextLadder, ...nextModules]) {
    assert.doesNotMatch(text, /\/seasons(?:[/?`])/);
    assert.doesNotMatch(text, /teams\/season|series\/season|\/season\/\$\{/);
  }
  assert.match(season, /\/events\?league_id=/);
  assert.match(season, /\/events\/\$\{season_id\}/);
  assert.match(ladder, /\/events\/\$\{season_id\}\/ladder/);
  assert.match(teams, /\/leagues\/\$\{leagueId\}\/teams/);
  assert.match(teams, /\/events\/\$\{season_id\}\/teams/);
  assert.match(series, /\/events\/\$\{season_id\}\/series\/search/);
  assert.match(fetchWrapper, /\\\/events\\\/\\d\+\\\/ladder/);
  assert.match(nextSeason, /\/events\?league_id=/);
  assert.match(nextLadder, /\/events\/\$\{season_id\}\/ladder/);
});
