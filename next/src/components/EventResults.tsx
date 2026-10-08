"use client";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Icon } from "@/components/ui/Icon";
import { PlayerName } from "@/components/PlayerName";
import { useHideResults } from "@/components/hide-results";
import { placeIcon, placeMedal, placeTitle } from "@/helpers/awards.mjs";
import { stateOf } from "@/helpers/event-labels.mjs";
import { resultRounds } from "@/helpers/event-tabs.mjs";
import { winnerSide } from "@/helpers/stage-view.mjs";
import { cn } from "@/lib/utils";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>;

const MEDAL_TEXT: Record<string, string> = { "medal-gold": "text-medal-gold", "medal-silver": "text-medal-silver", "medal-bronze": "text-medal-bronze" };
const KIND_WORD: Record<string, string> = { walkover: "Walkover", forfeit: "Forfeit" };
// The podium reads second, first, third from the left, the winner on the highest step
const STEPS = [
  { place: 2, height: "h-16", icon: 30, tone: "border-medal-silver bg-medal-silver/15 text-medal-silver" },
  { place: 1, height: "h-24", icon: 44, tone: "border-medal-gold bg-medal-gold/20 text-medal-gold shadow-[0_0_28px_-6px] shadow-medal-gold/60" },
  { place: 3, height: "h-12", icon: 26, tone: "border-medal-bronze bg-medal-bronze/15 text-medal-bronze" },
];
// A podium step is narrow on a phone: its line wraps, so the race drops under the name before the
// name is cut, and only a name longer than the step ends in an ellipsis
const FIT = "[&_.player-name]:max-w-full [&_.player-name]:flex-wrap [&_.player-name]:justify-center [&_.player-name]:gap-y-0.5 [&_.name]:max-w-full [&_.name]:truncate";
const roundsOf = resultRounds as unknown as (series: Row[], rounds: Row[]) => { key: string; name: string; series: Row[] }[];

/** The results tab of an event and of its run page: the podium and the places once the event is
 *  finished, then every played series round by round, the winner in bold, each player with flag
 *  and race. A bye and a reset nobody played are no result, so they are left out. The spoiler
 *  switch of the page hides both. A click on a series opens it: the series page for a reader,
 *  the result dialog for a runner. The entrants name the flag and the race a table row lacks. */
