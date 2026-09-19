"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/Combobox";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Icon } from "@/components/ui/Icon";
import { Pick } from "@/components/ui/Pick";
import { Progress } from "@/components/ui/progress";
import { TableCell } from "@/components/ui/table";
import { TapTooltip } from "@/components/ui/TapTooltip";
import { toneClass } from "@/components/ui/tone";
import { DivisionBracketing } from "@/components/DivisionBracketing";
import { GroupedTable, type GroupedColumn } from "@/components/GroupedTable";
import { PlayerName } from "@/components/PlayerName";
import { TeamName } from "@/components/TeamName";
import { RaceIcon } from "@/components/RaceIcon";
import { RaceSelect } from "@/components/RaceSelect";
import { RowActions, type RowAction } from "@/components/RowActions";
import { StatusAlert } from "@/components/StatusAlert";
import { W3CMmr } from "@/components/W3CMmr";
import { bandOf, domainOf, quantileCuts } from "@/helpers/divisions.mjs";
import { bandNames, bandsPayload, byPlayer, cutsOf, entrantMmr, entrantName, groupByDivision, idsOf, mergeSeeds, raceRows, seedPayload, teamRoster, warningLabel } from "@/helpers/entrants.mjs";
import { eventLabel, timeText, titleOf, FORMATS } from "@/helpers/event-labels.mjs";
import { raceWrapper } from "@/helpers/races.js";
import { w3cPlayerUrl } from "@/helpers/w3c-stats";
import { useAuth, useEventStore, usePlayerStore, useTeamStore } from "@/stores";
import { cn } from "@/lib/utils";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>;
type Group = { key: string | number; id: number | null; title: string; rows: Row[] };

// Five divisions is what the bronze scale has steps for, and more than that nobody runs
const DIVISION_COUNTS = [2, 3, 4, 5].map((value) => ({ value, title: String(value) }));
const RAMP = ["heat-1", "heat-2", "heat-3", "heat-4", "heat-5"];
// Tailwind builds no class from a name held in data, so the dot colours are written out
const DOT: Record<string, string> = { "heat-1": "text-heat-1", "heat-2": "text-heat-2", "heat-3": "text-heat-3", "heat-4": "text-heat-4", "heat-5": "text-heat-5", draw: "text-draw" };

const SEEDED: Record<string, string> = {
  mmr: "Seeded by MMR.",
  random: "The seeds are shuffled.",
  previous_stage: "Seeded from the standings of the previous stage.",
};

// The helpers are plain JS, so their defaults type the parameters; the seam names the real shapes.
const groupsOf = groupByDivision as unknown as (rows: Row[], divisions: Row[]) => Group[];
const byPlayer_ = byPlayer as unknown as (rows: Row[]) => Row[];
const cutsOf_ = cutsOf as unknown as (divisions: Row[]) => number[];
const bandNames_ = bandNames as unknown as (divisions: Row[]) => string[];
const label_ = eventLabel as (event: Row | null, league?: Row | null) => string;
const warning_ = warningLabel as (code: string, event: Row) => string;
const mergeSeeds_ = mergeSeeds as (entrants: Row[], seeded: Row[]) => Row[];

const phoneCell = "hidden min-[960px]:table-cell";
const solo = (item: Row) => !raceRows(item).length;
const raceName = (race: string) => raceWrapper.getRaceObject(race)?.name || race;
const mmrsOf = (rows: Row[]): number[] => rows.map((row) => entrantMmr(row) || 0);
const w3cName = (row: Row): string | null => (row.user?.w3c_synced_at ? row.user.battleTag : null);
// A team is rated from its roster, so no one player's sync time answers for it
const mmrText = (row: Row) => {
  if (row.mmr == null) return "The rating the seed was cut from";
  if (row.team) return "The mean of the ratings of its roster";
  return row.mmr_synced_at ? `Read from w3champions ${timeText(row.mmr_synced_at)}` : "Never read from w3champions";
};

