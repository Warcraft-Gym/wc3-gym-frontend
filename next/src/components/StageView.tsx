"use client";
import { GroupedTable, type GroupedColumn } from "@/components/GroupedTable";
import { PlayerName } from "@/components/PlayerName";
import { SeriesBox } from "@/components/SeriesBox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useHideResults } from "@/components/hide-results";
import { SM_AND_DOWN, useBreakpoint } from "@/hooks/breakpoint";
import { blocks, buchholz, chainOrder, columns, inDivision, layout, ranking, standingsGroups } from "@/helpers/stage-view.mjs";
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

const COL_W = 244;
// A team side prints its name over its roster, so a box of team sides is taller than a box
// of two names. A roster name wears a flag and a race icon and takes a line of the box on
// its own, and the box holds two sides.
const ROSTER_LINE = 22;

const signed = (value: number) => (value > 0 ? `+${value}` : String(value ?? 0));
const phoneCell = "hidden min-[960px]:table-cell";

/** One stage, drawn once per division. An elimination stage is bracket columns joined by their
 *  feeder lines, a round robin and a Swiss stage are their standings and their rounds, a KOTH
 *  night is the chain from the king down. A stage split into groups reads one table a group.
 *  A phone stacks the columns into one list per round. */
export function StageView({
  stage,
  series = [],
  rounds = [],
  divisions = [],
  standings = [],
  rosters = {}, // the players of each team entrant, by entrant id
  onOpenSeries,
}: {
  stage: Row;
  series?: Row[];
  rounds?: Row[];
  divisions?: Row[];
  standings?: Row[];
  rosters?: Record<string, Row[]>;
  onOpenSeries?: (row: Row) => void;
}) {
  // The spoiler switch of the page around this stage; the standings give the whole result away
  const hidden = useHideResults();
  const stacked = useBreakpoint(SM_AND_DOWN);

  const isBracket = ["single_elimination", "double_elimination"].includes(stage.format);
  const isChain = stage.format === "koth";
  // A free for all plays lobbies: a bracket of them round by round, or one league lobby
  const isLobbyStage = stage.format === "ffa";
  // A table reads a Buchholz column only where the stage's ranking rule breaks ties on it
  const showBuchholz = !isLobbyStage && ranking(stage).includes("buchholz");
  const standingColumns = isLobbyStage
    ? LOBBY_COLUMNS
    : !showBuchholz
      ? STANDING_COLUMNS
      : STANDING_COLUMNS.toSpliced(STANDING_COLUMNS.findIndex((column) => column.key === "points"), 0, BUCHHOLZ_COLUMN);

  const boxH = 88 + 2 * ROSTER_LINE * Math.max(0, ...series.flatMap((row) => [1, 2].map((side) => (rosters[row[`entrant${side}_id`]] || []).length)));

  // One drawing per division; a stage with no divisions draws its whole field once
  const bands = divisions.length ? [...divisions].sort((a, b) => a.position - b.position) : [{ id: null, position: 1, name: null }];
  const groups = bands
    .map((band) => {
      const rows = inDivision(series, band.id);
      const cols = isChain ? [{ key: "chain", name: "The chain", series: chainOrder(rows) }] : columns(rows, rounds);
      return {
        key: band.id ?? "all",
        name: band.name || `Division ${band.position}`,
        columns: cols.map((column: Row, index: number) => ({ ...column, index })),
        blocks: isBracket ? blocks(cols).map((block: Row) => ({ ...block, drawn: layout(block.columns, { boxH }) })) : [],
      };
    })
    .filter((group) => group.columns.length);

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

      {groups.map((group) => (
        <section key={group.key} className="mb-6" style={{ order: 1 }}>
          {groups.length > 1 ? <h2 className="mb-2">{group.name}</h2> : null}

          {/* a bracket on a wide screen: the boxes sit on the feeder lines they follow, and
              the lower ladder of a double elimination is drawn under the upper one */}
          {isBracket && !stacked ? (
            <div className="overflow-x-auto">
              {group.blocks.map((block: Row) => (
                <div key={block.key} className="relative mb-5" style={{ width: `${block.drawn.width}px`, height: `${block.drawn.height + 28}px` }}>
                  {block.columns.map((column: Row, index: number) => (
                    <div key={column.key} className="absolute top-0 text-xs text-muted-foreground" style={{ left: `${index * COL_W}px`, width: `${block.drawn.boxW}px` }}>
                      {column.name}
                    </div>
                  ))}
                  {/* The feeder lines are a recessive mark: the boxes carry the reading */}
                  <svg className="absolute top-[28px] left-0" width={block.drawn.width} height={block.drawn.height} aria-hidden="true">
                    {block.drawn.lines.map((line: Row) => (
                      <path key={line.key} d={line.d} fill="none" stroke="rgba(var(--v-theme-on-surface), 0.28)" strokeWidth={2} />
                    ))}
                  </svg>
                  {block.drawn.boxes.map((box: Row) => (
                    <div key={box.key} className="absolute" style={{ left: `${box.x}px`, top: `${box.cy - block.drawn.boxH / 2 + 28}px`, width: `${block.drawn.boxW}px` }}>
                      <SeriesBox series={box.row} rosters={rosters} round={block.columns[box.column].name} label={boxLabel(group, block.columns[box.column], box.row)} onOpen={onOpenSeries} />
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ) : (
            /* a phone, a round robin and a KOTH chain all read as one list per round */
            group.columns.map((column: Row) => (
              <Card key={column.key} className="card mb-3 max-w-[560px]">
                <CardHeader>
                  <CardTitle>{column.name}</CardTitle>
                </CardHeader>
                <CardContent className="px-0">
                  {column.series.map((row: Row, index: number) => (
                    <SeriesBox
                      key={row.id}
                      series={row}
                      flat
                      rosters={rosters}
                      crown={isChain}
                      round={column.name}
                      label={boxLabel(group, column, row)}
                      fed={isLobbyStage && column.index > 0}
                      // A lobby is a block of seats, so the next lobby stands off it and not on one hairline
                      className={cn(index && (isLobbyStage ? "mt-2.5" : "border-t"))}
                      onOpen={onOpenSeries}
                    />
                  ))}
                </CardContent>
              </Card>
            ))
          )}
        </section>
      ))}

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
