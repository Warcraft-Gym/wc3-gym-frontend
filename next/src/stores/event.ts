/* eslint-disable @typescript-eslint/no-explicit-any */
import { backendUrl, fetchWrapper } from "@/helpers";
import { checkInFor } from "@/helpers/events.mjs";
import { availabilityStore } from "./availability";

// The leagues and their events. A league is what repeats, an event is one run of it,
// and a GNL season is the gnl-kind event of the GNL league. Reads are open, writes admin.
const store = {
  async fetchLeagues() {
    return await fetchWrapper.get(`${backendUrl}/leagues`);
  },
  // One league answers its own events, newest first
  async fetchLeague(league_id: number) {
    return await fetchWrapper.get(`${backendUrl}/leagues/${league_id}`);
  },
  async createLeague(league: any) {
    return await fetchWrapper.post(`${backendUrl}/leagues`, league);
  },
  async updateLeague(league_id: number, league: any) {
    return await fetchWrapper.put(`${backendUrl}/leagues/${league_id}`, league);
  },
  async fetchEvents(league_id: number | null = null, kind: string | null = null) {
    const filters = [league_id && `league_id=${league_id}`, kind && `kind=${kind}`].filter(Boolean);
    const query = filters.length ? `?${filters.join("&")}` : "";
    return await fetchWrapper.get(`${backendUrl}/events${query}`);
  },
  // One page of one kind's events, newest first, with the count of all of them
  async fetchEventsPage(kind: string, limit: number, offset: number) {
    return await fetchWrapper.getPage(`${backendUrl}/events?kind=${kind}&limit=${limit}&offset=${offset}`);
  },
  async fetchEvent(event_id: number) {
    return await fetchWrapper.get(`${backendUrl}/events/${event_id}`);
  },
  async createEvent(event: any) {
    return await fetchWrapper.post(`${backendUrl}/events`, event);
  },
  async updateEvent(event_id: number, event: any) {
    return await fetchWrapper.put(`${backendUrl}/events/${event_id}`, event);
  },
  // The stages are written for the whole event at once: their positions must stay 1..n
  async setStages(event_id: number, stages: any) {
    return await fetchWrapper.put(`${backendUrl}/events/${event_id}/stages`, stages);
  },
  // The divisions are written for the whole event at once, in position order
  async setDivisions(event_id: number, divisions: any) {
    return await fetchWrapper.put(`${backendUrl}/events/${event_id}/divisions`, divisions);
  },
  // Cut the entrants into the stored divisions from the MMR of their signup race
  async assignDivisions(event_id: number) {
    return await fetchWrapper.post(`${backendUrl}/events/${event_id}/divisions/assign`);
  },
  async fetchEntrants(event_id: number) {
    return await fetchWrapper.get(`${backendUrl}/events/${event_id}/entrants`);
  },
  // Every published event with the caller's own entrant, check-in window and one action
  async myEvents() {
    return await fetchWrapper.get(`${backendUrl}/me/events`);
  },
  // The caller enters the event; the answer carries the eligibility warnings, which never block
  async signUp(event_id: number, body: any) {
    return await fetchWrapper.post(`${backendUrl}/events/${event_id}/entrants`, body);
  },
  // The caller's own rows stay and read withdrawn; a race names one row of a
  // player who entered on more than one
  async withdraw(event_id: number, race: string | null = null) {
    const query = race ? `?race=${encodeURIComponent(race)}` : "";
    return await fetchWrapper.delete(`${backendUrl}/events/${event_id}/entrants/me${query}`);
  },
  // An admin enters any player or team, whether the signups stand open or not
  async addEntrant(event_id: number, entrant: any) {
    return await fetchWrapper.post(`${backendUrl}/events/${event_id}/entrants/admin`, entrant);
  },
  async removeEntrant(event_id: number, entrant_id: number) {
    return await fetchWrapper.delete(`${backendUrl}/events/${event_id}/entrants/${entrant_id}`);
  },
  // The caller's own row, or any row for an admin
  async checkIn(event_id: number, entrant_id: number) {
    return await fetchWrapper.post(`${backendUrl}/events/${event_id}/entrants/${entrant_id}/checkin`);
  },
  // The caller checks in the way the event asks: the event shape posts the entrant row,
  // the round shape answers the next round's availability
  async checkInRow(row: any) {
    const call = checkInFor(row);
    return call.shape === "round" ? await store.answerRound(row, true) : await store.checkIn(call.event_id, call.entrant_id);
  },
  // The caller answers the next round: the check-in says yes, the blocks hint says no
  async answerRound(row: any, available: boolean) {
    return await availabilityStore.setPlayerAvailability({ ...checkInFor(row).answer, available });
  },
  // Move one entrant into a division and mark it placed by hand, so a reassign leaves it
  async placeEntrant(event_id: number, entrant_id: number, placement: any) {
    return await fetchWrapper.put(`${backendUrl}/events/${event_id}/entrants/${entrant_id}`, placement);
  },
  // The seeds of one stage: mmr, random, or an order of entrant ids for manual
  async setSeeds(event_id: number, stage_id: number, seeds: any) {
    return await fetchWrapper.put(`${backendUrl}/events/${event_id}/stages/${stage_id}/seeds`, seeds);
  },
  async lockSeeds(event_id: number, stage_id: number) {
    return await fetchWrapper.post(`${backendUrl}/events/${event_id}/stages/${stage_id}/seeds/lock`);
  },
  // The rounds and the series of one stage, with the feeder graph the bracket draws
  async fetchStage(event_id: number, stage_id: number) {
    return await fetchWrapper.get(`${backendUrl}/events/${event_id}/stages/${stage_id}/series`);
  },
  async fetchStandings(event_id: number, stage_id: number) {
    return await fetchWrapper.get(`${backendUrl}/events/${event_id}/stages/${stage_id}/standings`);
  },
  // Writes every series of the stage from its locked seeds, per division
  async generateStage(event_id: number, stage_id: number) {
    return await fetchWrapper.post(`${backendUrl}/events/${event_id}/stages/${stage_id}/generate`);
  },
  // Pairs one more round of a stage that draws round by round, per division
  async drawNextRound(event_id: number, stage_id: number) {
    return await fetchWrapper.post(`${backendUrl}/events/${event_id}/stages/${stage_id}/rounds`);
  },
  // A KOTH night is an event, so the module owns only these writes
  async openNight(night: any) {
    return await fetchWrapper.post(`${backendUrl}/koth/nights`, night);
  },
  // Deletes the series nobody played, so every series left carries a result
  async closeNight(event_id: number) {
    return await fetchWrapper.post(`${backendUrl}/koth/nights/${event_id}/close`);
  },
  // no id reads the night that takes signups (404 while none is open); fresh adds a query the edge cache pattern misses
  async fetchBoard(night_id: number | null = null, fresh = false) {
    const path = night_id ? `nights/${night_id}/board` : "board";
    return await fetchWrapper.get(`${backendUrl}/koth/${path}${fresh ? `?t=${Date.now()}` : ""}`);
  },
  // Every write below answers the whole board again, so a page never re-reads after one
  async startKothSeries(night_id: number, entrant1_id: number, entrant2_id: number) {
    return await fetchWrapper.post(`${backendUrl}/koth/nights/${night_id}/series`, { entrant1_id, entrant2_id });
  },
  async cancelKothSeries(night_id: number, series_id: number) {
    return await fetchWrapper.delete(`${backendUrl}/koth/nights/${night_id}/series/${series_id}`);
  },
  // Enter or change the winner; the crown and the line follow it
  async setKothWinner(night_id: number, series_id: number, winner: 1 | 2) {
    return await fetchWrapper.put(`${backendUrl}/koth/nights/${night_id}/series/${series_id}/result`, { winner });
  },
  // Moves the MMR band of each bracket in place and cuts the rated rows nobody placed by hand again
  async setKothBounds(night_id: number, bounds: { division_id: number; lower_bound: number }[]) {
    return await fetchWrapper.put(`${backendUrl}/koth/nights/${night_id}/bounds`, { bounds });
  },
  async setKothQueue(night_id: number, division_id: number, entrant_ids: number[]) {
    return await fetchWrapper.put(`${backendUrl}/koth/nights/${night_id}/brackets/${division_id}/queue`, { entrant_ids });
  },
  // Pass the crown on, or step down with null, which leaves the throne empty
  async setKothCrown(night_id: number, division_id: number, entrant_id: number | null) {
    return await fetchWrapper.put(`${backendUrl}/koth/nights/${night_id}/brackets/${division_id}/crown`, { entrant_id });
  },
  async removeKothEntrant(night_id: number, entrant_id: number) {
    return await fetchWrapper.delete(`${backendUrl}/koth/nights/${night_id}/entrants/${entrant_id}`);
  },
  // Back at the end of the line, without the crown
  async restoreKothEntrant(night_id: number, entrant_id: number) {
    return await fetchWrapper.post(`${backendUrl}/koth/nights/${night_id}/entrants/${entrant_id}/restore`);
  },
  // Moves the top entrants of a finished stage into the next stage
  async advanceStage(event_id: number, stage_id: number) {
    return await fetchWrapper.post(`${backendUrl}/events/${event_id}/stages/${stage_id}/advance`);
  },
  // A cleared score reopens the bracket below; force allows it past a later result
  async scoreSeries(series_id: number, scores: any, force = false) {
    const query = force ? "?force=true" : "";
    return await fetchWrapper.put(`${backendUrl}/series/${series_id}${query}`, scores);
  },
  // Where every seat of a free for all lobby finished; a lobby plays one game
  async setPlaces(series_id: number, places: any) {
    return await fetchWrapper.put(`${backendUrl}/series/${series_id}/places`, { places });
  },
  // Seats a lobby again before it is played, so an entrant moves between lobbies
  async setLobbySides(series_id: number, entrant_ids: number[]) {
    return await fetchWrapper.put(`${backendUrl}/series/${series_id}/sides`, { entrant_ids });
  },
  // The players one side of a fixture series fields; a captain writes his own side
  async setSideRoster(series_id: number, side_no: number, user_ids: number[]) {
    return await fetchWrapper.put(`${backendUrl}/series/${series_id}/sides`, {
      sides: [{ side_no, user_ids }],
    });
  },
  // Closes the event: the table of its last stage becomes the places it awards
  async finishEvent(event_id: number) {
    return await fetchWrapper.post(`${backendUrl}/events/${event_id}/finish`);
  },
  // The series one fixture holds, with the event that runs it. A fixture plays one
  // stage, so the first stage that answers it is the one it belongs to. A GNL season
  // draws its fixtures on its own pages and answers no rows here.
  async fetchFixture(event_id: number, match_id: number) {
    const event = await fetchWrapper.get(`${backendUrl}/events/${event_id}`);
    if (event.kind === "gnl") return { event, series: [] };
    for (const stage of event.stages || []) {
      const drawn = await store.fetchStage(event.id, stage.id).catch(() => null);
      const rows = (drawn?.series || []).filter((row: any) => row.match_id === match_id);
      if (rows.length) return { event, stage, series: rows };
    }
    return { event, series: [] };
  },
  // A series no game was played for: a walkover or a forfeit, with the side that takes it
  async awardSeries(series_id: number, result_kind: string, winner: any) {
    return await fetchWrapper.put(`${backendUrl}/series/${series_id}/result-kind`, { result_kind, winner });
  },
};

export const useEventStore = () => store;
