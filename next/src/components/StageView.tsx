"use client";
import { useState } from "react";
import { GroupedTable, type GroupedColumn } from "@/components/GroupedTable";
import { PlayerName } from "@/components/PlayerName";
import { SeriesBox } from "@/components/SeriesBox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useHideResults } from "@/components/hide-results";
import { SM_AND_DOWN, useBreakpoint } from "@/hooks/breakpoint";
import { buchholz, championOf, columns, currentColumn, drawing, inDivision, pathOf, ranking, sideName, standingsGroups, standsOn, withoutIdleReset } from "@/helpers/stage-view.mjs";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/Icon";
import { reportOf, vetoOf } from "@/helpers/series-actions.mjs";
import { cn } from "@/lib/utils";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>;

const STANDING_COLUMNS: GroupedColumn[] = [
  { key: "position", title: "Rank", align: "right", width: "64px" },
  { key: "name", title: "Name" },
  { key: "played", title: "Played", align: "right", phone: false },
  { key: "won", title: "Won", align: "right" },
  { key: "lost", title: "Lost", align: "right", phone: false },
  { key: "game_diff", title: "Game diff", align: "right" },
  { key: "points", title: "Points", align: "right" },
];
// A lobby counts no games, so a free for all table reads its place points and nothing else
const LOBBY_COLUMNS = STANDING_COLUMNS.filter((column) => column.key !== "game_diff");
// The tie break a Swiss table ranks on sits beside the points it breaks
const BUCHHOLZ_COLUMN: GroupedColumn = { key: "buchholz", title: "Buchholz", align: "right", phone: false };

// The box that closes a bracket with its winner, and the scales a reader picks for a wide bracket
const CHAMPION_W = 200;
// A box of the draw and the column it stands in; the draw names no MMR, so a box holds a name
// and its race in less room, and the gap between two columns holds the feeder line
const BOX_W = 204;
const COL_W = 228;
const ZOOMS = [0.75, 1, 1.25];
// A team side prints its name over its roster, so a box of team sides is taller than a box
// of two names. A roster name wears a flag and a race icon and takes a line of the box on
// its own, and the box holds two sides.
const ROSTER_LINE = 22;

const signed = (value: number) => (value > 0 ? `+${value}` : String(value ?? 0));
const phoneCell = "hidden min-[960px]:table-cell";

/** One stage, drawn once per division. An elimination stage is bracket columns joined by their
 *  feeder lines, a round robin and a Swiss stage are their standings and their rounds. A stage
 *  split into groups reads one table a group.
 *  A phone stacks the columns into one list per round. */
