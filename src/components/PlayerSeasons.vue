<!-- One row per season the player signed up for, newest first. The row carries
     the season's state, his team, race, series record and round strip, ladder
     record and MMR; it opens into his series by round and the ladder tab. The
     season named by `open` draws the `current` slot instead of the series table. -->
<template>
  <StatusAlert v-model="errorMessage" />
  <v-expansion-panels v-if="rows.length" v-model="opened" class="season-panels" variant="accordion" flat>
    <v-expansion-panel v-for="row in rows" :key="row.season.id" :value="row.season.id">
      <v-expansion-panel-title class="season-head">
        <div class="season-grid">
          <div class="season-name">
            <div class="d-flex align-center flex-wrap ga-2 text-h6">
              {{ row.season.name }}
              <v-chip v-if="row.won" size="x-small" variant="outlined">
                <v-icon start size="x-small" color="primary">mdi-crown</v-icon>Champion
              </v-chip>
              <v-chip v-else size="x-small" variant="outlined" :color="STATE_COLOR[row.season.phase] ?? undefined">
                <v-icon start size="x-small">mdi-circle</v-icon>{{ STATE[row.season.phase] ?? row.season.phase ?? '—' }}
              </v-chip>
            </div>
            <div class="text-caption text-medium-emphasis">{{ dates(row.season) }}</div>
          </div>
          <div class="fact"><div class="text-caption text-medium-emphasis">Team</div><div>{{ row.team ?? '—' }}</div></div>
          <div class="fact">
            <div class="text-caption text-medium-emphasis">Race</div>
            <div class="d-flex align-center ga-1"><RaceIcon v-if="row.race" :raceIdentifier="row.race" />{{ raceName(row.race) }}</div>
          </div>
          <div class="fact">
            <div class="text-caption text-medium-emphasis">Series</div>
            <div class="d-flex align-center ga-2">
              <span><span class="text-win">{{ row.stat?.wins ?? 0 }}</span> – <span class="text-loss">{{ row.stat?.losses ?? 0 }}</span></span>
              <span v-if="row.season.round_count" class="weeks">
                <span v-for="week in row.season.round_count" :key="week" class="week" :class="weekClass(row, week)" :title="weekTitle(row, week)" />
              </span>
            </div>
          </div>
          <div class="fact">
            <div class="text-caption text-medium-emphasis">Ladder</div>
            <div v-if="row.ladder">{{ row.ladder.points }} pts <span class="text-medium-emphasis">· {{ row.ladder.wins }} – {{ row.ladder.losses }}</span></div>
            <div v-else class="text-medium-emphasis">—</div>
          </div>
          <div class="fact">
            <div class="text-caption text-medium-emphasis"><W3CMmr /></div>
            <div v-if="row.ladder?.mmr?.current != null">
              {{ row.ladder.mmr.current }}
              <span v-if="mmrDelta(row) > 0" class="text-win">▲ {{ mmrDelta(row) }}</span>
              <span v-else-if="mmrDelta(row) < 0" class="text-loss">▼ {{ -mmrDelta(row) }}</span>
            </div>
            <div v-else class="text-medium-emphasis">no games yet</div>
          </div>
        </div>
      </v-expansion-panel-title>
      <v-expansion-panel-text>
        <slot v-if="row.season.id === openId && $slots.current" name="current" :row="row" />
        <section v-else class="section">
          <h4 class="text-body-1 font-weight-medium">Series by round <span class="text-caption text-medium-emphasis">{{ row.stat?.wins ?? 0 }} – {{ row.stat?.losses ?? 0 }}</span></h4>
          <v-table density="compact">
            <thead>
              <tr>
                <th>Round</th>
                <th>Opponent</th>
                <th v-if="mdAndUp">Team</th>
                <th class="text-right">Result</th>
                <th v-if="mdAndUp" class="text-right">Played</th>
                <th v-if="mdAndUp"></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="series in row.series" :key="series.id">
                <td>{{ series.match?.playday ?? '—' }}</td>
                <td>
                  <PlayerName :player="opponent(series)" :race="opponentRace(series)" />
                  <span v-if="!mdAndUp" class="text-medium-emphasis ml-1">{{ opponentTeam(series, row) }}</span>
                </td>
                <td v-if="mdAndUp">{{ opponentTeam(series, row) }}</td>
                <td class="text-right font-weight-medium" :class="resultClass(series)">{{ result(series) }}</td>
                <td v-if="mdAndUp" class="text-right">{{ playedOn(series) }}</td>
                <td v-if="mdAndUp" class="text-medium-emphasis">
                  <div class="d-flex align-center ga-2">
                    <span v-if="series.host_player_id === player.id">host</span>
                    <CastChips :series="series" />
                  </div>
                </td>
              </tr>
              <tr v-if="!row.series.length">
                <td colspan="6" class="text-medium-emphasis">No series yet.</td>
              </tr>
            </tbody>
          </v-table>
        </section>
        <template v-if="row.stat">
          <v-divider class="mb-4" />
          <PlayerLadderTab :player="player" :seasonId="row.season.id" />
        </template>
      </v-expansion-panel-text>
    </v-expansion-panel>
  </v-expansion-panels>
  <div v-else class="text-medium-emphasis pa-4">Not signed up for a season.</div>
