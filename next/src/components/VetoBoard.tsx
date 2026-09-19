"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Icon } from "@/components/ui/Icon";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toneClass } from "@/components/ui/tone";
import { PlayerName } from "@/components/PlayerName";
import { StatusAlert } from "@/components/StatusAlert";
import { TeamName } from "@/components/TeamName";
import { backendUrl, fetchWrapper } from "@/helpers";
import { DEFAULT_RULES } from "@/helpers/best-of.mjs";
import { myProfilePath } from "@/helpers/players.mjs";
import { hideMissingImage } from "@/helpers/team-image";
import { useAuth, useMapStore } from "@/stores";
import { cn } from "@/lib/utils";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>;
type Body = { action: string; map_id?: number };

const entrySide = (entry?: string) => (entry || "").split("_").pop()!.toUpperCase();
const sideOf = (board: Row | null, side?: string) => (side === "A" ? board?.player1 : board?.player2);
// A veto side names its team flat, so the team line is built from the three fields it carries
const teamOf = (one: Row) => ({ id: one.team_id, name: one.team_name, icon_url: one.team_icon_url });
const MINI = "mr-3 h-10 w-[62px] rounded object-cover";

// The backend answers this one in code; everything else it sends is already a sentence
const say = (error: unknown, fallback: string) =>
  (error as Error)?.message === "not_authorized_for_this_series"
    ? "This veto belongs to a series that is not yours."
    : (error as Error)?.message || fallback;

/** The map veto of one series: the pool, the order of bans and picks, and the maps the series
 *  plays. `report`: the board sits inside Report Result; the reporter enters both sides, then
 *  only the series shows. `onChange` hears every board the server answers; it is read at
 *  mount, so a caller hands in a stable function. */