export function StageView({
  stage,
  series = [],
  rounds = [],
  divisions = [],
  standings = [],
  rosters = {}, // the players of each team entrant, by entrant id
  seeds, // the seed of each entrant, by entrant id; a bracket names them when it has them
  viewer, // who reads the draw: a box this viewer acts for carries a report button
  onReport, // opens the report dialog in place, from that button
  onVeto, // opens the map veto in place, for a side of a cup series
  onOpenSeries,
}: {
  stage: Row;
  series?: Row[];
  rounds?: Row[];
  divisions?: Row[];
  standings?: Row[];
  rosters?: Record<string, Row[]>;
  seeds?: Record<string, number>;
  viewer?: { id?: number | null; isAdmin?: boolean; runs?: boolean; seats?: { team_id: number; season_id: number }[] };
  onReport?: (row: Row) => void;
  onVeto?: (row: Row) => void;
  onOpenSeries?: (row: Row) => void;
}) {
  // A round that plays its own best-of says so on its head, so a reader sees where the games grow
  const roundBestOf = new Map(rounds.map((round: Row) => [round.id, round.best_of]));
  const bestOfNote = (round: unknown) => {
    const games = roundBestOf.get(round);
    return games && games !== stage.best_of ? <span className="text-primary-text"> · Bo{games}</span> : null;
  };
  // what one box offers this viewer: a report, an edit, or nothing
  const reportFor = (row: Row) => (onReport && viewer ? (reportOf(row, viewer) as "report" | "edit" | null) : null);
  // a side of an open cup series vetoes from a button over the report one
  const vetoFor = (row: Row) => (onVeto && viewer && vetoOf(row, viewer) ? onVeto : null);
  // The entrant whose way through the bracket is lit, the drawing's scale, and the round a
  // phone reads, per division
  const [focus, setFocus] = useState<number | null>(null);
  const [zoom, setZoom] = useState(1);
  const [phoneRound, setPhoneRound] = useState<Record<string, number>>({});
  // The spoiler switch of the page around this stage; the standings give the whole result away
  const hidden = useHideResults();
  const stacked = useBreakpoint(SM_AND_DOWN);

  const isBracket = ["single_elimination", "double_elimination"].includes(stage.format);
  // A free for all plays lobbies: a bracket of them round by round, or one league lobby
  const isLobbyStage = stage.format === "ffa";
  // A table reads a Buchholz column only where the stage's ranking rule breaks ties on it
  const showBuchholz = !isLobbyStage && ranking(stage).includes("buchholz");
  const standingColumns = isLobbyStage
    ? LOBBY_COLUMNS
    : !showBuchholz
      ? STANDING_COLUMNS
      : STANDING_COLUMNS.toSpliced(STANDING_COLUMNS.findIndex((column) => column.key === "points"), 0, BUCHHOLZ_COLUMN);

  const boxH = (onReport ? 98 : 88) + 2 * ROSTER_LINE * Math.max(0, ...series.flatMap((row) => [1, 2].map((side) => (rosters[row[`entrant${side}_id`]] || []).length)));

  // One drawing per division; a stage with no divisions draws its whole field once
  const bands = divisions.length ? [...divisions].sort((a, b) => a.position - b.position) : [{ id: null, position: 1, name: null }];
  const groups = bands
    .map((band) => {
      // a grand final reset nobody plays would draw the final twice, so it shows once it is played
      const rows = withoutIdleReset(inDivision(series, band.id), hidden);
      const cols = columns(rows, rounds);
      return {
        key: band.id ?? "all",
        name: band.name || `Division ${band.position}`,
        columns: cols.map((column: Row, index: number) => ({ ...column, index })),
        drawn: isBracket ? drawing(cols, { boxH, boxW: BOX_W, colW: COL_W }) : null,
        // the winner of the bracket, once its last series is scored; a table names no champion
        champion: isBracket ? championOf(cols) : null,
        current: currentColumn(cols),
      };
    })
    .filter((group) => group.columns.length);

  // the name of the entrant whose way is lit, read off the first series that names it
  const focusRow = focus == null ? null : series.find((row) => standsOn(row, 1) === focus || standsOn(row, 2) === focus);
  const focusName = focusRow ? sideName(focusRow, standsOn(focusRow, 1) === focus ? 1 : 2) : "";

  const tables = standingsGroups(standings, divisions);
  const buchholzOf: Map<number, number> = showBuchholz ? buchholz(standings, series) : new Map();

  // The beaten semi-finalists play last in the final column, so the second box names itself.
  // A free for all names each box instead: a lobby of a round, or a game of the one league
  // lobby, which plays every one of its series in the same round.
  const boxLabel = (group: Row, column: Row, row: Row) => {
    if (isLobbyStage) {
      // A round of one lobby is named by the round itself, so the box names nothing
      if (column.series.length < 2) return "";
      const word = group.columns.length > 1 ? "Lobby" : "Game";
      return `${word} ${column.series.indexOf(row) + 1}`;
    }
    // The third-place series is the one the two beaten semi-finalists play, so both its
    // sides take a loser; the stage says whether it runs one at all
    return stage.third_place && row.slot1_takes_loser && row.slot2_takes_loser ? "Third place" : "";
  };

  return (
    <div className="flex flex-col">
      {!series.length ? <p className="my-4 text-muted-foreground">No series yet. Generate the stage to draw it.</p> : null}

      {/* A table stage is read from its standings down, so the card leads the DOM; only a
          bracket, which is read first and ranked after, is pushed below by its order */}
      {tables.length ? (
        <Card className="card mb-4" style={{ order: isBracket ? 2 : 0 }}>
          <CardHeader>
            <CardTitle>{isLobbyStage ? "Place points" : "Standings"}</CardTitle>
          </CardHeader>
          <CardContent className="px-0">
            {hidden ? (
              <p className="px-4 pb-4 text-muted-foreground">Results are hidden. Turn off &quot;Hide results&quot; to read the standings.</p>
            ) : (
              <GroupedTable
                columns={standingColumns}
                groups={tables}
                defaultOpen
                empty="No standings yet"
                group={({ group }) => <td colSpan={standingColumns.length}>{group.label}</td>}
                rows={({ group }) => (
                  <>
                    {(group.rows as Row[]).map((row) => (
                      <tr key={row.entrant_id} className="detail-row">
                        <td />
                        <td className="text-right">{row.position}</td>
                        <td>{row.user_id ? <PlayerName player={{ id: row.user_id, name: row.name }} /> : <span>{row.name}</span>}</td>
                        <td className={cn("text-right", phoneCell)}>{row.played}</td>
                        <td className="text-right">{row.won}</td>
                        <td className={cn("text-right", phoneCell)}>{row.lost}</td>
                        {!isLobbyStage ? <td className="text-right">{signed(row.game_diff)}</td> : null}
                        {showBuchholz ? <td className={cn("text-right", phoneCell)}>{buchholzOf.get(row.entrant_id) ?? 0}</td> : null}
                        <td className="text-right">{row.points}</td>
                      </tr>
                    ))}
                  </>
                )}
              />
            )}
          </CardContent>
        </Card>
      ) : null}

      {groups.map((group) => {
        // one round of the list, as a card; a phone reads a bracket one round at a time
        const columnCard = (column: Row) => (
          <Card key={column.key} className="card mb-3 max-w-[560px]">
            <CardHeader>
              <CardTitle>
                {column.name}
                {bestOfNote(column.key)}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-0">
              {column.series.map((row: Row, index: number) => (
                <SeriesBox
                  key={row.id}
                  series={row}
                  flat
                  rosters={rosters}
                  seeds={seeds}
                  rated={false}
                  report={reportFor(row)}
                  onVeto={vetoFor(row)}
                  stateless
                  onReport={onReport}
                  round={column.name}
                  label={boxLabel(group, column, row)}
                  fed={isLobbyStage && column.index > 0}
                  // A lobby is a block of seats, so the next lobby stands off the one above it
                  className={cn(index && "border-t", index && isLobbyStage && "mt-2.5")}
                  onOpen={onOpenSeries}
                />
              ))}
            </CardContent>
          </Card>
        );
        const lit = pathOf(series, focus);
        const shownRound = phoneRound[group.key] ?? group.current;
        return (
          <section key={group.key} className="mb-6" style={{ order: 1 }}>
            {groups.length > 1 ? <h2 className="mb-2">{group.name}</h2> : null}

            {/* a bracket on a wide screen: the boxes sit on the feeder lines they follow, and
                the lower ladder of a double elimination is drawn under the upper one, with its
                final run up to the grand final at the end of the upper ladder. A pointer over a
                player lights their way through it; the champion closes the bracket. */}
            {isBracket && !stacked ? (
              <div>
                <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span className="flex-1">{focusName ? `${focusName}: their way through the bracket is lit.` : "Point at a player to follow their way through the bracket."}</span>
                  {ZOOMS.map((value) => (
                    <Button key={value} size="sm" variant={zoom === value ? "secondary" : "outline"} aria-pressed={zoom === value} onClick={() => setZoom(value)}>
                      {Math.round(value * 100)}%
                    </Button>
                  ))}
                </div>
                <div className="overflow-x-auto" onMouseLeave={() => setFocus(null)}>
                  {(() => {
                    const drawn = group.drawn as Row;
                    const finalBox = drawn.last;
                    const width = drawn.width + (finalBox ? CHAMPION_W + 16 : 0);
                    const height = drawn.height;
                    return (
                      <div className="relative mb-5" style={{ width: `${width * zoom}px`, height: `${height * zoom}px` }}>
                        <div className="absolute top-0 left-0 origin-top-left" style={{ width: `${width}px`, height: `${height}px`, transform: `scale(${zoom})` }}>
                          {drawn.heads.map((head: Row) => (
                            <div key={head.key} className="absolute text-xs whitespace-nowrap text-muted-foreground" style={{ left: `${head.x}px`, top: `${head.y}px` }}>
                              {head.name}
                              {bestOfNote(head.round)}
                            </div>
                          ))}
                          {/* The feeder lines are a recessive mark: the boxes carry the reading */}
                          <svg className="absolute top-0 left-0" width={drawn.width} height={drawn.height} aria-hidden="true">
                            {drawn.lines.map((line: Row) => (
                              <path
                                key={line.key}
                                d={line.d}
                                fill="none"
                                stroke={lit.has(line.from) && lit.has(line.to) ? "rgb(var(--v-theme-primary))" : "rgba(var(--v-theme-on-surface), 0.28)"}
                                strokeWidth={2}
                              />
                            ))}
                          </svg>
                          {drawn.boxes.map((box: Row) => (
                            <div key={box.key} className="absolute" style={{ left: `${box.x}px`, top: `${box.cy - drawn.boxH / 2}px`, width: `${drawn.boxW}px` }}>
                              <SeriesBox
                                series={box.row}
                                rosters={rosters}
                                seeds={seeds}
                                rated={false}
                                report={reportFor(box.row)}
                                onVeto={vetoFor(box.row)}
                                stateless
                                onReport={onReport}
                                focus={focus}
                                onFocus={setFocus}
                                className={lit.has(box.row.id) ? "border-primary" : undefined}
                                round={box.round.name}
                                label={boxLabel(group, box.round, box.row)}
                                onOpen={onOpenSeries}
                              />
                            </div>
                          ))}
                          {finalBox ? (
                            <div
                              className="absolute flex flex-col gap-1 rounded-lg border border-dashed border-primary p-3"
                              style={{ left: `${finalBox.x + drawn.boxW + 16}px`, top: `${finalBox.cy - 32}px`, width: `${CHAMPION_W}px` }}
                            >
                              <span className="inline-flex items-center gap-1.5 text-xs font-bold tracking-wide text-primary-text uppercase">
                                <Icon name="mdi-trophy" />
                                Champion
                              </span>
                              <span className="font-heading text-base font-bold">{hidden ? "Results are hidden" : group.champion?.name || "To be decided"}</span>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            ) : isBracket ? (
              /* a phone reads a bracket one round at a time, opening on the round being played */
              <div>
                <div role="tablist" aria-label="Rounds" className="mb-2 flex gap-2 overflow-x-auto pb-1">
                  {group.columns.map((column: Row, index: number) => (
                    <Button
                      key={column.key}
                      role="tab"
                      aria-selected={index === shownRound}
                      size="sm"
                      variant={index === shownRound ? "secondary" : "outline"}
                      className="flex-none rounded-full"
                      onClick={() => setPhoneRound({ ...phoneRound, [group.key]: index })}
                    >
                      {column.name}
                    </Button>
                  ))}
                </div>
                {group.columns[shownRound] ? columnCard(group.columns[shownRound]) : null}
                {group.champion && !hidden ? (
                  <p className="inline-flex items-center gap-1.5 text-sm">
                    <Icon name="mdi-trophy" className="text-primary-text" />
                    Champion: <strong>{group.champion.name}</strong>
                  </p>
                ) : null}
              </div>
            ) : (
              /* a round robin reads as one list per round */
              group.columns.map((column: Row) => columnCard(column))
            )}
          </section>
        );
      })}

      {series.length ? (
        <div className="mb-4 flex gap-4 text-xs text-muted-foreground" style={{ order: 1 }}>
          {!hidden ? (
            <>
              <span className="inline-flex items-center gap-1.5">
                <i className="h-3.5 w-[3px] rounded-[2px] bg-win" />
                Won
              </span>
              <span className="inline-flex items-center gap-1.5">
                <i className="h-3.5 w-[3px] rounded-[2px] bg-loss" />
                Lost
              </span>
            </>
          ) : null}
          <span className="inline-flex items-center gap-1.5">
            <i className="h-3.5 w-[3px] rounded-[2px] bg-draw" />
            {hidden ? "Results are hidden" : "No result"}
          </span>
        </div>
      ) : null}
    </div>
  );
}

export default StageView;