/** Signed up, checked in or withdrawn, as the one chip a row wears. */
function StateChip({ row, signedUp = true }: { row: Row; signedUp?: boolean }) {
  if (row.withdrawn_at) return <Badge className={toneClass("draw")}><Icon name="mdi-close" />withdrawn</Badge>;
  if (row.checked_in_at) return <Badge className={toneClass("success")}><Icon name="mdi-check" />checked in</Badge>;
  return signedUp ? <Badge className={toneClass(null)}><Icon name="mdi-account-clock" />signed up</Badge> : null;
}

/** The pin of a row a hand placed, with the words a screen reader takes. */
function Pin({ row }: { row: Row }) {
  if (!row.manual_placement) return null;
  return (
    <>
      <Icon name="mdi-pin" size={16} className="ml-1" />
      <span className="sr-only">placed by hand</span>
    </>
  );
}

function Warnings({ row, event }: { row: Row; event: Row }) {
  return (row.warnings || []).map((code: string) => (
    <Badge key={code} className={cn(toneClass("warning"), "mr-1")}>
      <Icon name="mdi-alert" />
      {warning_(code, event)}
    </Badge>
  ));
}

/** Who is in one event: the list an admin runs the signups from, and the read a member
 *  gets without any of the controls. The MMR strip cuts the divisions, the table seeds
 *  them, and a phone reads the same rows as cards. */