export function VetoBoard({
  seriesId,
  report = false,
  onChange,
  className,
  children,
}: {
  seriesId: number | string;
  report?: boolean;
  onChange?: (board: Row) => void;
  className?: string;
  children?: React.ReactNode;
}) {
  const mapStore = useMapStore();
  const auth = useAuth();

  // The poll and the write chain run outside a render, so the board and the toggle each
  // keep a ref beside the state the page draws
  const [board, drawBoard] = useState<Row | null>(null);
  const boardRef = useRef<Row | null>(null);
  const setBoard = (next: Row | null) => {
    boardRef.current = next;
    drawBoard(next);
  };
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const pending = useRef(0); // writes not yet answered
  // a veto done in a chat is typed in by one player for both sides, in the season's order
  const [recording, drawRecording] = useState(report);
  const recordingRef = useRef(report);
  const toggleRecording = () => {
    recordingRef.current = !recordingRef.current;
    drawRecording(recordingRef.current);
  };
  // an admin records either side from the match page, but only behind the same toggle as a player
  const admin = auth.isAdmin && recording;
  const collapsed = report && !!board?.complete;

  const vetoUrl = `${backendUrl}/player-series/${seriesId}/veto`;
  // the board payload names maps only on the steps taken, so the pool is labelled from /maps
  const [maps, setMaps] = useState<Row[]>([]);
  const mapsById = new Map(maps.map((map) => [map.id, map]));
  const mapName = (id: number) => mapsById.get(id)?.name || `Map ${id}`;
  const mapImage = (id?: number | null) => mapsById.get(id)?.image;

  const order: string[] = board?.order || [];
  const taken: Row[] = board?.steps || [];
  const stepByMap = new Map(taken.map((step) => [step.map_id, step]));
  const rules: string[] = (board?.map_rules || DEFAULT_RULES).split(",").map((rule: string) => rule.trim()).filter(Boolean);

  // A team side carries its team's name and no user id, so the board names the team
  const sideName = (side?: string) => sideOf(board, side)?.team_name || sideOf(board, side)?.name || `Player ${side}`;
  const nextAction = (order[taken.length] || "").split("_")[0];

  // The API says which side the caller acts for; a team side names no user, so the id it
  // carries can be null and never stands in for the side
  const viewerIdOf = (one: Row | null) => sideOf(one, one?.viewer_side)?.id ?? null;
  const viewerId = viewerIdOf(board);
  const playerId = (side?: string) => sideOf(board, side)?.id ?? null;
  const canRecord = (auth.isAdmin || !!board?.viewer_side) && !board?.complete;

  const statusLine = board?.complete
    ? "Veto complete"
    : recording
      ? `${admin ? "Admin: " : ""}${nextAction} for ${sideName(entrySide(order[taken.length]))}`
      : board?.on_turn
        ? `Your turn: ${nextAction} a map`
        : `Waiting for ${sideName(entrySide(order[taken.length]))}`;
  const statusColor = board?.complete ? "success" : recording ? "warning" : board?.on_turn ? "primary" : null;

  // the last step takes itself when the order uses up the board: its map was the only one left
  const forcedLast = order.length >= 2 && taken.length === order.length && order.length === (board?.pool || []).length - (board?.week_map_id ? 1 : 0);

  // the last step can be taken back by the side it belongs to or by whoever entered it;
  // a forced last step goes with the step that forced it
  const last = taken[taken.length - (forcedLast ? 2 : 1)];
  const canUndo = !!last && (admin || last.side === board?.viewer_side || (viewerId != null && last.entered_by === viewerId));

  // a step typed in for the other side names who entered it; an admin who plays neither side is "an admin"
  const enteredBy = (step?: Row) => {
    if (!step?.entered_by || step.entered_by === playerId(step.side)) return null;
    const side = ["A", "B"].find((s) => playerId(s) === step.entered_by);
    return side ? sideName(side) : "an admin";
  };

  // the fixed map of the week stays on the board as game 1; every other used map is dimmed or tagged
  const tiles = ((board?.pool || []) as number[]).map((id) => {
    const step = stepByMap.get(id);
    const week = id === board?.week_map_id;
    return {
      id,
      week,
      step,
      banned: step?.action === "ban",
      name: mapName(id),
      shortname: mapsById.get(id)?.shortname || "",
      sub: week ? "Fixed map" : board?.complete ? "Unused" : "Available",
      // no action once every entry of the order is taken, even before the server confirms the last one
      canAct: !week && !step && !!order[taken.length] && (recording ? canRecord : !!board?.on_turn),
    };
  });

  const orderRows = order.map((entry, index) => {
    const step = taken[index];
    const action = entry.split("_")[0];
    const current = index === taken.length;
    return {
      n: index + 1,
      action,
      done: !!step,
      current,
      who: sideName(entrySide(entry)),
      map: step ? mapName(step.map_id) : current ? `To ${action.toLowerCase()}` : "",
      // the forced last step names nobody: its map was the only one left
      note: forcedLast && index === order.length - 1 ? "Only map left" : enteredBy(step) && `Entered by ${enteredBy(step)}`,
    };
  });

  // one row per map rule: a fixed rule names its map, a veto rule takes the picks then, once the veto
  // is complete, what is left; a loser rule is only decided at play time
  const games = (() => {
    const picksMade = taken.filter((step) => step.action === "pick");
    const leftOver: number[] = board?.complete ? board.pool.filter((id: number) => !stepByMap.has(id) && id !== board.week_map_id) : [];
    let nextPick = 0;
    let nextLeft = 0;

    return rules.map((rule, index) => {
      let mapId: number | null = null;
      let source = "Host picks";

      if (rule === "fixed") {
        mapId = board?.week_map_id;
        source = "Fixed map";
      } else if (rule === "loser") {
        source = index ? `Loser of game ${index} picks` : "Loser picks";
      } else if (rule === "veto") {
        if (nextPick < picksMade.length) {
          const step = picksMade[nextPick++];
          mapId = step.map_id;
          source = `Pick, ${sideName(step.side)}`;
        } else if (nextLeft < leftOver.length) {
          mapId = leftOver[nextLeft++];
          source = "Left over";
        } else {
          source = "Not decided";
        }
      }

      return { label: `Game ${index + 1}`, mapId, name: mapId ? mapName(mapId) : source, source: mapId ? source : "" };
    });
  })();

  const showPicks = rules.includes("loser") && order.some((entry) => /^pick/i.test(entry));
  const picks = ["A", "B"].map((side) => {
    const step = taken.find((row) => row.action === "pick" && row.side === side);
    return { side, who: sideName(side), mapId: step?.map_id, map: step ? mapName(step.map_id) : null };
  });

  // a read that keeps failing stops the poll until Try again reads the board
  const fails = useRef(0);
  const load = async () => {
    try {
      const answer = await fetchWrapper.get(vetoUrl);
      setBoard(answer);
      fails.current = 0;
      setErrorMessage(null);
      onChange?.(answer);
    } catch (error) {
      fails.current += 1;
      setErrorMessage(say(error, "Error loading the map veto."));
    }
  };

  // the board shows a step the moment it is clicked; writes go out one after the other, each
  // answer replaces the guess, and a refused write reloads the board from the server
  const chain = useRef<Promise<void>>(Promise.resolve());
  const send = (body: Body) => {
    const now = boardRef.current!;
    const steps: Row[] = now.steps || [];
    const entry: string | undefined = (now.order || [])[steps.length];
    if (body.map_id && entry) {
      const step = { side: entrySide(entry), action: entry.split("_")[0].toLowerCase(), map_id: body.map_id, entered_by: viewerIdOf(now) };
      setBoard({ ...now, steps: [...steps, step], on_turn: recordingRef.current && now.on_turn });
    } else if (body.action === "undo") {
      setBoard({ ...now, steps: steps.slice(0, -1) });
    }
    pending.current += 1;
    chain.current = chain.current.then(async () => {
      try {
        const answer = await fetchWrapper.put(vetoUrl, body);
        setBoard(answer);
        setErrorMessage(null);
        onChange?.(answer);
      } catch (error) {
        setErrorMessage(say(error, "Error saving the step."));
        await load();
      } finally {
        pending.current -= 1;
      }
    });
    return chain.current;
  };

  // the other player's steps arrive by poll; a step of the viewer's own comes back on the PUT;
  // a recorder polls on their own turn too, since the other side may be entering the same veto
  useEffect(() => {
    let alive = true;
    let timer: ReturnType<typeof setInterval> | undefined;
    const poll = () => {
      if (document.hidden || pending.current || fails.current >= 3 || boardRef.current?.complete) return;
      if (boardRef.current?.on_turn && !recordingRef.current) return;
      load();
    };
    mapStore.fetchMaps().then((rows: Row[]) => alive && setMaps(rows || [])).catch(() => {}); // names and shortnames for the pool
    // the loader sets state, so it runs just outside the effect body (react-hooks/set-state-in-effect)
    queueMicrotask(async () => {
      await load();
      if (alive) timer = setInterval(poll, 5000);
    });
    return () => {
      alive = false;
      clearInterval(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const actionChip = (action: string) => <Badge className={toneClass(/^ban$/i.test(action) ? "error" : "success")}>{action}</Badge>;

  return (
    <div className={className}>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        {children}
        {/* A team side names a team and no player, so it reads as the team name */}
        {board ? (
          <span className="flex items-center gap-2 text-muted-foreground">
            {board.player1?.team_name ? <TeamName team={teamOf(board.player1)} plain={report} /> : <PlayerName player={board.player1} plain={report} />}
            <span>vs</span>
            {board.player2?.team_name ? <TeamName team={teamOf(board.player2)} plain={report} /> : <PlayerName player={board.player2} plain={report} />}
          </span>
        ) : null}
        <span className="flex-1" />
        {board && !collapsed ? <Badge className={cn("h-7 px-3 text-sm", toneClass(statusColor))}>{statusLine}</Badge> : null}
        {report && !board?.complete ? (
          <Badge className={toneClass("warning")}>
            <Icon name="mdi-chat-processing-outline" />
            Entering a veto done elsewhere
          </Badge>
        ) : null}
        {canRecord && !report ? (
          <Button size="sm" variant="outline" aria-pressed={recording} className={cn("text-warning", recording && "bg-warning/12")} onClick={toggleRecording}>
            <Icon name={auth.isAdmin ? "mdi-shield-account-outline" : "mdi-chat-processing-outline"} />
            {auth.isAdmin ? "Admin mode" : "Enter a veto from chat"}
          </Button>
        ) : null}
        {canUndo ? (
          <Button size="sm" variant="outline" onClick={() => send({ action: "undo" })}>
            <Icon name="mdi-undo" />
            Undo
          </Button>
        ) : null}
      </div>

      <StatusAlert modelValue={errorMessage} retry={load} />
      {/* A board that never loaded leaves the page with nothing but its message */}
      {errorMessage && !board && !report ? (
        <div className="mb-4">
          <Button nativeButton={false} variant="ghost" render={<Link href={myProfilePath(auth.me)} />}>
            Back to your profile
          </Button>
        </div>
      ) : null}

      {!board && !errorMessage ? (
        <div className="flex justify-center p-8" role="status" aria-label="Loading">
          <Icon name="mdi-loading mdi-spin" size={64} className="text-primary" />
        </div>
      ) : null}

      {board ? (
        <div className="grid gap-6 min-[960px]:grid-cols-3">
          {!collapsed ? (
            <Card className="card gap-0 self-start py-0 min-[960px]:col-span-2">
              <CardHeader className="bg-primary p-4">
                <CardTitle className="flex items-center gap-2 text-on-primary">
                  <Icon name="mdi-map" />
                  Map pool
                </CardTitle>
              </CardHeader>
              <div className="flex flex-wrap gap-3 p-4">
                {tiles.map((tile) => (
                  <div key={tile.id} className={cn("w-[calc(50%-6px)] max-w-[190px] rounded border p-3", tile.banned && "bg-surface-light", tile.week && "border-primary")}>
                    {/* the map pictures are square, so the thumb keeps the whole minimap */}
                    <div className="relative aspect-square overflow-hidden rounded bg-band">
                      {mapImage(tile.id) ? (
                        <img src={mapImage(tile.id)} alt={tile.name} onError={hideMissingImage} className={cn("block h-full w-full object-cover", tile.banned && "opacity-40 grayscale")} />
                      ) : null}
                      <Badge className="absolute bottom-1 left-1 rounded bg-surface-light text-foreground">{tile.shortname}</Badge>
                    </div>
                    <div className={cn("mt-2 text-sm font-medium", tile.banned && "text-muted-foreground line-through")}>{tile.name}</div>
                    <div className="mt-2 flex min-h-8 items-center justify-between gap-2">
                      {tile.step ? (
                        <span className="flex items-center gap-2 text-xs">
                          {actionChip(tile.banned ? "Ban" : "Pick")}
                          {sideName(tile.step.side)}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">{tile.sub}</span>
                      )}
                      {tile.week ? (
                        <Badge className={toneClass("primary")}>Game 1</Badge>
                      ) : tile.canAct ? (
                        <Button variant="outline" className={nextAction === "Pick" ? "text-success" : "text-error"} onClick={() => send({ action: recording ? "record" : "step", map_id: tile.id })}>
                          {nextAction}
                        </Button>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          ) : null}

          <div className={cn("flex flex-col gap-6", collapsed && "min-[960px]:col-span-3")}>
            {!collapsed ? (
              <Card className="card gap-0 py-0">
                <CardHeader className="bg-primary p-4">
                  <CardTitle className="flex items-center gap-2 text-on-primary">
                    <Icon name="mdi-format-list-numbered" />
                    Order
                  </CardTitle>
                </CardHeader>
                <ul className="py-2">
                  {orderRows.map((row) => (
                    <li key={row.n} className={cn("flex items-center gap-3 px-4 py-1.5", row.current && "bg-primary/12")}>
                      <Icon name={row.done ? "mdi-check-circle" : "mdi-circle-outline"} size={18} className={row.done ? "text-success" : undefined} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          {actionChip(row.action)}
                          <span>{row.who}</span>
                          <span className={cn("ml-auto text-xs", !row.done && "text-muted-foreground")}>{row.map}</span>
                        </div>
                        {row.note ? <div className="text-xs text-muted-foreground">{row.note}</div> : null}
                      </div>
                    </li>
                  ))}
                </ul>
              </Card>
            ) : null}

            <Card className="card gap-0 py-0">
              <CardHeader className="bg-primary p-4">
                <CardTitle className="flex items-center gap-2 text-on-primary">
                  <Icon name="mdi-tournament" />
                  Series
                </CardTitle>
              </CardHeader>
              <ul className="py-2">
                {games.map((game) => (
                  <li key={game.label} className="flex items-center px-4 py-1.5">
                    <span className="mr-3 w-[52px] text-xs text-muted-foreground">{game.label}</span>
                    {mapImage(game.mapId) ? <img className={MINI} src={mapImage(game.mapId)} alt={game.name} onError={hideMissingImage} /> : null}
                    <div>
                      <div className={cn(!game.mapId && "text-muted-foreground")}>{game.name}</div>
                      {game.source ? <div className="text-xs text-muted-foreground">{game.source}</div> : null}
                    </div>
                  </li>
                ))}
              </ul>

              {showPicks ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Player</TableHead>
                      <TableHead>Map if they lose</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {picks.map((pick) => (
                      <TableRow key={pick.side}>
                        <TableCell>{pick.who}</TableCell>
                        <TableCell className={cn(!pick.mapId && "text-muted-foreground")}>
                          <span className="flex items-center py-1">
                            {mapImage(pick.mapId) ? <img className={MINI} src={mapImage(pick.mapId)} alt={pick.map ?? ""} onError={hideMissingImage} /> : null}
                            {pick.map || "Not picked"}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : null}
            </Card>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default VetoBoard;