</template>

<script setup>
import { computed, ref, watch } from 'vue';
import { DateTime } from 'luxon';
import { useDisplay } from 'vuetify';
import { useLadderStore, useSeasonStore, useSeriesStore, useTeamStore } from '@/stores';
import { raceWrapper } from '@/helpers/races';
import { isUnscored } from '@/helpers/season-phase.mjs';
import { currentRound } from '@/helpers/rounds.mjs';
import CastChips from '@/components/CastChips.vue';
import PlayerLadderTab from '@/components/PlayerLadderTab.vue';
import PlayerName from '@/components/PlayerName.vue';
import RaceIcon from '@/components/RaceIcon.vue';
import StatusAlert from '@/components/StatusAlert.vue';
import W3CMmr from '@/components/W3CMmr.vue';

const props = defineProps({
  player: { type: Object, required: true },
  open: Number, // the season expanded at first, whose body the current slot draws
});
const opened = ref(props.open ?? null);

// The backend's phase, in the words a player uses
const STATE = { open: 'Scheduled', commenced: 'In progress', overdue: 'In progress', complete: 'Completed' };
const STATE_COLOR = { commenced: 'info', overdue: 'info' };

const { mdAndUp } = useDisplay();
const ladderStore = useLadderStore();
const seasonStore = useSeasonStore();
const seriesStore = useSeriesStore();
const teamStore = useTeamStore();

const errorMessage = ref(null);
const seriesBySeason = ref({});
const ladderBySeason = ref({});

// Newest season first; the season list carries the phase and dates, the
// player's own record his team and series tally
const rows = computed(() => {
  const seasons = seasonStore.seasons ?? [];
  return (props.player.signup_seasons ?? [])
    .map(signup => {
      const season = seasons.find(s => s.id === signup.id) ?? signup;
      const stat = (props.player.gnl_stats ?? []).find(s => s.season_id === signup.id) ?? null;
      return {
        season,
        stat,
        race: signup.signup_race,
        team: (teamStore.teams ?? []).find(t => t.id === stat?.team_id)?.name ?? null,
        series: byWeek(seriesBySeason.value[signup.id] ?? []),
        ladder: ladderBySeason.value[signup.id] ?? null,
        won: (props.player.trophies ?? []).some(t => t.season_id === signup.id),
      };
    })
    .sort((a, b) => b.season.id - a.season.id);
});

const byWeek = (series) => [...series].sort((a, b) =>
  (a.match?.playday ?? 0) - (b.match?.playday ?? 0) || (a.date_time ?? '').localeCompare(b.date_time ?? ''));

const raceName = (code) => (code ? raceWrapper.getRaceObject(code)?.name ?? code : '—');

const day = (iso) => DateTime.fromISO(iso).toFormat('LLL d');
const dates = (season) => {
  if (!season.start_date) return '';
  const span = `${day(season.start_date)} – ${season.end_date ? day(season.end_date) : '…'}`;
  const rounds = season.round_count;
  if (!rounds) return span;
  if (season.phase === 'complete') return `${span} · ${rounds} rounds`;
  if (season.phase === 'open') return span;
  // The round windows say which round is in play; a round is not a week long
  const now = currentRound(season.rounds ?? []);
  return now ? `${span} · round ${now.playday} of ${rounds}` : `${span} · ${rounds} rounds`;
};

const mine = (series) => series.player1_id === props.player.id;
const opponent = (series) => (mine(series) ? series.player2 : series.player1) ?? { name: '—' };
// the race the opponent played in that series, not the one he signed the season up on
const opponentRace = (series) => (mine(series) ? series.player2_race : series.player1_race);
const opponentTeam = (series, row) => {
  const match = series.match;
  if (!match) return '';
  return (match.team1_id === row.stat?.team_id ? match.team2 : match.team1)?.name ?? '';
};
const scores = (series) => (mine(series)
  ? [series.player1_score, series.player2_score]
  : [series.player2_score, series.player1_score]);
