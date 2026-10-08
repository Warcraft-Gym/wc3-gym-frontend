"use client";
import { useImperativeHandle, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Field } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import { Input } from "@/components/ui/input";
import { Note } from "@/components/ui/Note";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { RaceIcon } from "@/components/RaceIcon";
import { RaceSelect } from "@/components/RaceSelect";
import { StatusAlert } from "@/components/StatusAlert";
import { VetoBoard } from "@/components/VetoBoard";
import { authHeader, backendUrl, fetchWrapper } from "@/helpers";
import { gamesOf, winsFor, isValidResult, moveMessage, moveTargets, replaysNeeded } from "@/helpers/best-of.mjs";
import { mapsByGame, picksOf, scoreOf, gameSlots, gamesReported, vetoOffers } from "@/helpers/map-order.mjs";
import { mapMismatch, mapMismatches, reportWarning, swapMapFields } from "@/helpers/replay-maps.mjs";
import { uploadReplay } from "@/helpers/replay-upload";
import { readReplay, matchMap, isOtherSeries } from "@/helpers/w3g.mjs";
import { holdsResult } from "@/helpers/series-actions.mjs";
import { sideName } from "@/helpers/stage-view.mjs";
import { cn } from "@/lib/utils";
import { useAuth, useMapStore, useMatchStore, useSeriesStore } from "@/stores";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>;

// The chosen side wears the primary wash, as a tonal chip does
export const SIDE_BUTTON = "h-auto min-h-8 flex-1 whitespace-normal py-1 aria-pressed:bg-primary/12 aria-pressed:text-primary-text";
type Form = {
  id?: number;
  player1_name?: string;
  player2_name?: string;
  solo?: boolean;
  tags: (string | undefined)[];
  map_rules?: string;
  races: { player1?: string | null; player2?: string | null };
  raceOpen?: boolean;
  reported?: number;
  scored?: boolean; // the series holds a result, a 0-0 too, which the reporter may clear
  listsReplays?: boolean;
  replays: Record<number, File | null>;
  winners: (string | null)[];
  maps: Record<number, number | null>;
  reads: Record<number, { mapPath: string | null; tags: string[] }>;
  storedGames?: string;
};

export type ReportResultDialogHandle = { open: (item: Row) => void };

const EMPTY: Form = { replays: {}, races: {}, winners: [], maps: {}, reads: {}, tags: [] };
const isW3g = (file?: File | null) => !file || file.name.toLowerCase().endsWith(".w3g");

// A file input that mounts again shows the file the form still holds for its game
const showHeld = (file?: File | null) => (input: HTMLInputElement | null) => {
  if (!input || !file || input.files?.length) return;
  const held = new DataTransfer();
  held.items.add(file);
  input.files = held.files;
};

// The map the season's rules offer for each game, given the veto and who won the games before
const offeredMaps = (form: Form, veto: Row | null): (number | null)[] =>
  mapsByGame(form.map_rules, veto?.week_map_id, picksOf(veto?.steps), form.winners || [], vetoOffers(form.map_rules, veto));
const mapOfIn = (form: Form, veto: Row | null, game: number) => form.maps?.[game] ?? offeredMaps(form, veto)[game - 1] ?? null;
// Names the games saved without a replay, or null
const missingLine = (games: number[]) =>
  games.length ? `No replay for game${games.length > 1 ? `s ${games.slice(0, -1).join(", ")} and` : ""} ${games[games.length - 1]}.` : null;

/** The player reports one series: the map veto, the winner and map of each game, and
 *  the replay file per game. A roster member reports for a team side, which names no
 *  race of its own. The veto warns when it is not complete, and a game played without its
 *  replay warns too; neither blocks. The caller
 *  opens it through its ref and hands in the series row. */
