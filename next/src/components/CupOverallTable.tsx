"use client";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PlayerName } from "@/components/PlayerName";
import { legCell, legTitle } from "@/helpers/cup-rounds.mjs";
import { useEventStore } from "@/stores";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>;

/** The overall table of a cup played over rounds: each player's points from every finished
 *  round, a column per round with the place and the points it paid, and the total. The run page
 *  reads it fresh; `version` reads it again after a round is finished or reopened. */
export function CupOverallTable({ event, fresh = false, version = 0, onRows }: { event: Row; fresh?: boolean; version?: number; onRows?: (rows: Row[]) => void }) {
  const store = useEventStore();
  const [overall, setOverall] = useState<Row | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    store
      .fetchOverall(event.id, fresh)
      .then((row: Row) => {
        if (!live) return;
        setOverall(row);
        onRows?.(row.rows || []);
      })
      .catch((e: Error) => live && setError(e.message));
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event.id, fresh, version]);

  const legs: Row[] = overall?.legs || [];
  const finished = legs.filter((leg) => leg.finished_at).length;
  // before the first round is finished every player stands on 0, so there is no table yet
  const rows: Row[] = finished ? overall?.rows || [] : [];

  return (
    <Card className="card mb-4">
      <CardHeader>
        <CardTitle>Overall</CardTitle>
        <p className="text-sm text-muted-foreground">
          {finished} of {legs.length} rounds counted. A place pays {(overall?.points_by_place || []).join(", ")} points; a missed round pays 0, and players level on points are split by their best single
          result.
        </p>
      </CardHeader>
      <CardContent>
        {error ? <p className="text-sm text-error">The overall table did not load: {error}</p> : null}
        {overall && !rows.length ? <p className="text-sm text-muted-foreground">No round is finished yet; the table fills as each round is finished.</p> : null}
        {rows.length ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10 text-right">#</TableHead>
                  <TableHead>Player</TableHead>
                  {legs.map((leg) => (
                    <TableHead key={leg.id} className="hidden text-right whitespace-nowrap min-[600px]:table-cell">
                      {legTitle(leg)}
                    </TableHead>
                  ))}
                  <TableHead className="text-right">Points</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.entrant_id}>
                    <TableCell className="tnum text-right">{row.position}</TableCell>
                    <TableCell className="min-w-0 min-[600px]:min-w-[10rem]">
                      {row.user ? <PlayerName player={row.user} /> : row.name || "Entrant"}
                      <div className="text-xs text-muted-foreground min-[600px]:hidden">
                        {legs
                          .map((leg) => {
                            const cell = legCell(row, leg);
                            return `R${leg.number} ${cell ? `${cell.points} (#${cell.place})` : "–"}`;
                          })
                          .join(" · ")}
                      </div>
                    </TableCell>
                    {legs.map((leg) => {
                      const cell = legCell(row, leg);
                      return (
                        <TableCell key={leg.id} className="tnum hidden text-right whitespace-nowrap min-[600px]:table-cell">
                          {cell ? (
                            <>
                              {cell.points}
                              <span className="ml-1 text-xs text-muted-foreground">#{cell.place}</span>
                            </>
                          ) : (
                            <span className="text-muted-foreground">–</span>
                          )}
                        </TableCell>
                      );
                    })}
                    <TableCell className="tnum text-right font-bold">{row.points}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