export function EventResults({ event, stages, entrants = [], onOpenSeries }: { event: Row; stages: Row[]; entrants?: Row[]; onOpenSeries?: (row: Row) => void }) {
  const hidden = useHideResults();
  const finished = stateOf(event) === "finished" || !!event.closed_at;
  // Closing freezes the table of the last stage as the places, so the places are that table
  const last = [...stages].reverse().find((stage) => stage.standings?.length);
  const placeGroups: Row[] = finished ? last?.standings || [] : [];
  const played = stages.map((stage) => ({ stage, rounds: roundsOf(stage.series || [], stage.rounds || []) })).filter((one) => one.rounds.length);
  const hiddenNote = <p className="px-4 pb-4 text-muted-foreground">Results are hidden. Turn off &quot;Hide results&quot; to read them.</p>;

  const side = (row: Row, n: number) =>
    row[`player${n}`] ? (
      <PlayerName player={row[`player${n}`]} race={row[`player${n}_race`] || undefined} plain />
    ) : (
      <span>{row[`team${n}`]?.name || "To be decided"}</span>
    );

  // One place's player: the entrant's own line, with flag and race, else the name the table holds
  const byEntrant = new Map(entrants.map((one) => [one.id, one]));
  const placed = (row: Row) => {
    const entrant = byEntrant.get(row.entrant_id);
    const user = entrant?.user ?? (row.user_id ? { id: row.user_id, name: row.name } : null);
    return user ? <PlayerName player={user} race={entrant?.race || undefined} /> : <span>{entrant?.team?.name || row.name}</span>;
  };

  // The three steps; a step nobody stands on yet is drawn empty, so the podium waits for its players
  const podium = (rows: Row[]) => (
    <div className="mx-auto grid max-w-[640px] grid-cols-3 items-end gap-2 px-4 pt-2 min-[600px]:gap-4">
      {STEPS.map((step) => {
        const row = rows.find((one) => one.position === step.place);
        return (
          <div key={step.place} className="flex min-w-0 flex-col items-center gap-1.5 text-center">
            {row ? (
              <>
                <Icon name={placeIcon(step.place)} size={step.icon} className={MEDAL_TEXT[placeMedal(step.place) as string]} />
                <div className={cn("flex max-w-full justify-center font-bold", step.place === 1 ? "text-base min-[600px]:text-lg" : "text-sm min-[600px]:text-base", FIT)}>{placed(row)}</div>
                <div className="text-xs tracking-wide text-muted-foreground uppercase">{placeTitle(step.place)}</div>
              </>
            ) : null}
            <div className={cn("flex w-full items-start justify-center rounded-t-lg border-x border-t pt-2 font-heading text-2xl font-bold", step.height, step.tone)}>{step.place}</div>
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="flex flex-col gap-4">
      <Card className="card">
        <CardHeader>
          <CardTitle>Places</CardTitle>
        </CardHeader>
        <CardContent className="px-0">
          {hidden ? (
            hiddenNote
          ) : !placeGroups.length ? (
            event.cancelled_at ? (
              <p className="px-4 pb-4 text-muted-foreground">This cup was cancelled, so it awards no places.</p>
            ) : (
              <div className="pb-4">
                {podium([])}
                <p className="mt-3 px-4 text-center text-muted-foreground">The podium fills when the event finishes.</p>
              </div>
            )
          ) : (
            placeGroups.map((group) => {
              const rows = group.rows as Row[];
              const rest = rows.filter((row) => row.position > 3);
              return (
                <div key={group.division_id ?? "all"} className="pb-2">
                  {placeGroups.length > 1 ? <div className="px-4 pt-2 text-xs font-bold text-muted-foreground uppercase">{group.division_name || "Division"}</div> : null}
                  {podium(rows)}
                  {rest.length ? (
                    <ol className="mx-auto mt-4 flex max-w-[640px] flex-col">
                      {rest.map((row) => (
                        <li key={row.entrant_id} className="flex min-h-10 items-center gap-3 border-t border-border px-4">
                          <span className="tnum w-6 text-right text-sm text-muted-foreground">{row.position}</span>
                          <span className="min-w-0 flex-1">{placed(row)}</span>
                          <span className="text-sm text-muted-foreground">{placeTitle(row.position)}</span>
                        </li>
                      ))}
                    </ol>
                  ) : null}
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      <Card className="card">
        <CardHeader>
          <CardTitle>Matches</CardTitle>
        </CardHeader>
        <CardContent className="px-0">
          {hidden ? (
            hiddenNote
          ) : !played.length ? (
            <p className="px-4 pb-4 text-muted-foreground">No match has a result yet.</p>
          ) : (
            played.map(({ stage, rounds }) => (
              <div key={stage.id}>
                {played.length > 1 ? <h3 className="mx-auto max-w-[720px] px-4 pt-2 text-base font-bold">{stage.name || `Stage ${stage.position}`}</h3> : null}
                {rounds.map((round) => (
                  <section key={round.key} className="mx-auto mb-2 max-w-[720px]">
                    <div className="px-4 pt-2 pb-1 text-xs font-bold text-muted-foreground uppercase">{round.name}</div>
                    <ul className="flex flex-col">
                      {round.series.map((row) => {
                        const won = winnerSide(row);
                        return (
                          <li key={row.id} className="border-t border-border">
                            <button
                              type="button"
                              className="grid min-h-10 w-full grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_auto] items-center gap-3 px-4 text-left hover:bg-primary/5 disabled:cursor-default"
                              disabled={!onOpenSeries}
                              onClick={() => onOpenSeries?.(row)}
                            >
                              <span className={cn("flex min-w-0 justify-end", won === 1 && "font-bold")}>{side(row, 1)}</span>
                              <span className="tnum text-center font-bold">
                                {row.player1_score ?? 0} – {row.player2_score ?? 0}
                              </span>
                              <span className={cn("flex min-w-0", won === 2 && "font-bold")}>{side(row, 2)}</span>
                              {KIND_WORD[row.result_kind] ? <Badge variant="outline">{KIND_WORD[row.result_kind]}</Badge> : <span />}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </section>
                ))}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default EventResults;