const scored = (series) => !isUnscored(series);
const result = (series) => {
  if (!scored(series)) return series.date_time ? 'scheduled' : 'unscheduled';
  const [me, them] = scores(series);
  return `${me} – ${them}`;
};
const resultClass = (series) => {
  if (!scored(series)) return 'text-medium-emphasis font-weight-regular';
  const [me, them] = scores(series);
  return me > them ? 'text-win' : me < them ? 'text-loss' : '';
};
const playedOn = (series) => (series.date_time ? DateTime.fromISO(series.date_time).toLocal().toFormat('LLL d') : '—');
// One square per round: won, lost, mixed, still to play, or no series
const weekSeries = (row, week) => row.series.filter(s => s.match?.playday === week);
const weekClass = (row, week) => {
  const list = weekSeries(row, week);
  if (!list.length) return 'none';
  if (list.some(s => !scored(s))) return 'pending';
  const won = list.filter(s => { const [me, them] = scores(s); return me > them; }).length;
  const lost = list.filter(s => { const [me, them] = scores(s); return me < them; }).length;
  return won && lost ? 'mixed' : won ? 'won' : lost ? 'lost' : 'none';
};
const weekTitle = (row, week) => {
  const list = weekSeries(row, week);
  if (!list.length) return `Round ${week} · no series`;
  return list.map(s => `Round ${week} · vs ${opponent(s).name} · ${result(s)}`).join('\n');
};

const mmrDelta = (row) => {
  const mmr = row.ladder?.mmr;
  return mmr?.current != null && mmr?.start != null ? mmr.current - mmr.start : 0;
};

// With no season named, the newest season still running opens onto its rounds
const openId = computed(() => props.open
  ?? rows.value.find(row => row.season.phase && row.season.phase !== 'complete')?.season.id
  ?? null);
// A reader wants the season with ladder facts in it, which is rarely the one just opened
const defaultOpen = computed(() => props.open
  ?? rows.value.find(row => row.ladder?.games)?.season.id
  ?? openId.value);
// it follows the ladder reads as they land, until the reader opens a season himself
watch(defaultOpen, (id, was) => { if (opened.value == null || opened.value === was) opened.value = id; }, { immediate: true });

// The season list and the team names once; one series read and one ladder
// read per season, for the row's own facts
const load = async () => {
  errorMessage.value = null;
  seriesBySeason.value = {};
  ladderBySeason.value = {};
  try {
    if (!seasonStore.seasons?.length) await seasonStore.fetchSeasons();
    if (!teamStore.teams?.length) await teamStore.fetchTeams();
    await Promise.all((props.player.signup_seasons ?? []).map(async (signup) => {
      const [series, ladder] = await Promise.all([
        seriesStore.playerSeries(signup.id, props.player.id),
        ladderStore.userLadder(props.player.id, { seasonId: signup.id }).catch(() => null),
      ]);
      seriesBySeason.value = { ...seriesBySeason.value, [signup.id]: series };
      ladderBySeason.value = { ...ladderBySeason.value, [signup.id]: ladder };
    }));
  } catch (error) {
    errorMessage.value = error.message;
  }
};

watch(() => props.player, load, { immediate: true });
</script>

<style scoped>
.season-head :deep(.v-expansion-panel-title__overlay) { opacity: 0; }
.season-panels { container-type: inline-size; }
.season-grid {
  display: grid;
  grid-template-columns: minmax(200px, 1.4fr) 1fr 1fr 1.2fr 1.1fr 1.1fr;
  gap: 16px;
  align-items: center;
  width: 100%;
}
.section { padding-bottom: 16px; }
.section h4 { margin-bottom: 8px; }
.fact { white-space: nowrap; }
.weeks { display: inline-flex; gap: 3px; }
.week {
  width: 12px;
  height: 12px;
  border-radius: 2px;
  background: rgba(var(--v-border-color), var(--v-border-opacity));
  box-sizing: border-box;
}
.week.won { background: rgb(var(--v-theme-win)); }
.week.lost { background: rgb(var(--v-theme-loss)); }
.week.mixed { background: linear-gradient(90deg, rgb(var(--v-theme-win)) 50%, rgb(var(--v-theme-loss)) 50%); }
.week.pending { background: transparent; border: 1px dashed rgba(var(--v-theme-on-surface), 0.5); }
/* the panels' own width, not the window's: the side panel is narrow on a wide screen */
@container (max-width: 959px) {
  .season-grid { display: flex; flex-wrap: wrap; gap: 4px 14px; }
  .season-name { width: 100%; }
  .fact { display: flex; align-items: center; gap: 6px; }
}
</style>