export function ReportResultDialog({ onSaved, onMoved, ref }: { onSaved?: (message: string) => void; onMoved?: (replays: Row[]) => void; ref?: React.Ref<ReportResultDialogHandle> }) {
  const mapStore = useMapStore();
  const matchStore = useMatchStore();
  const seriesStore = useSeriesStore();
  // a player's or a captain's change to a reported result is posted in Discord; an admin's is not
  const { isAdmin } = useAuth();

  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);
  // the report asks once before it saves when the replays and the veto disagree
  const [confirmOpen, setConfirmOpen] = useState(false);
  // clearing the result asks once too, because the games reported go with it
  const [clearOpen, setClearOpen] = useState(false);
  const [moving, setMoving] = useState<number | null>(null); // the game whose stored replay is on the move
  const [moved, setMoved] = useState<string | null>(null);
  // the veto sits under a disclosure row, folded away until the reporter opens it
  const [vetoOpen, setVetoOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [maps, setMaps] = useState<Row[]>([]);
  const [series, setSeries] = useState<Form>(EMPTY);
  // a read that answers late checks the series the dialog holds by then
  const openId = useRef<number | undefined>(undefined);
  // a result carries its veto, so the dialog holds the board above the scores
  const [scoreVeto, drawScoreVeto] = useState<Row | null>(null);
  const vetoRef = useRef<Row | null>(null);
  const setScoreVeto = (board: Row | null) => {
    vetoRef.current = board;
    drawScoreVeto(board);
  };
  // What a side is called: the team or the player of the series, else the name the veto
  // board answers, because GET /series/{id} names no team behind a team entrant yet
  const name = (side: 1 | 2) => series[`player${side}_name`] || scoreVeto?.[`player${side}`]?.name || `Side ${side}`;
  // A series whose rules play no veto answers an empty order, and shows neither the row nor the warning
  const hasVeto = (scoreVeto?.order?.length ?? 0) > 0;
  const vetoMissing = hasVeto && !scoreVeto?.complete;

  const mapOf = (game: number) => mapOfIn(series, scoreVeto, game);

  // A series reported before opens on the games it recorded, so a fix starts from them
  const loadGames = async (id: number) => {
    let games: Row[] = [];
    try {
      games = await fetchWrapper.get(`${backendUrl}/series/${id}/games`);
    } catch {
      return; // a series with no games recorded answers nothing to start from
    }
    if (openId.current !== id) return; // the dialog moved on while the read was out
    setSeries((form) => {
      const next = { ...form, winners: [...form.winners], maps: { ...form.maps } };
      for (const game of games) {
        next.winners[game.game_no - 1] = game.winner_side;
        if (game.map_id) next.maps[game.game_no] = game.map_id;
      }
      next.storedGames = JSON.stringify(gamesReported(next.winners, (game: number) => mapOfIn(next, vetoRef.current, game)));
      return next;
    });
  };

  useImperativeHandle(ref, () => ({
    open: (item: Row) => {
      setErrorMessage(null);
      setMoved(null);
      setConfirmOpen(false);
      setClearOpen(false);
      openId.current = item.id;
      setSeries({
        id: item.id,
        player1_name: sideName(item, 1),
        player2_name: sideName(item, 2),
        // a team side plays no one race, so only a solo series offers the off-race panel
        solo: !!(item.player1_id || item.player2_id),
        // the tags name the sides in a replay, which carries no player id of ours
        tags: [item.player1?.battleTag, item.player2?.battleTag],
        // the rules of this series, which the backend resolves with or without a fixture
        map_rules: item.rules?.map_rules,
        // the race each side played; the panel opens by itself when one is an exception
        races: { player1: item.player1_race, player2: item.player2_race },
        raceOpen: !!(item.player1_off_race || item.player2_off_race),
        // games already reported: their stored replays stay unless a new file is picked
        reported: item.player1_score != null && item.player2_score != null ? item.player1_score + item.player2_score : 0,
        scored: holdsResult(item),
        // ponytail: only a fixture's page lists its replays, so a series without one takes no file until a page shows it
        listsReplays: item.match_id !== null,
        replays: {},
        // the side that won each game, in play order, and the map named for a game
        winners: [],
        maps: {},
        // what each game's replay says, by game number
        reads: {},
        storedGames: "[]",
      });
      setScoreVeto(null);
      setVetoOpen(false);
      setShow(true);
      if (!maps.length) mapStore.fetchMaps().then((rows: Row[]) => setMaps(rows || [])).catch(() => {}); // names the maps each game offers
      loadGames(item.id);
    },
  }));

  const close = () => {
    setShow(false);
    openId.current = undefined;
    setSeries(EMPTY);
  };

  // A picked replay says which map was played. It never blocks a report: the file is the
  // evidence, but a player who names something else may be right and the parse may be wrong.
  const readGameReplay = async (game: number, file: File | null) => {
    setSeries((form) => {
      const reads = { ...form.reads };
      delete reads[game];
      return { ...form, reads, replays: { ...form.replays, [game]: file } };
    });
    if (!file) return;
    const id = series.id;
    const read = await readReplay(file).catch(() => null);
    if (!read || openId.current !== id) return; // the dialog moved on, or not a replay
    // the replay beats the season's rule, but never a map the reporter named himself
    const map = matchMap(read.mapPath, maps);
    setSeries((form) => ({
      ...form,
      reads: { ...form.reads, [game]: read },
      maps: map && !form.maps[game] ? { ...form.maps, [game]: map.id } : form.maps,
    }));
  };

  // Says where the map came from when the replay named it, so a changed field is not a surprise
  const mapHint = (game: number) => {
    const read = series.reads?.[game];
    const played = read && matchMap(read.mapPath, maps);
    return played && played.id === series.maps[game] ? "Read from the replay" : undefined;
  };

  // The score the tapped winners add up to, the season's maps to win, and the file picked for a game
  const reportedScore: number[] = scoreOf(series.winners || []);
  const seriesGames = gamesOf(series.map_rules);
  const seriesWins = winsFor(seriesGames);
  // What the folded row says the veto stands at
  const vetoSteps = (scoreVeto?.steps || []).length;
  const vetoLine = scoreVeto?.complete
    ? "Map veto complete"
    : vetoSteps
      ? `Map veto: ${vetoSteps} of ${scoreVeto?.order?.length} steps done`
      : "No veto recorded";
  const hasReplay = (game: number) => series.replays?.[game] instanceof File;
  // A first report wants every game's file; a fix keeps the stored ones unless a new file is picked
  const needsFile = (game: number) => game > (series.reported || 0);

  // One row per game played, plus the next while neither side has won the series
  const gameRows = Array.from({ length: gameSlots(seriesGames, series.winners || []) }, (_, index) => index + 1);

  const setMap = (game: number, mapId: number | null) => setSeries((form) => ({ ...form, maps: { ...form.maps, [game]: mapId } }));

  // A changed winner reopens the games after it: they were played under a different map order
  const setWinner = (game: number, side: string | null) =>
    setSeries((form) => {
      if (form.winners[game - 1] === side) return form;
      const winners = form.winners.slice(0, game);
      winners[game - 1] = side || null;
      const kept = Object.fromEntries(Object.entries(form.maps).filter(([named]) => Number(named) <= game));
      return { ...form, winners, maps: kept };
    });

  const [p1, p2] = reportedScore;
  // The games played that carry no replay: the report still saves, but warns and asks once
  const replaysMissing = Array.from({ length: series.listsReplays ? replaysNeeded(p1, p2) : 0 }, (_, index) => index + 1).filter((game) => needsFile(game) && !hasReplay(game));
  const fileHint = (game: number) => (!needsFile(game) ? "Leave empty to keep the stored replay" : replaysMissing.includes(game) ? "Every game needs its replay" : undefined);
  const scoreProblem = isValidResult(p1, p2, seriesWins) ? null : "Tap the winner of each game played";
  // The columns of a game row on a wide dialog: the game, the winner, the map and, where the page lists replays, the file
  const gameCols = series.listsReplays
    ? "@4xl/dialog:grid-cols-[9rem_minmax(0,1fr)_minmax(0,14rem)_minmax(0,14rem)]"
    : "@4xl/dialog:grid-cols-[9rem_minmax(0,1fr)_minmax(0,16rem)]";

  // The map each game should play: the veto's, else the one the reporter named himself
  const offered = offeredMaps(series, scoreVeto);
  const wantedMaps = gameRows.map((game) => offered[game - 1] ?? series.maps?.[game] ?? null);
  const replayMaps = gameRows.map((game) => matchMap(series.reads?.[game]?.mapPath, maps)?.id ?? null);
  // Why the report asks once before it saves, one line per check: only a series that plays a veto and records no step asks about the veto
  const confirmReasons = [missingLine(replaysMissing), reportWarning(hasVeto && !vetoSteps, mapMismatches(replayMaps, wantedMaps))].filter(Boolean) as string[];
  // The group title names the map the game should play: the veto's, else the one named for the game
  const titleMapOf = (game: number) => maps.find((map) => map.id === (offered[game - 1] ?? mapOf(game)))?.name;

  // What the replay disagrees with, or null: another series, or the map of another game
  const replayNote = (game: number) => {
    const read = series.reads?.[game];
    if (!read) return null;
    if (isOtherSeries(read.tags, series.tags)) {
      return `This replay is ${read.tags.join(" against ")}. It is not this series.`;
    }
    const played = matchMap(read.mapPath, maps);
    if (!played) return null;
    const off = mapMismatch(game, replayMaps, wantedMaps);
    if (off) {
      const wanted = maps.find((map) => map.id === wantedMaps[game - 1])?.name;
      // the map field already holds the replay's map, so the other way out asks for no step
      const other = mapOf(game) === played.id ? `keep game ${game} on ${played.name}` : `set game ${game} to ${played.name}`;
      // the move is offered only over the games the series played, so the advice names a game the menu holds
      const fix = off.to && moveTargets(movesOver, game).includes(off.to) ? `Move it to game ${off.to}, or ${other}.` : `${other[0].toUpperCase()}${other.slice(1)}.`;
      return `The replay was played on ${played.name}${wanted ? `, but the veto gives game ${game} ${wanted}` : ""}. ${fix}`;
    }
    // the veto agrees with the file, the map named for the game does not
    if (mapOf(game) != null && mapOf(game) !== played.id) return `The replay was played on ${played.name}. Change the map of game ${game}.`;
    return null;
  };

  // A replay moves inside the games the series played: the ones reported, and the ones tapped now
  const movesOver = Math.max(replaysNeeded(p1, p2), series.reported || 0);
  const canMove = (game: number) => !!series.listsReplays && movesOver > 1 && (hasReplay(game) || !needsFile(game));

  // Move one game's replay to another: a picked file swaps inside the form, a stored one moves through the API
  const moveReplay = async (from: number, to: number) => {
    setMoved(null);
    setErrorMessage(null);
    if (hasReplay(from)) {
      const swapped = hasReplay(to);
      setSeries((form) => {
        const reads = { ...form.reads };
        const [fromRead, toRead] = [form.reads[from], form.reads[to]];
        if (toRead) reads[from] = toRead;
        else delete reads[from];
        if (fromRead) reads[to] = fromRead;
        else delete reads[to];
        // a map field the replay itself wrote travels with the file, so the two stay together
        const fields = swapMapFields(form.maps, from, to, (game: number) => matchMap(form.reads?.[game]?.mapPath, maps)?.id ?? null);
        return { ...form, reads, maps: fields, replays: { ...form.replays, [from]: form.replays[to] ?? null, [to]: form.replays[from] ?? null } };
      });
      setMoved(moveMessage(from, to, swapped));
      return;
    }
    setMoving(from);
    try {
      const rows: Row[] = await matchStore.moveSeriesReplay(series.id!, from, to);
      const message = moveMessage(from, to, (rows || []).some((row: Row) => row.game_no === from));
      setMoved(message);
      // the move answers every replay of the series, so a surface that lists them takes the answer and reads nothing
      onMoved?.(rows || []);
    } catch (error) {
      setErrorMessage((error as Error).message);
    } finally {
      setMoving(null);
    }
  };

  // Allowed score combinations and every picked file a .w3g; a missing file warns instead
  const isValid = isValidResult(p1, p2, seriesWins) && !gameRows.some((game) => !isW3g(series.replays[game]));

  const save = async () => {
    setSaving(true);
    setErrorMessage(null);
    try {
      const games = gamesReported(series.winners, mapOf);

      const played = replaysNeeded(p1, p2);
      const id = series.id!;
      const fix = played === series.reported && JSON.stringify(games) === series.storedGames;
      const uploaded: number[] = [];
      for (let game = 1; game <= played; game++) {
        if (!hasReplay(game)) continue;
        try {
          await uploadReplay(id, game, series.replays[game] as File);
          uploaded.push(game);
        } catch (error) {
          // a failed upload never holds a result back: the report lists the game as missing
          if (fix) throw error;
        }
      }

      let missing: number[] = [];
      if (fix && uploaded.length) {
        // the result stands; each new file replaces one stored replay
        for (const game of uploaded) await fetchWrapper.put(`${backendUrl}/player-series/${id}/replays/${game}`);
      } else {
        // the report confirms every game's file in the bucket before it writes the score
        const formData = new FormData();
        formData.append("player1_score", String(p1));
        formData.append("player2_score", String(p2));
        formData.append("action", "score_updated");
        // one entry per game played, which the backend checks against the score
        formData.append("games", JSON.stringify(games));
        if (series.raceOpen) {
          // the backend stores nothing when the race is the one he signed up on
          formData.append("player1_off_race", series.races.player1 || "");
          formData.append("player2_off_race", series.races.player2 || "");
        }
        const url = `${backendUrl}/player-series/${id}`;
        const response = await fetch(url, { method: "PUT", headers: await authHeader("PUT", url), body: formData });
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Update failed");
        }
        missing = series.listsReplays ? (await response.json()).replays_missing || [] : [];
      }

      close();
      onSaved?.(missing.length ? `Result reported. ${missingLine(missing)} Add ${missing.length > 1 ? "them" : "it"} with Edit result.` : "Result reported successfully!");
    } catch (error) {
      setErrorMessage((error as Error).message || "Error reporting result.");
    } finally {
      setSaving(false);
    }
  };

  // The result goes back to none: the score, the races played and the games; the stored replays stay
  const clearResult = async () => {
    setClearOpen(false);
    setSaving(true);
    setErrorMessage(null);
    try {
      await seriesStore.clearSeriesResult(series.id!);
      close();
      onSaved?.("Result cleared. The series can be reported again.");
    } catch (error) {
      setErrorMessage((error as any)?.error || (error as Error).message || "Error clearing the result.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={show} onOpenChange={(open) => (open ? setShow(true) : saving ? null : close())}>
      {/* One width in every state: the fold holds the board, so a missing veto never widens the dialog */}
      <DialogContent showCloseButton={false} size="lg" className="gap-0 p-0">
        <DialogTitle className="flex items-center gap-2 banner bg-banner px-4 py-3 text-primary">
          <Icon name="mdi-trophy" />
          {series.scored ? "Edit result" : "Report result"}
        </DialogTitle>
        <div className="flex flex-col gap-3 p-4">
          <StatusAlert modelValue={errorMessage} onClose={() => setErrorMessage(null)} className="mb-0" />
          <StatusAlert modelValue={moved} type="success" onClose={() => setMoved(null)} className="mb-0" />

          {/* The two sides and the score the tapped winners add up to, kept in view over the games */}
          <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 rounded border px-3 py-2">
            <span className="flex min-w-0 items-center justify-end gap-2 text-right">
              <span className="truncate font-name font-bold">{name(1)}</span>
              {series.solo && series.races.player1 ? <RaceIcon raceIdentifier={series.races.player1} /> : null}
            </span>
            <span className="text-lg font-bold tnum" aria-live="polite">
              {p1} – {p2}
            </span>
            <span className="flex min-w-0 items-center gap-2">
              {series.solo && series.races.player2 ? <RaceIcon raceIdentifier={series.races.player2} /> : null}
              <span className="truncate font-name font-bold">{name(2)}</span>
            </span>
          </div>

          {series.solo && !series.raceOpen ? (
            <div>
              <Button variant="ghost" size="sm" onClick={() => setSeries((form) => ({ ...form, raceOpen: true }))}>
                <Icon name="mdi-account-switch" />
                Played a different race
              </Button>
            </div>
          ) : series.solo ? (
            // each side's race under its own name in the line above
            <div className="grid grid-cols-2 gap-3">
              {([1, 2] as const).map((side) => (
                <RaceSelect
                  key={side}
                  label={name(side)}
                  value={series.races[`player${side}`] ?? null}
                  onChange={(race) => setSeries((form) => ({ ...form, races: { ...form.races, [`player${side}`]: race } }))}
                />
              ))}
            </div>
          ) : null}

          {series.scored && !isAdmin ? <Note className="mb-0">A change to this result is posted in the league&apos;s Discord, with your name.</Note> : null}
          {replaysMissing.length ? (
            <div>
              <h3 className="flex items-center gap-2 text-warning">
                <Icon name="mdi-alert-outline" />
                {replaysMissing.length === 1 ? "A replay is missing" : "Replays are missing"}
              </h3>
              <div className="text-sm">Every game needs its replay. Add them below, or report the result without them.</div>
            </div>
          ) : null}
          {vetoMissing ? (
            <div>
              <h3 className="flex items-center gap-2 text-warning">
                <Icon name="mdi-alert-outline" />
                The map veto is not complete
              </h3>
              <div className="text-sm">Enter it below, or report the result without it.</div>
            </div>
          ) : null}
          {hasVeto ? (
            <Button variant="outline" aria-expanded={vetoOpen} className="h-auto w-full justify-between px-3 py-2" onClick={() => setVetoOpen(!vetoOpen)}>
              <span className="flex items-center gap-2">
                <Icon name={scoreVeto?.complete ? "mdi-check-circle-outline" : "mdi-alert-outline"} className={scoreVeto?.complete ? "text-success" : "text-warning"} />
                {vetoLine}
              </span>
              <Icon name={vetoOpen ? "mdi-chevron-up" : "mdi-chevron-down"} />
            </Button>
          ) : null}
          {/* The board stays mounted while it is folded, and shows its loader or error until it answers */}
          {series.id ? (
            <div hidden={!!scoreVeto && (!hasVeto || !vetoOpen)}>
              <VetoBoard key={series.id} seriesId={series.id} report onChange={(board) => openId.current === series.id && setScoreVeto(board)} />
            </div>
          ) : null}

          {/* A wide dialog reads the games as a table, one row a game under one header; a phone stacks a card a game */}
          <div className="flex flex-col gap-3 @4xl/dialog:gap-0">
            <div className={cn("hidden gap-x-4 pb-2 text-xs font-medium text-muted-foreground @4xl/dialog:grid", gameCols)} aria-hidden>
              <span>Game</span>
              <span>Winner</span>
              <span>Map played</span>
              {series.listsReplays ? <span>Replay</span> : null}
            </div>
            {gameRows.map((game) => (
              <div
                key={game}
                className={cn(
                  "grid gap-3 rounded border p-3 @4xl/dialog:items-start @4xl/dialog:gap-x-4 @4xl/dialog:rounded-none @4xl/dialog:border-x-0 @4xl/dialog:border-b-0 @4xl/dialog:px-0",
                  gameCols,
                )}
              >
                <div className="flex items-center gap-2 @4xl/dialog:flex-col @4xl/dialog:items-start">
                  <div className="min-w-0 flex-1 text-sm font-medium">
                    Game {game}
                    {titleMapOf(game) ? (
                      <span className="@4xl/dialog:block @4xl/dialog:text-xs @4xl/dialog:font-normal @4xl/dialog:text-muted-foreground">
                        <span className="@4xl/dialog:hidden"> {"\u00b7"} </span>
                        {titleMapOf(game)}
                      </span>
                    ) : null}
                  </div>
                  {canMove(game) ? (
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={<Button variant="outline" size="sm" className="text-primary-text" aria-label={`Move to game: the replay of game ${game}`} aria-busy={moving === game} disabled={moving !== null} />}
                      >
                        <Icon name={moving === game ? "mdi-loading mdi-spin" : "mdi-file-move-outline"} />
                        Move to game
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {moveTargets(movesOver, game).map((to: number) => (
                          <DropdownMenuItem key={to} onClick={() => moveReplay(game, to)}>
                            Move to game {to}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ) : null}
                </div>
                <ToggleGroup
                  variant="outline"
                  spacing={0}
                  className="w-full"
                  aria-label={`Winner of game ${game}`}
                  value={series.winners[game - 1] ? [series.winners[game - 1] as string] : []}
                  onValueChange={(value) => setWinner(game, (value[0] as string) ?? null)}
                >
                  <ToggleGroupItem value="A" className={SIDE_BUTTON}>
                    {name(1)} won
                  </ToggleGroupItem>
                  <ToggleGroupItem value="B" className={SIDE_BUTTON}>
                    {name(2)} won
                  </ToggleGroupItem>
                </ToggleGroup>
                <Field label="Map played" labelClassName="@4xl/dialog:sr-only" htmlFor={`report-map-${game}`} hint={mapHint(game)}>
                  <div className="flex gap-2">
                    <Select value={mapOf(game)} onValueChange={(value) => setMap(game, value as number | null)}>
                      <SelectTrigger id={`report-map-${game}`} className="w-full">
                        <SelectValue>{(id: number | null) => maps.find((map) => map.id === id)?.name ?? ""}</SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {maps.map((map) => (
                          <SelectItem key={map.id} value={map.id}>
                            {map.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {mapOf(game) ? (
                      <Button variant="ghost" size="icon" aria-label="Clear the map" onClick={() => setMap(game, null)}>
                        <Icon name="mdi-close" />
                      </Button>
                    ) : null}
                  </div>
                </Field>
                {series.listsReplays ? (
                <Field
                  label={`Game ${game} replay`}
                  labelClassName="@4xl/dialog:sr-only"
                  htmlFor={`report-replay-${game}`}
                  hint={fileHint(game)}
                  error={isW3g(series.replays[game]) ? null : "Only .w3g replay files are allowed"}
                >
                  <Input
                    id={`report-replay-${game}`}
                    key={series.replays[game]?.name ?? "none"}
                    ref={showHeld(series.replays[game])}
                    type="file"
                    accept=".w3g"
                    onChange={(event) => readGameReplay(game, event.target.files?.[0] ?? null)}
                  />
                </Field>
                ) : null}
                {replayNote(game) ? (
                  <Note type="warning" className="@4xl/dialog:col-span-full">
                    {replayNote(game)}
                  </Note>
                ) : null}
              </div>
            ))}
          </div>

          {scoreProblem ? <div className="text-center text-xs text-muted-foreground">{scoreProblem}</div> : null}
        </div>
        <div className="flex flex-wrap justify-end gap-2 p-4 pt-0">
          {series.scored ? (
            <Button variant="ghost" className="mr-auto text-error" disabled={saving} onClick={() => setClearOpen(true)}>
              <Icon name="mdi-eraser" />
              Clear result
            </Button>
          ) : null}
          <Button variant="ghost" disabled={saving} onClick={close}>
            Close
          </Button>
          <Button
            variant={replaysMissing.length || vetoMissing ? "outline" : "default"}
            className={replaysMissing.length || vetoMissing ? "text-warning" : undefined}
            disabled={!isValid || saving}
            onClick={() => (confirmReasons.length ? setConfirmOpen(true) : save())}
          >
            <Icon name={saving ? "mdi-loading mdi-spin" : "mdi-content-save"} />
            {replaysMissing.length || vetoMissing ? "Report with incomplete data" : "Save result"}
          </Button>
        </div>
        {/* Neither a missing replay nor the veto blocks, so a report short of either asks once and then goes through */}
        <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <DialogContent showCloseButton={false} size="confirm" className="gap-0 p-0">
            <DialogTitle className="banner bg-banner px-4 py-3 text-primary">Are you sure?</DialogTitle>
            <ul className="flex flex-col gap-3 p-4 text-sm">
              {confirmReasons.map((reason) => (
                <li key={reason} className="flex gap-2">
                  <Icon name="mdi-alert-outline" className="mt-0.5 shrink-0 text-warning" />
                  {reason}
                </li>
              ))}
            </ul>
            <div className="flex justify-end gap-2 p-4 pt-0">
              <Button variant="ghost" onClick={() => setConfirmOpen(false)}>
                Go back
              </Button>
              <Button
                variant="outline"
                className="text-warning"
                onClick={() => {
                  setConfirmOpen(false);
                  save();
                }}
              >
                Report anyway
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        <Dialog open={clearOpen} onOpenChange={setClearOpen}>
          <DialogContent showCloseButton={false} size="confirm" className="gap-0 p-0">
            <DialogTitle className="flex items-center gap-2 bg-error px-4 py-3 text-on-error">
              <Icon name="mdi-alert" />
              Clear the result
            </DialogTitle>
            <p className="p-4 text-sm">
              The score, the races played and the games go, and the series can be reported again. The replays stay.
              {isAdmin ? null : " The bot posts in the league's Discord that you cleared it."}
            </p>
            <div className="flex justify-end gap-2 p-4 pt-0">
              <Button variant="ghost" onClick={() => setClearOpen(false)}>
                Go back
              </Button>
              <Button variant="destructive" onClick={clearResult}>
                <Icon name="mdi-eraser" />
                Clear result
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
}

export default ReportResultDialog;
