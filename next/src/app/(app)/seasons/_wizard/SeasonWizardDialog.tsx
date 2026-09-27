/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Icon } from "@/components/ui/Icon";
import { StatusAlert } from "@/components/StatusAlert";
import { readStagesPayload } from "@/helpers/event-wizard.mjs";
import { changedRounds, crewChanges, drawMatchups, dropUnpooled, fillRoundMaps, idDiff, matchupRows, stepProblem, wizardSteps } from "@/helpers/season-wizard.mjs";
import { rosterOf } from "@/helpers/team-roster.mjs";
import { cn } from "@/lib/utils";
import { useEventStore, useMapStore, useMatchStore, usePlayerStore, useSeason, useTeamStore } from "@/stores";
import { CaptainsStep } from "./CaptainsStep";
import { GeneralStep } from "./GeneralStep";
import { MatchupsStep, type Week } from "./MatchupsStep";
import { MapsStep } from "./MapsStep";
import { RoundMapsStep } from "./RoundMapsStep";
import { TeamsStep } from "./TeamsStep";

type Row = Record<string, any>;
// What the season stores of its teams, its pool, its round maps and each team's captains and players, to diff the save against
type Linked = {
  teamIds: number[];
  mapIds: number[];
  roundMaps: Record<number, number | null>;
  captains: Record<number, number[]>;
  rosters: Record<number, number[]>;
};

// A GNL season opens early check-in and asks for 20 games over the last 2 W3C seasons
const blankSeason = (): Row => ({
  name: "", round_count: 0, pick_ban: "", series_per_round: 0, score_system: "standard", discordRole: "", start_date: null, end_date: null,
  fantasy_grind: false, signups_open: true, scheduling_enabled: true, checkin_enabled: true, checkin_days: 3, early_checkin: true,
  round_end_zone: null, min_games: 20, min_games_seasons: 2,
});

// A cleared field is null: check-in all season, a floor over every W3C season, a round that ends where the reader is
const blanksAsNull = (season: Row): Row => ({
  ...season,
  checkin_days: season.checkin_days === "" ? null : season.checkin_days,
  min_games: season.min_games === "" ? null : season.min_games,
  min_games_seasons: season.min_games_seasons === "" ? null : season.min_games_seasons,
  round_end_zone: season.round_end_zone || null,
});

const NOTHING_LINKED: Linked = { teamIds: [], mapIds: [], roundMaps: {}, captains: {}, rosters: {} };

// The entries of the ticked teams: a team ticked again gets back what the season stores for it
const forTeams = (ids: number[], now: Record<number, number[]>, stored: Record<number, number[]>) =>
  Object.fromEntries(ids.filter((id) => now[id] ?? stored[id]).map((id) => [id, now[id] ?? stored[id]]));

/** Creating or editing one GNL season in six steps: its settings, its teams, their captains and
 *  players, the matchups drawn at random, its map pool and the map each round starts on. Nothing of
 *  the season is written before the last button; a team or a map made inside a step is stored at
 *  once, since it outlives the season. The save diffs what the season stores against the steps, and
 *  after each write moves what it stores on, so a retry after a failure writes only what is still
 *  missing. */