export function EntrantsView({ id }: { id: string }) {
  const { isAdmin } = useAuth();
  const store = useEventStore();
  const playerStore = usePlayerStore();
  const teamStore = useTeamStore();
  const eventId = Number(id);

  const [event, setEvent] = useState<Row | null>(null);
  const [entrants, setEntrants] = useState<Row[]>([]);
  const [leagues, setLeagues] = useState<Row[]>([]);
  const [players, setPlayers] = useState<Row[]>([]);
  // The pick list of the Add dialog; `rosters` holds the teams rostered for this event
  const [teams, setTeams] = useState<Row[]>([]);
  const [rosters, setRosters] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [cuts, setCuts] = useState<number[]>([]);
  const [divisionCount, setDivisionCount] = useState(2);
  const [stageId, setStageId] = useState<number | null>(null);
  const [dragged, setDragged] = useState<number | null>(null);
  const [adding, setAdding] = useState(false);
  const [addPlayerId, setAddPlayerId] = useState<number | null>(null);
  const [addTeamId, setAddTeamId] = useState<number | null>(null);
  const [addRace, setAddRace] = useState<string | null>(null);
  const [banning, setBanning] = useState(false);
  const [banTarget, setBanTarget] = useState<Row | null>(null);

  const divisions: Row[] = event?.divisions || [];
  const eventName = label_(event, leagues.find((row) => row.id === event?.league_id));
  const live = entrants.filter((row) => !row.withdrawn_at);
  const rated = live.filter((row) => entrantMmr(row) > 0);
  const entered = byPlayer_(live).length;
  const groups = groupsOf(entrants, divisions);
  // The list prints a player once a division; the seed writes still read the rows of `groups`
  const playerGroups = groups.map((group) => ({ ...group, rows: byPlayer_(group.rows) }));
  const stages: Row[] = [...(event?.stages || [])].sort((a, b) => a.position - b.position).map((stage) => ({ ...stage, label: stage.name || titleOf(FORMATS, stage.format) }));
  const stage = stages.find((row) => row.id === stageId) || null;
  const seedsLocked = !!stage?.seeds_locked_at;
  // The standings of the stage before order these seeds, so the first stage is offered no button
  const hasPreviousStage = (stage?.position ?? 1) > 1;
  const canReorder = isAdmin && !seedsLocked;
  const takesTeams = event?.entrant_kind === "team";

  const columns: GroupedColumn[] = [
    { key: "player", title: "Entrant" },
    { key: "mmr", title: "MMR", align: "right" },
    { key: "battle_tag", title: "Battle tag", phone: false },
    { key: "discord", title: "Discord", phone: false },
    { key: "w3c", title: "W3C", phone: false },
    { key: "eligibility", title: "Eligibility" },
    { key: "seed", title: "Seed", align: "right" },
    { key: "status", title: "Status" },
    ...(isAdmin ? [{ key: "actions", title: "" }] : []),
  ];

  // The strip runs lowest MMR first, so the stored divisions read back in reverse
  const storedNames = bandNames_(divisions);
  const names = storedNames.length === divisionCount ? storedNames : Array.from({ length: divisionCount }, (unused, index) => `Division ${divisionCount - index}`);
  // One bronze step per band, light to dark: a division is a band of amounts, not a category
  const colors = Array.from({ length: divisionCount }, (unused, index) => RAMP[Math.round((index * (RAMP.length - 1)) / Math.max(1, divisionCount - 1))]);
  const domain: number[] = domainOf(mmrsOf(live));
  const storedCuts = cutsOf_(divisions);
  const stripPlayers = live.map((row) => ({
    id: row.id,
    who: row.user?.id ?? row.team?.id ?? row.id,
    label: entrantName(row),
    mmr: entrantMmr(row) || 0,
    band: entrantMmr(row) > 0 ? (bandOf(entrantMmr(row), cuts) as number) : null,
    pinned: row.manual_placement,
  }));

  const colorOf = (group: Group) => {
    const at = divisions.findIndex((division) => division.id === group.id);
    return DOT[at === -1 ? "draw" : colors[colors.length - 1 - at] || "draw"];
  };
  const rosterOfTeam = (teamId: number): Row[] => teamRoster(rosters.find((team) => team.id === teamId), eventId);
  const rosterFor = (row: Row) => rosterOfTeam(row.team?.id);
  const rosterText = (teamId: number) => {
    const size = rosterOfTeam(teamId).length;
    return size ? `${size} ${size === 1 ? "player" : "players"}` : "no roster for this event";
  };

  const evenSplit = (count = divisionCount) => setCuts(quantileCuts(mmrsOf(live), count));
  // A changed count keeps no cut of the count before it
  const pickCount = (count: number | null) => {
    if (!count) return;
    setDivisionCount(count);
    if (cuts.length !== count - 1) evenSplit(count);
  };

  const run = async (key: string, work: () => Promise<void>, message?: string) => {
    setBusy(key);
    setError(null);
    setSaved(null);
    try {
      await work();
      if (message) setSaved(message);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const readEntrants = async () => setEntrants(await store.fetchEntrants(eventId));
  const swap = (updated: Row) => setEntrants((rows) => rows.map((old) => (old.id === updated.id ? updated : old)));

  const saveDivisions = () =>
    run(
      "divisions",
      async () => {
        setEvent(await store.setDivisions(eventId, bandsPayload(cuts, names)));
        await readEntrants(); // the write clears every division a hand had placed
      },
      `${divisionCount} divisions saved. Assign the entrants to fill them.`,
    );

  const assign = () =>
    run(
      "assign",
      async () => {
        setEvent(await store.assignDivisions(eventId));
        await readEntrants();
      },
      "The entrants are cut into their divisions.",
    );

  const seedBy = (source: string) =>
    run(source, async () => setEntrants(mergeSeeds_(entrants, await store.setSeeds(eventId, stageId as number, { source }))), SEEDED[source]);

  const lock = () =>
    run(
      "lock",
      async () => {
        const locked = await store.lockSeeds(eventId, stageId as number);
        setEvent((was) => was && { ...was, stages: was.stages.map((row: Row) => (row.id === locked.id ? locked : row)) });
      },
      "The seeds of this stage are locked.",
    );

  // A player moved onto another place of the same division takes it, his races together,
  // and the whole order posts
  const reorder = (group: Group, from: number, to: number) => {
    const items = [...group.rows];
    if (from === -1 || to === -1 || from === to) return;
    items.splice(to, 0, ...items.splice(from, 1));
    const seeds = new Map<number, number>(items.flatMap(idsOf).map((entrantId: number, index: number) => [entrantId, index + 1]));
    const moved = entrants.map((row) => (seeds.has(row.id) ? { ...row, seed: seeds.get(row.id) } : row));
    setEntrants(moved);
    run("order", async () => setEntrants(mergeSeeds_(moved, await store.setSeeds(eventId, stageId as number, seedPayload(groupsOf(moved, divisions))))), "The seed order is saved.");
  };
  const drop = (group: Group, target: Row) => {
    const from = group.rows.findIndex((item) => item.id === dragged);
    setDragged(null);
    reorder(group, from, group.rows.findIndex((item) => item.id === target.id));
  };
  const step = (group: Group, row: Row, delta: number) => {
    const from = group.rows.findIndex((item) => item.id === row.id);
    const to = from + delta;
    if (to >= 0 && to < group.rows.length) reorder(group, from, to);
  };

  const openAdd = async () => {
    setAdding(true);
    setAddPlayerId(null);
    setAddTeamId(null);
    setAddRace(null);
    try {
      if (takesTeams) {
        if (!teams.length) setTeams(await teamStore.getTeamsBasic());
      } else if (!players.length) setPlayers(await playerStore.fetchPlayers());
    } catch (e) {
      setError((e as Error).message);
    }
  };
  // The signup opens on the race the player's profile names
  const pickPlayer = (playerId: number | null) => {
    setAddPlayerId(playerId);
    setAddRace((race) => players.find((row) => row.id === playerId)?.race ?? race);
  };

  const addEntrant = () =>
    run(
      "add",
      async () => {
        const body = takesTeams ? { team_id: addTeamId, race: addRace } : { user_id: addPlayerId, race: addRace };
        await store.addEntrant(eventId, body);
        setAdding(false);
        await readEntrants();
      },
      "The entrant is added.",
    );

  const askBan = (row: Row) => {
    setBanTarget(row);
    setBanning(true);
  };
  const ban = () =>
    run(
      "ban",
      async () => {
        await playerStore.banPlayer(banTarget!.user.id);
        setBanning(false);
        await readEntrants();
      },
      "The player is banned. Every entrant row of the event warns.",
    );

  const banAction = (row: Row): RowAction | false => row.user && { icon: "mdi-gavel", label: "Ban player", color: "error", onClick: () => askBan(row) };
  // A race row of a player offers no ban: his own row above carries the one ban
  const actionsFor = (row: Row, withBan = true): RowAction[] =>
    [
      !row.checked_in_at && !row.withdrawn_at && { icon: "mdi-check", label: "Check in", onClick: () => run("checkin", async () => swap(await store.checkIn(eventId, row.id))) },
      ...divisions
        .filter((division) => division.id !== row.division_id)
        .map((division) => ({
          icon: "mdi-arrow-right-bold-box-outline",
          label: `Move to ${division.name || `Division ${division.position}`}`,
          onClick: () => run("move", async () => swap(await store.placeEntrant(eventId, row.id, { division_id: division.id, manual_placement: true }))),
        })),
      {
        icon: row.manual_placement ? "mdi-pin-off" : "mdi-pin",
        label: row.manual_placement ? "Let the MMR place this entrant" : "Keep this entrant where it is",
        onClick: () => run("pin", async () => swap(await store.placeEntrant(eventId, row.id, { division_id: row.division_id, manual_placement: !row.manual_placement }))),
      },
      withBan && banAction(row),
      {
        icon: "mdi-close",
        label: "Remove",
        color: "error",
        onClick: () =>
          run("remove", async () => {
            await store.removeEntrant(eventId, row.id);
            setEntrants((rows) => rows.filter((old) => old.id !== row.id));
          }),
      },
    ].filter(Boolean) as RowAction[];

  useEffect(() => {
    (async () => {
      try {
        const [loaded, rows, leagueRows] = await Promise.all([store.fetchEvent(eventId), store.fetchEntrants(eventId), store.fetchLeagues()]);
        setEvent(loaded);
        setEntrants(rows);
        setLeagues(leagueRows);
        setStageId([...(loaded.stages || [])].sort((a: Row, b: Row) => a.position - b.position)[0]?.id ?? null);
        const count = loaded.divisions.length || 2;
        const stored = cutsOf_(loaded.divisions);
        setDivisionCount(count);
        setCuts(stored.length === count - 1 ? stored : quantileCuts(mmrsOf(rows.filter((row: Row) => !row.withdrawn_at)), count));
        if (loaded.entrant_kind === "team" || rows.some((row: Row) => row.team)) setRosters(await teamStore.fetchTeamsBySeason(eventId));
      } catch (e) {
        setError(`The entrants did not load: ${(e as Error).message}`);
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  const roster = (row: Row) => (
    // The roster sits under the team name, one line per screen width
    <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs">
      {rosterFor(row).map((seat) => (
        <PlayerName key={seat.player.id} player={seat.player} race={seat.race}>
          {seat.captain ? (
            <>
              <Icon name="mdi-star" size={14} className="text-primary-text" title="Captain" />
              <span className="sr-only">captain</span>
            </>
          ) : null}
        </PlayerName>
      ))}
      {!rosterFor(row).length ? <span className="text-muted-foreground">No roster for this event</span> : null}
    </div>
  );

  const mmrCell = (row: Row, mmr: number | null) =>
    mmr ? <TapTooltip content={mmrText(row)}>{mmr}</TapTooltip> : <span className="text-muted-foreground">—</span>;

  const seedCell = (row: Row) => (
    <>
      {row.seed ? <span>{row.seed}</span> : <span className="text-muted-foreground">—</span>}
      {seedsLocked && row.seed_source ? <div className="text-xs text-muted-foreground">{row.seed_source}</div> : null}
    </>
  );

  const busyIcon = (key: string, icon: string) => <Icon name={busy === key ? "mdi-loading mdi-spin" : icon} />;

  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <h1>Entrants</h1>
        <Badge className={toneClass(null)}>
          <Icon name="mdi-account-multiple" />
          {entered} entered
        </Badge>
        {seedsLocked ? (
          <Badge className={toneClass("secondary")}>
            <Icon name="mdi-lock" />
            seeds locked
          </Badge>
        ) : null}
        <span className="flex-1" />
        {isAdmin ? (
          <Button disabled={loading} onClick={openAdd}>
            <Icon name="mdi-account-plus" />
            Add entrant
          </Button>
        ) : null}
      </div>
      {event ? (
        <Link className="text-muted-foreground" href={`/events/${eventId}`}>
          {eventName}
        </Link>
      ) : null}

      <StatusAlert modelValue={error} onClose={() => setError(null)} className="mt-4" />
      <StatusAlert modelValue={saved} type="success" onClose={() => setSaved(null)} className="mt-4" />
      {loading ? <Progress value={null} className="mt-4" /> : null}

      {event ? (
        <>
          {isAdmin ? (
            <div className="card mt-4 rounded-lg p-4 shadow-sm">
              <div className="mb-2 flex flex-wrap items-end gap-2">
                <span className="self-center text-muted-foreground">
                  Cut the entrants into divisions by <W3CMmr />
                </span>
                <span className="flex-1" />
                <Pick labelAfter className="w-[130px]" label="Divisions" items={DIVISION_COUNTS} value={divisionCount} onChange={pickCount} />
                <Button variant="outline" disabled={!rated.length} onClick={() => evenSplit()}>
                  <Icon name="mdi-scale-balance" />
                  Even split
                </Button>
                <Button variant="outline" disabled={busy === "divisions"} onClick={saveDivisions}>
                  {busyIcon("divisions", "mdi-content-save")}
                  Save divisions
                </Button>
                <Button disabled={busy === "assign" || !divisions.length} onClick={assign}>
                  {busyIcon("assign", "mdi-arrow-split-vertical")}
                  Assign from MMR
                </Button>
              </div>
              <DivisionBracketing cuts={cuts} onUpdateCuts={setCuts} players={stripPlayers} names={names} colors={colors} domain={domain} stored={storedCuts} />
            </div>
          ) : null}

          {isAdmin ? (
            <div className="mt-4 flex flex-wrap items-end gap-2">
              {stages.length > 1 ? (
                <Pick labelAfter className="w-[240px]" label="Stage" items={stages.map((row) => ({ value: row.id as number, title: row.label as string }))} value={stageId} onChange={setStageId} />
              ) : null}
              {seedsLocked ? <span className="self-center text-muted-foreground">The seeds of this stage are locked.</span> : null}
              <span className="flex-1" />
              <Button variant="outline" disabled={busy === "mmr" || seedsLocked || !stageId} onClick={() => seedBy("mmr")}>
                {busyIcon("mmr", "mdi-sort-numeric-ascending")}
                Seed by MMR
              </Button>
              <Button variant="outline" disabled={busy === "random" || seedsLocked || !stageId} onClick={() => seedBy("random")}>
                {busyIcon("random", "mdi-shuffle-variant")}
                Shuffle
              </Button>
              {hasPreviousStage ? (
                <Button variant="outline" disabled={busy === "previous_stage" || seedsLocked || !stageId} onClick={() => seedBy("previous_stage")}>
                  {busyIcon("previous_stage", "mdi-arrow-right-bold-outline")}
                  Seed from the previous stage
                </Button>
              ) : null}
              <Button variant="outline" disabled={busy === "lock" || seedsLocked || !stageId} onClick={lock}>
                {busyIcon("lock", "mdi-lock")}
                Lock seeds
              </Button>
            </div>
          ) : null}

          {/* The table carries the identities and the seed handles; a phone reads the cards below */}
          <div className="card mt-4 hidden rounded-lg shadow-sm min-[960px]:block">
            <GroupedTable
              columns={columns}
              groups={playerGroups}
              defaultOpen
              empty="Nobody has entered yet."
              head={{ mmr: <W3CMmr /> }}
              group={({ group }) => (
                <TableCell colSpan={columns.length}>
                  <Icon name="mdi-circle" size={12} className={cn("mr-2", colorOf(group))} />
                  <span className="mr-2 font-bold">{group.title}</span>
                  <span className="text-muted-foreground">
                    {group.rows.length} {group.rows.length === 1 ? "entrant" : "entrants"}
                  </span>
                </TableCell>
              )}
              rows={({ group }) =>
                group.rows.flatMap((row) => [
                  <tr
                    key={row.id}
                    // A withdrawn entrant keeps its row and reads back one step
                    className={cn("detail-row border-b", row.withdrawn_at && "opacity-(--v-medium-emphasis-opacity)", dragged === row.id && "opacity-40")}
                    draggable={canReorder}
                    onDragStart={() => setDragged(row.id)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      drop(group, row);
                    }}
                    onDragEnd={() => setDragged(null)}
                  >
                    <TableCell className="whitespace-nowrap">
                      {canReorder ? (
                        <>
                          <Icon name="mdi-drag-horizontal-variant" size={18} className="cursor-grab" />
                          {/* the keyboard route of the drag: one step up or down inside the division */}
                          <Button variant="ghost" size="icon-xs" disabled={busy === "order" || group.rows[0] === row} aria-label={`Move ${entrantName(row)} up`} onClick={() => step(group, row, -1)}>
                            <Icon name="mdi-chevron-up" />
                          </Button>
                          <Button variant="ghost" size="icon-xs" disabled={busy === "order" || group.rows.at(-1) === row} aria-label={`Move ${entrantName(row)} down`} onClick={() => step(group, row, 1)}>
                            <Icon name="mdi-chevron-down" />
                          </Button>
                        </>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      {row.user ? (
                        <PlayerName player={row.user} race={solo(row) ? row.race : undefined} mmr={false} />
                      ) : row.team ? (
                        <>
                          <TeamName team={row.team} className="font-medium" />
                          {roster(row)}
                        </>
                      ) : null}
                    </TableCell>
                    <TableCell className="tnum text-right">{solo(row) ? mmrCell(row, entrantMmr(row)) : null}</TableCell>
                    {/* A team has no identity of its own; the three columns belong to a player */}
                    <TableCell className={cn(phoneCell, !row.user?.battleTag && "text-muted-foreground")}>{row.user ? row.user.battleTag || "Not linked" : "—"}</TableCell>
                    <TableCell className={cn(phoneCell, !row.user?.discordTag && "text-muted-foreground")}>{row.user ? row.user.discordTag || "Not linked" : "—"}</TableCell>
                    {/* The W3C name is the battle tag, so this column answers whether w3champions
                        knows it rather than printing the same string twice */}
                    <TableCell className={phoneCell}>
                      {w3cName(row) ? (
                        <TapTooltip content={w3cName(row)}>
                          <a href={w3cPlayerUrl(w3cName(row))} target="_blank" rel="noopener noreferrer">
                            Linked
                          </a>
                        </TapTooltip>
                      ) : (
                        <span className="text-muted-foreground">{row.user ? "Not linked" : "—"}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Warnings row={row} event={event} />
                    </TableCell>
                    <TableCell className="tnum text-right">{solo(row) ? seedCell(row) : null}</TableCell>
                    <TableCell className="whitespace-nowrap">
                      {solo(row) ? (
                        <>
                          <StateChip row={row} />
                          <Pin row={row} />
                        </>
                      ) : null}
                    </TableCell>
                    {isAdmin ? (
                      <TableCell>
                        <RowActions actions={solo(row) ? actionsFor(row) : ([banAction(row)].filter(Boolean) as RowAction[])} />
                      </TableCell>
                    ) : null}
                  </tr>,
                  // A player on more than one race: one row a race, each with its own seed and state
                  ...raceRows(row).map((race: Row) => (
                    <tr key={race.id} className={cn("detail-row border-b", race.withdrawn_at && "opacity-(--v-medium-emphasis-opacity)")}>
                      <TableCell />
                      <TableCell className="pl-8">
                        <RaceIcon raceIdentifier={race.race} />
                        <span className="ml-2">{raceName(race.race)}</span>
                      </TableCell>
                      <TableCell className="tnum text-right">{mmrCell(race, race.mmr)}</TableCell>
                      <TableCell colSpan={3} className={phoneCell} />
                      <TableCell />
                      <TableCell className="tnum text-right">{seedCell(race)}</TableCell>
                      <TableCell className="whitespace-nowrap">
                        <StateChip row={race} />
                        <Pin row={race} />
                      </TableCell>
                      {isAdmin ? (
                        <TableCell>
                          <RowActions actions={actionsFor(race, false)} />
                        </TableCell>
                      ) : null}
                    </tr>
                  )),
                ])
              }
            />
          </div>

          {/* A phone reads one card per entrant: who, the race, the MMR and what to look at */}
          <div className="mt-4 min-[960px]:hidden">
            {playerGroups.map((group) => (
              <div key={group.key} className="mb-4">
                <div className="mb-2 flex items-center gap-2">
                  <Icon name="mdi-circle" size={12} className={colorOf(group)} />
                  <span className="font-bold">{group.title}</span>
                  <span className="text-muted-foreground">{group.rows.length}</span>
                </div>
                {group.rows.map((row) => (
                  <div key={row.id} className={cn("mb-2 rounded-lg border p-3", row.withdrawn_at && "opacity-(--v-medium-emphasis-opacity)")}>
                    <div className="flex items-center gap-2">
                      {solo(row) && row.seed ? <span className="tnum text-muted-foreground">{row.seed}</span> : null}
                      {row.user ? <PlayerName player={row.user} race={solo(row) ? row.race : undefined} mmr={false} /> : row.team ? <TeamName team={row.team} className="font-medium" /> : null}
                      <span className="flex-1" />
                      {solo(row) ? <span className="tnum">{entrantMmr(row) || "—"}</span> : null}
                    </div>
                    {raceRows(row).map((race: Row) => (
                      <div key={race.id} className={cn("mt-1 flex items-center gap-2 pl-4", race.withdrawn_at && "opacity-(--v-medium-emphasis-opacity)")}>
                        {race.seed ? <span className="tnum text-muted-foreground">{race.seed}</span> : null}
                        <RaceIcon raceIdentifier={race.race} />
                        <span>{raceName(race.race)}</span>
                        <StateChip row={race} signedUp={false} />
                        <span className="flex-1" />
                        <span className="tnum">{race.mmr || "—"}</span>
                      </div>
                    ))}
                    {row.team ? <div className="mt-1">{roster(row)}</div> : null}
                    <div className="mt-2 flex flex-wrap gap-1">
                      {solo(row) ? <StateChip row={row} signedUp={false} /> : null}
                      <Warnings row={row} event={event} />
                    </div>
                  </div>
                ))}
                {!group.rows.length ? <p className="text-muted-foreground">Nobody is in this division.</p> : null}
              </div>
            ))}
            {!groups.length ? <p className="text-muted-foreground">Nobody has entered yet.</p> : null}
          </div>
        </>
      ) : null}

      <Dialog open={adding} onOpenChange={setAdding}>
        <DialogContent showCloseButton={false} className="gap-0 p-0 md:max-w-[600px]">
          <DialogTitle className="flex items-center gap-2 bg-primary px-4 py-3 text-on-primary">
            <Icon name="mdi-account-plus" />
            Add entrant
          </DialogTitle>
          <div className="flex flex-col gap-3 p-4">
            {takesTeams ? (
              <Combobox
                label="Team"
                items={teams.map((team) => ({ value: String(team.id), title: team.name as string }))}
                value={addTeamId == null ? null : String(addTeamId)}
                onChange={(value) => setAddTeamId(value == null ? null : Number(value))}
                row={(item) => (
                  <span className="flex flex-col">
                    {item.title}
                    <span className="text-xs text-muted-foreground">{rosterText(Number(item.value))}</span>
                  </span>
                )}
              />
            ) : (
              <Combobox
                label="Player"
                items={players.map((player) => ({ value: String(player.id), title: player.name as string, player }))}
                value={addPlayerId == null ? null : String(addPlayerId)}
                onChange={(value) => pickPlayer(value == null ? null : Number(value))}
                row={(item) => <PlayerName player={item.player} plain />}
              />
            )}
            <RaceSelect value={addRace} onChange={setAddRace} />
          </div>
          <div className="flex justify-end gap-2 p-4 pt-0">
            <Button variant="ghost" onClick={() => setAdding(false)}>
              Cancel
            </Button>
            <Button disabled={busy === "add" || !addRace || !(takesTeams ? addTeamId : addPlayerId)} onClick={addEntrant}>
              {busyIcon("add", "mdi-plus")}
              Add entrant
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={banning} onOpenChange={setBanning}>
        <DialogContent showCloseButton={false} className="gap-0 p-0 md:max-w-[420px]">
          <DialogTitle className="flex items-center gap-2 bg-error px-4 py-3 text-on-error">
            <Icon name="mdi-gavel" />
            Ban this player
          </DialogTitle>
          <div className="p-4">{banTarget?.user?.name} keeps this entry, and every entrant row of every event warns that the player is banned.</div>
          <div className="flex justify-end gap-2 p-4 pt-0">
            <Button variant="ghost" onClick={() => setBanning(false)}>
              Cancel
            </Button>
            <Button variant="destructive" disabled={busy === "ban"} onClick={ban}>
              {busyIcon("ban", "mdi-gavel")}
              Ban player
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default EntrantsView;
