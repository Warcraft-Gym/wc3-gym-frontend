"use client";
import { useId, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/Icon";
import { TapTooltip } from "@/components/ui/TapTooltip";
import { BoardPlayer } from "@/components/koth/BoardPlayer";
import type { BracketAdmin } from "@/components/koth/BracketCard";
import { foldedStored, storeFolded, throneWord } from "@/helpers/koth-board.mjs";
import { cn } from "@/lib/utils";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>;

// The mark of what a result did to the crown; a game between two others leaves no mark
const CROWN_ICON: Record<string, string> = { moved: "mdi-crown", held: "mdi-shield-crown-outline" };

const INFERRED = "Inferred from the play order";
const WITHDREW = "Did not play the next series; read as leaving the throne";
const UNKNOWN_WINNER = "Neither player played the next series, so the winner is not known";

/** The results as a table, newest first: the series number in play order, the winner with the
 *  win mark, the loser, and what the result did to the crown, with a key under it. The run page adds
 *  a Fix column; a stream drops the replay link, because nobody clicks on a stream. An archived row
 *  names the player alone, wears its crown mark in muted ink when the order of play infers the
 *  winner, and reads "<a> vs <b>" with a draw square when no winner is known. A winner who played
 *  no next series reads "Withdrew"; with no winner known, "Winner withdrew" takes the crown column. */
export function PlayedTable({ played, total, admin, clean, archived }: { played: Row[]; total: number; admin?: BracketAdmin; clean?: boolean; archived?: boolean }) {
  // a name truncates inside its cell, so a long one never pushes the crown or Fix out of the card
  const cell = "flex min-w-0 items-center gap-1.5 overflow-hidden [&_.name]:truncate [&_.player-name]:min-w-0 [&_.player-name]:max-w-full";
  const keys = (["moved", "held"] as const).filter((throne) => played.some((row) => row.throne === throne));
  return (
    <>
      <table className="w-full table-fixed border-collapse text-sm">
        <colgroup>
          <col className="w-6" />
          <col />
          <col />
          <col className="w-6" />
          {admin ? <col className="w-7" /> : null}
        </colgroup>
        <thead>
          <tr className="text-left text-xs text-muted-foreground">
            <th scope="col" className="pb-1 pr-1 text-right font-normal">#</th>
            <th scope="col" className="pb-1 pl-2 font-normal">Winner</th>
            <th scope="col" className="pb-1 pl-2 font-normal">Loser</th>
            <th scope="col" className="pb-1 font-normal">
              <span className="sr-only">Crown</span>
            </th>
            {admin ? (
              <th scope="col" className="pb-1 font-normal">
                <span className="sr-only">Fix</span>
              </th>
            ) : null}
          </tr>
        </thead>
        <tbody>
          {played.map((row: Row, index: number) => {
            const throne = throneWord(row);
            // with no winner known, the words take the loser and the crown columns together
            const unknownLeft = row.winner_left && row.undecided;
            return (
              <tr key={row.series_id} className="border-t border-border/70">
                <td className="tnum py-1.5 pr-1 text-right text-xs text-muted-foreground">{total - index}</td>
                <td className="py-1.5 pl-2">
                  <span className={cell}>
                    <span className={cn("h-2 w-2 shrink-0 rounded-[2px]", row.undecided ? "bg-draw" : "bg-win")} aria-hidden="true" />
                    {/* a phone drops "Withdrew" under the name when both do not fit */}
                    <span className="flex min-w-0 items-center gap-x-1.5 max-sm:flex-wrap">
                      {/* the queue shows each race; a result names the player, so the name keeps the cell */}
                      <BoardPlayer row={{ ...row.winner, mmr: null }} race={null} warn={false} noFlag={archived} />
                      {row.winner_left && !row.undecided ? (
                        <TapTooltip content={WITHDREW} className="shrink-0 text-xs text-muted-foreground">
                          Withdrew
                        </TapTooltip>
                      ) : null}
                    </span>
                  </span>
                </td>
                <td className="py-1.5 pl-2" colSpan={unknownLeft ? 2 : undefined}>
                  {/* "Winner withdrew" drops under the second side when both do not fit */}
                  <div className={cn(unknownLeft && "flex flex-wrap items-center gap-x-1.5")}>
                    <span className={cn(cell, !row.undecided && "[&_.name]:opacity-(--v-medium-emphasis-opacity)")}>
                      {/* a series with no winner names its two sides, neither of them the loser */}
                      {row.undecided ? <span className="shrink-0 text-xs text-muted-foreground">vs</span> : null}
                      <BoardPlayer row={{ ...row.loser, mmr: null }} race={null} warn={false} noFlag={archived} />
                      {/* the loser left the night, so no game was played */}
                      {row.forfeit && !row.undecided ? (
                        <TapTooltip content="Forfeit: left the event" className="shrink-0">
                          <Icon name="mdi-flag-outline" size={14} className="text-muted-foreground" />
                          <span className="sr-only">Forfeit</span>
                        </TapTooltip>
                      ) : null}
                      {row.review_note ? (
                        <TapTooltip content={row.review_note} className="shrink-0">
                          <Icon name="mdi-information-outline" size={14} className="text-muted-foreground" />
                          <span className="sr-only">{row.review_note}</span>
                        </TapTooltip>
                      ) : null}
                      {row.replay && !clean ? (
                        <Link href={`/series/${row.series_id}`} className="shrink-0 text-primary-text" aria-label={`Replay of series ${total - index}`}>
                          <Icon name="mdi-filmstrip" size={16} />
                        </Link>
                      ) : null}
                    </span>
                    {unknownLeft ? (
                      <TapTooltip content={UNKNOWN_WINNER} className="ml-auto shrink-0 text-xs text-muted-foreground">
                        Winner withdrew
                      </TapTooltip>
                    ) : null}
                  </div>
                </td>
                {unknownLeft ? null : (
                  <td className="py-1.5 text-center">
                    {throne ? (
                      <TapTooltip content={row.inferred ? INFERRED : throne}>
                        <Icon name={CROWN_ICON[row.throne]} size={16} className={row.inferred ? "text-muted-foreground" : "text-primary-text"} />
                        <span className="sr-only">{row.inferred ? `${throne}, ${INFERRED.toLowerCase()}` : throne}</span>
                      </TapTooltip>
                    ) : null}
                  </td>
                )}
                {admin ? (
                  <td className="py-1.5 text-right">
                    <TapTooltip content="Fix this result">
                      <Button variant="ghost" size="icon-xs" className="text-primary-text" disabled={admin.busy} aria-label={`Fix ${row.winner?.name} beat ${row.loser?.name}`} onClick={() => admin.onFix(row)}>
                        <Icon name="mdi-pencil" />
                      </Button>
                    </TapTooltip>
                  </td>
                ) : null}
              </tr>
            );
          })}
        </tbody>
      </table>
      {keys.length ? (
        <p className="mb-0 mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
          {keys.map((throne) => (
            <span key={throne} className="inline-flex items-center gap-1">
              <Icon name={CROWN_ICON[throne]} size={14} className="text-primary-text" />
              {throneWord({ throne })}
            </span>
          ))}
        </p>
      ) : null}
    </>
  );
}

const foldListeners = new Set<() => void>();
const onFold = (listener: () => void) => {
  foldListeners.add(listener);
  return () => {
    foldListeners.delete(listener);
  };
};

/** Whether the viewer folded this part of a card away, and the writer for it. The server draws
 *  every part open, so the first paint is the page a browser with storage blocked reads. */
export function useFolded(part: string) {
  const folded = useSyncExternalStore(onFold, () => foldedStored(part), () => false);
  const setFolded = (on: boolean) => {
    storeFolded(part, on);
    foldListeners.forEach((listener) => listener());
  };
  return [folded, setFolded] as const;
}

/** The heading of the queue or the results: a tap folds the part away, and opens it again. */
export function FoldHeading({ folded, onFold, controls, className, children }: { folded: boolean; onFold: (on: boolean) => void; controls: string; className?: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      className={cn("flex items-baseline gap-2 rounded-sm text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50", className)}
      aria-expanded={!folded}
      aria-controls={controls}
      onClick={() => onFold(!folded)}
    >
      {children}
      <Icon name={folded ? "mdi-chevron-right" : "mdi-chevron-down"} className="self-center text-muted-foreground" />
    </button>
  );
}

/** The Results band of a bracket card, for a night run in the app and for an archived one: a gold
 *  rule, the heading that folds the band, the newest three series and a tap that opens the rest. An
 *  admin sees it with no result yet, so a night's history can be entered from the start. */
export function BracketResults({ bracket, name, played, admin, clean, archived }: { bracket: Row; name: string; played: Row[]; admin?: BracketAdmin; clean?: boolean; archived?: boolean }) {
  const [allPlayed, setAllPlayed] = useState(false);
  // a long line pushes the results off a stream, so the band folds away, per bracket
  const [resultsFolded, foldResults] = useFolded(`${name}:results`);
  const resultsId = useId();
  if (!played.length && !admin) return null;
  // a stream shows the newest three, and the run page and the night page open the rest on a tap
  const PLAYED_SHOWN = 3;
  const playedShown = allPlayed ? played : played.slice(0, PLAYED_SHOWN);
  return (
    <div className="shrink-0 border-t-2 border-primary-text bg-background/70 px-4 pb-3 pt-2.5">
      <div className="flex items-center gap-2 pb-1.5">
        <h3 className="m-0">
          <FoldHeading folded={resultsFolded} onFold={foldResults} controls={resultsId}>
            <span className="font-heading text-base font-bold text-primary-text">Results</span>
            <span className="tnum font-sans text-xs font-normal text-muted-foreground">{played.length} series</span>
          </FoldHeading>
        </h3>
        {admin ? (
          <Button variant="ghost" size="xs" className="ml-auto text-primary-text" disabled={admin.busy} onClick={() => admin.onAddResult(bracket)}>
            <Icon name="mdi-plus" />
            Add result
          </Button>
        ) : null}
      </div>
      <div id={resultsId} hidden={resultsFolded}>
        {played.length ? <PlayedTable played={playedShown} total={played.length} admin={admin} clean={clean} archived={archived} /> : <p className="m-0 text-sm text-muted-foreground">No results yet</p>}
        {played.length > PLAYED_SHOWN && !clean ? (
          <Button variant="ghost" size="xs" className="mt-1 text-primary-text" aria-expanded={allPlayed} onClick={() => setAllPlayed(!allPlayed)}>
            <Icon name={allPlayed ? "mdi-chevron-up" : "mdi-chevron-down"} />
            {allPlayed ? "Show fewer" : `Show all ${played.length} series`}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