export function SeasonWizardDialog({
  open,
  season: editing,
  onClose,
  onSaved,
}: {
  open: boolean;
  // the season row to edit, or null for a new season
  season: Row | null;
  onClose: () => void;
  onSaved: () => Promise<unknown> | void;
}) {
  const seasonStore = useSeason();
  const eventStore = useEventStore();
  const teamStore = useTeamStore();
  const mapStore = useMapStore();
  const matchStore = useMatchStore();
  const playerStore = usePlayerStore();

  const [asked, setAsked] = useState(1);
  const [season, setSeason] = useState<Row>(blankSeason);
  const [stages, setStages] = useState<Row[]>([]);
  const [maxMmr, setMaxMmr] = useState<Record<number, string>>({});
  const [teamIds, setTeamIds] = useState<number[]>([]);
  const [mapIds, setMapIds] = useState<number[]>([]);
  const [roundMaps, setRoundMaps] = useState<Record<number, number | null>>({});
  const [rounds, setRounds] = useState<Row[]>([]);
  // The drawn matchups, or null while the admin draws none
  const [matchups, setMatchups] = useState<Week[] | null>(null);
  // A season that stores matches already gets no draw, so its schedule is never doubled
  const [hasMatchups, setHasMatchups] = useState(false);
  // How many of the drawn matchups the save wrote; a retry goes on from there
  const [matchupsSaved, setMatchupsSaved] = useState(0);
  // Each ticked team's captains and players, by team id
  const [captains, setCaptains] = useState<Record<number, number[]>>({});
  const [rosters, setRosters] = useState<Record<number, number[]>>({});
  // The season's signups, with every rostered player, so each chip has a name
  const [signups, setSignups] = useState<Row[]>([]);
  // Every player, read once the captains step first opens; null until then
  const [players, setPlayers] = useState<Row[] | null>(null);
  const playersAsked = useRef(false);
  const [allTeams, setAllTeams] = useState<Row[]>([]);
  const [allMaps, setAllMaps] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // What the season stores now; a create that failed half way stores a season, so this moves with every write
  const linked = useRef<Linked>(NOTHING_LINKED);
  const [seasonId, setSeasonId] = useState<number | null>(null);
  // The teams the season held as the wizard opened, to name the ones an untick takes out
  const [storedTeamIds, setStoredTeamIds] = useState<number[]>([]);
  // The steps as the wizard opened, to ask before a close drops them
  const opened = useRef("");
  // The season the dialog holds now, so a read that lands late is dropped
  const openFor = useRef<number | null | undefined>(undefined);

  // Key order as Linked spreads it, so the close check compares like with like
  const form = { season, maxMmr, teamIds, mapIds, roundMaps, captains, rosters, matchups };
  const snapshot = () => JSON.stringify(form);
  const steps: { key: string; title: string }[] = wizardSteps(season);
  const step = Math.min(asked, steps.length);
  const key = steps[step - 1]?.key;
  const problemAt = (index: number) => stepProblem(form, steps[index]?.key);
  // A step is open once every step before it is answered
  const reachable = (index: number) => steps.slice(0, index).every((_, at) => !problemAt(at));
  const allAnswered = steps.every((_, at) => !problemAt(at));
  const isEditing = seasonId != null;
  const roundCount = Math.max(Number(season.round_count) || 0, 0);
  const pool = mapIds.map((id) => allMaps.find((map) => map.id === id)).filter(Boolean) as Row[];
  const leaving = allTeams.filter((team) => storedTeamIds.includes(team.id) && !teamIds.includes(team.id));

  useEffect(() => {
    if (!open) {
      openFor.current = undefined;
      return;
    }
    const id: number | null = editing?.id ?? null;
    openFor.current = id;
    // the loaders set state, so they run just outside the effect body (react-hooks/set-state-in-effect)
    queueMicrotask(async () => {
      setAsked(1);
      setError(null);
      setSeasonId(id);
      setSeason(editing ? { ...editing } : blankSeason());
      setStages([]);
      setMaxMmr({});
      setTeamIds([]);
      setStoredTeamIds([]);
      setMapIds([]);
      setRoundMaps({});
      setRounds([]);
      setMatchups(null);
      setHasMatchups(false);
      setMatchupsSaved(0);
      setCaptains({});
      setRosters({});
      setSignups([]);
      linked.current = NOTHING_LINKED;
      setLoading(true);
      try {
        const [teams, maps] = await Promise.all([teamStore.getTeamsBasic(), mapStore.fetchMaps()]);
        if (openFor.current !== id) return;
        setAllTeams(teams || []);
        setAllMaps(maps || []);
        if (id != null) {
          // The list row carries no stage, no round and no team, so the season is read whole
          const [full, event, seasonTeams, matches, signedUp] = await Promise.all([
            seasonStore.fetchSeason(id),
            eventStore.fetchEvent(id),
            // the team read with the rosters and the captains of this season
            teamStore.fetchTeamsBySeason(id),
            matchStore.searchMatchesBySeason(id),
            seasonStore.fetchSeasonSignups(id),
          ]);
          if (openFor.current !== id) return;
          const crews = (seasonTeams || []).map((team: Row) => ({ id: team.id as number, ...rosterOf(team, id) }));
          const stored: Linked = {
            teamIds: crews.map((crew: Row) => crew.id),
            mapIds: (full.maps || []).map((map: Row) => map.id),
            roundMaps: Object.fromEntries((full.rounds || []).map((round: Row) => [round.playday, round.map_id ?? null])),
            captains: Object.fromEntries(crews.map((crew: Row) => [crew.id, crew.captains.map((user: Row) => user.id)])),
            rosters: Object.fromEntries(crews.map((crew: Row) => [crew.id, crew.members.map((user: Row) => user.id)])),
          };
          const rostered: Row[] = crews.flatMap((crew: Row) => crew.members);
          const signupList: Row[] = signedUp || [];
          setSignups([...signupList, ...rostered.filter((user) => !signupList.some((signup) => signup.id === user.id))]);
          setCaptains(stored.captains);
          setRosters(stored.rosters);
          linked.current = stored;
          setSeason({ ...editing, ...full });
          setStages(event?.id === id ? event.stages || [] : []);
          setRounds(full.rounds || []);
          setTeamIds(stored.teamIds);
          setStoredTeamIds(stored.teamIds);
          setMapIds(stored.mapIds);
          setRoundMaps(stored.roundMaps);
          setHasMatchups((matches || []).length > 0);
          opened.current = JSON.stringify({ season: { ...editing, ...full }, maxMmr: {}, ...stored, matchups: null });
        } else {
          opened.current = JSON.stringify({ season: blankSeason(), maxMmr: {}, ...NOTHING_LINKED, matchups: null });
        }
      } catch (err) {
        console.error("Failed to load the season wizard", err);
        if (openFor.current === id) setError("Failed to load: " + (err as Error).message);
      } finally {
        if (openFor.current === id) setLoading(false);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editing?.id]);

  // The player list is long, so it is read once the captains step first opens and kept after
  useEffect(() => {
    if (key !== "captains" || playersAsked.current) return;
    playersAsked.current = true;
    queueMicrotask(async () => {
      try {
        setPlayers((await playerStore.fetchPlayers()) || []);
      } catch (err) {
        console.error("Failed to load the players", err);
        playersAsked.current = false;
        setError("Failed to load the players: " + (err as Error).message);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const set = (part: Row) => setSeason((was) => ({ ...was, ...part }));

  const changeMaps = (ids: number[]) => {
    setMapIds(ids);
    setRoundMaps((was) => dropUnpooled(was, ids));
  };

  // Drawn matchups follow the ticked teams, until the save has written some of them. An unticked
  // team drops its captains and players, so its players are free for the other teams.
  const changeTeams = (ids: number[]) => {
    setTeamIds(ids);
    setCaptains((was) => forTeams(ids, was, linked.current.captains));
    setRosters((was) => forTeams(ids, was, linked.current.rosters));
    if (matchups && !matchupsSaved) setMatchups(drawMatchups(ids));
  };

  const addTeam = (team: Row) => {
    setAllTeams((was) => [...was, team].sort((a, b) => String(a.name).localeCompare(String(b.name))));
    changeTeams([...teamIds, team.id]);
  };

  // The map list is read again after a new map or an import, and the maps the step names are ticked
  const reloadMaps = async (pick: (maps: Row[]) => number[]) => {
    const maps: Row[] = (await mapStore.fetchMaps()) || [];
    setAllMaps(maps);
    const picked = pick(maps);
    setMapIds((was) => [...was, ...picked.filter((id) => !was.includes(id))]);
  };

  const close = () => {
    if (!saving && snapshot() !== opened.current && !window.confirm("Close the wizard? What you entered is not saved.")) return;
    onClose();
  };

  const save = async () => {
    setError(null);
    const problemIndex = steps.findIndex((_, at) => problemAt(at));
    if (problemIndex >= 0) {
      setAsked(problemIndex + 1);
      setError(problemAt(problemIndex));
      return;
    }
    setSaving(true);
    let phase = "saving the season";
    try {
      let id = seasonId;
      const values = blanksAsNull(season);
      if (id == null) {
        const created = await seasonStore.createSeason(values);
        id = created.id as number;
        // From here on a retry edits the season this write made
        setSeasonId(id);
        setSeason((was) => ({ ...was, ...created }));
      } else {
        await seasonStore.updateSeason({ ...values, id });
        // The stage write replaces every field of every stage, so it carries them back as read
        if (Object.keys(maxMmr).length) await eventStore.setStages(id, readStagesPayload(stages, maxMmr));
      }
      const now = linked.current;

      phase = "adding the teams";
      const teams = idDiff(now.teamIds, teamIds);
      if (teams.add.length) await seasonStore.addTeamsToSeason(id, teams.add);
      linked.current = { ...linked.current, teamIds: [...now.teamIds, ...teams.add] };

      // The crews of the ticked teams, once every ticked team is in the season
      for (const change of crewChanges(linked.current, { captains, rosters }, teamIds)) {
        const teamName = allTeams.find((team) => team.id === change.team_id)?.name ?? "a team";
        const at = <T,>(field: Record<number, T>, value: T) => ({ ...field, [change.team_id]: value });
        if (change.captains) {
          phase = `setting the captains of ${teamName}`;
          await teamStore.setCaptains(change.team_id, id, change.captains);
          linked.current = { ...linked.current, captains: at(linked.current.captains, change.captains) };
        }
        const was = linked.current.rosters[change.team_id] ?? [];
        if (change.add.length) {
          phase = `adding the players of ${teamName}`;
          await teamStore.addPlayersToTeamForSeason(change.team_id, id, change.add);
          linked.current = { ...linked.current, rosters: at(linked.current.rosters, [...was, ...change.add]) };
        }
        if (change.remove.length) {
          phase = `removing the players of ${teamName}`;
          await teamStore.removePlayersFromTeamForSeason(change.team_id, id, change.remove);
          linked.current = { ...linked.current, rosters: at(linked.current.rosters, rosters[change.team_id] ?? []) };
        }
      }

      phase = "removing the teams";
      if (teams.remove.length) await seasonStore.removeTeamsFromSeason(id, teams.remove);
      linked.current = { ...linked.current, teamIds: [...teamIds] };

      // One write a matchup, in round order, so a retry after a failure writes only the ones still missing
      const rows = matchups ? matchupRows(matchups) : [];
      for (let at = matchupsSaved; at < rows.length; at += 1) {
        phase = `creating matchup ${at + 1} of ${rows.length}`;
        await matchStore.createMatch({ ...rows[at], season_id: id });
        setMatchupsSaved(at + 1);
      }

      phase = "adding the maps";
      const maps = idDiff(now.mapIds, mapIds);
      if (maps.add.length) await seasonStore.addMapsToSeason(id, maps.add);
      linked.current = { ...linked.current, mapIds: [...now.mapIds, ...maps.add] };

      // A round map must be in the pool, so the rounds are written between the maps added and the maps removed
      if (steps.some((item) => item.key === "rounds")) {
        for (const round of changedRounds(roundCount, now.roundMaps, roundMaps)) {
          phase = `setting the map of round ${round.playday}`;
          await seasonStore.setSeasonRound(id, round);
          linked.current = { ...linked.current, roundMaps: { ...linked.current.roundMaps, [round.playday]: round.map_id } };
        }
      }

      phase = "removing the maps";
      if (maps.remove.length) await seasonStore.removeMapsFromSeason(id, maps.remove);
      linked.current = { ...linked.current, mapIds: [...mapIds] };

      await onSaved();
      onClose();
    } catch (err) {
      console.error(`Season wizard failed while ${phase}`, err);
      setError(`Failed while ${phase}: ${(err as Error).message}. What was saved stays saved; press the button again to finish.`);
    } finally {
      setSaving(false);
    }
  };

  const problem = key ? stepProblem(form, key) : null;
  const saveLabel = isEditing ? "Save changes" : "Create season";

  return (
    // a click outside or Escape asks before the steps are dropped
    <Dialog open={open} onOpenChange={(next) => (next ? undefined : close())}>
      <DialogContent
        showCloseButton={false}
        className="flex max-h-[90vh] max-w-[1100px] flex-col gap-0 overflow-hidden p-0 md:max-w-[1100px] md:h-[90vh] max-md:max-h-none"
      >
        <DialogTitle className="flex items-center gap-2 bg-primary px-4 py-3 text-on-primary">
          <Icon name={editing ? "mdi-pencil" : "mdi-plus-circle"} />
          <span className="min-w-0 flex-1 truncate">{editing ? `Edit season: ${editing.name}` : "New season"}</span>
          <Button variant="ghost" size="icon-sm" aria-label="Close" className="text-on-primary" onClick={close}>
            <Icon name="mdi-close" />
          </Button>
        </DialogTitle>

        {/* five step names do not fit a phone, so it reads the one it is on */}
        <div className="border-b px-4 py-3">
          <div className="mb-2 text-sm font-medium md:hidden">
            Step {step} of {steps.length} · {steps[step - 1]?.title}
          </div>
          <ol className="flex items-center gap-2">
            {steps.map((item, index) => (
              <li key={item.key} aria-current={index + 1 === step ? "step" : undefined} className="flex flex-1 items-center gap-2">
                <button
                  type="button"
                  disabled={!reachable(index) || saving}
                  onClick={() => setAsked(index + 1)}
                  className={cn("flex items-center gap-2 rounded-md text-left disabled:cursor-not-allowed", index + 1 !== step && "text-muted-foreground")}
                >
                  <span className={cn("tnum flex size-6 shrink-0 items-center justify-center rounded-full text-xs", index + 1 <= step ? "bg-primary text-on-primary" : "bg-muted")}>
                    {index + 1 < step ? <Icon name="mdi-check" /> : index + 1}
                  </span>
                  <span className="hidden text-sm md:inline">{item.title}</span>
                </button>
                {index < steps.length - 1 ? <span className="h-px flex-1 bg-border" /> : null}
              </li>
            ))}
          </ol>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          <StatusAlert modelValue={error} className="mb-4" onClose={() => setError(null)} />
          {loading ? (
            <div className="flex justify-center py-12">
              <Icon name="mdi-loading" size={48} className="animate-spin text-primary-text" />
            </div>
          ) : key === "general" ? (
            <GeneralStep season={season} set={set} stages={stages} maxMmr={maxMmr} setMaxMmr={setMaxMmr} />
          ) : key === "teams" ? (
            <TeamsStep teams={allTeams} selected={teamIds} onChange={changeTeams} onTeamCreated={addTeam} leaving={leaving} />
          ) : key === "captains" ? (
            <CaptainsStep
              teams={allTeams}
              teamIds={teamIds}
              captains={captains}
              rosters={rosters}
              players={players}
              signups={signups}
              draftHref={seasonId != null ? `/seasons/${seasonId}/assign` : null}
              onCaptains={(teamId, ids) => setCaptains((was) => ({ ...was, [teamId]: ids }))}
              onRoster={(teamId, ids) => setRosters((was) => ({ ...was, [teamId]: ids }))}
            />
          ) : key === "matchups" ? (
            <MatchupsStep
              teams={allTeams}
              teamIds={teamIds}
              roundCount={roundCount}
              startDate={season.start_date ?? null}
              rounds={rounds}
              weeks={matchups}
              hasMatchups={hasMatchups}
              saved={matchupsSaved}
              onDraw={() => setMatchups(drawMatchups(teamIds))}
              onClear={() => setMatchups(null)}
              onSetRounds={(count) => set({ round_count: count })}
            />
          ) : key === "maps" ? (
            <MapsStep maps={allMaps} selected={mapIds} onChange={changeMaps} onMapsChanged={reloadMaps} />
          ) : key === "rounds" ? (
            <RoundMapsStep
              roundCount={roundCount}
              startDate={season.start_date ?? null}
              rounds={rounds}
              pool={pool}
              roundMaps={roundMaps}
              onChange={(playday, mapId) => setRoundMaps((was) => ({ ...was, [playday]: mapId }))}
              onFill={() => setRoundMaps((was) => fillRoundMaps(roundCount, mapIds, Object.fromEntries(Object.entries(was).filter(([, id]) => id != null))))}
            />
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t px-4 py-3">
          {problem ? <span className="order-last w-full text-xs text-error md:order-none md:w-auto md:flex-1">{problem}</span> : <span className="hidden flex-1 md:block" />}
          <Button variant="ghost" className="mr-auto md:mr-0" onClick={close} disabled={saving}>
            Cancel
          </Button>
          <Button variant="outline" disabled={step === 1 || saving} onClick={() => setAsked(step - 1)}>
            <Icon name="mdi-arrow-left" />
            Back
          </Button>
          {step < steps.length ? (
            <Button variant={isEditing ? "outline" : "default"} disabled={!!problem || loading || saving} onClick={() => setAsked(step + 1)}>
              Next
              <Icon name="mdi-arrow-right" />
            </Button>
          ) : null}
          {/* an edit saves from any step; a new season saves once every step is answered */}
          {isEditing || step === steps.length ? (
            <Button disabled={!allAnswered || loading || saving} onClick={save}>
              <Icon name={saving ? "mdi-loading mdi-spin" : "mdi-check"} />
              {saveLabel}
            </Button>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default SeasonWizardDialog;
