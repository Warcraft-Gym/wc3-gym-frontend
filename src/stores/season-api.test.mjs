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

  for (const text of [season, ladder, teams, availability, series, fantasy, players, fetchWrapper]) {
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
});
