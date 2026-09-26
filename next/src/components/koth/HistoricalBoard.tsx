"use client";
import { BracketCard } from "@/components/koth/BracketCard";
import { orderedBrackets } from "@/helpers/koth-board.mjs";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>;

/** A complete historical night, shared by the public event and the run page. */
export function HistoricalBoard({ board }: { board: Row }) {
  const brackets: Row[] = orderedBrackets(board);
  return (
    <section className="mt-4 space-y-4" aria-label="Historical KOTH results">
      <p className="text-sm text-muted-foreground">{board.date_label} · Historical record. Names are recorded as written; accounts and races are unconfirmed.</p>
      {board.videos?.length ? (
        <div className="flex flex-wrap gap-3" aria-label="Event videos">
          {board.videos.map((video: Row) => <a key={video.id} href={video.url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary-text underline">{video.title || "Watch event video"}</a>)}
        </div>
      ) : null}
      <div className="grid gap-4 min-[960px]:grid-cols-3">
        {brackets.map((bracket: Row) => <BracketCard key={bracket.division_id} bracket={bracket} brackets={brackets} />)}
      </div>
    </section>
  );
}
