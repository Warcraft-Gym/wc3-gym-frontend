"use client";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Icon } from "@/components/ui/Icon";
import { BoardPlayer } from "@/components/koth/BoardPlayer";
import { BracketResults } from "@/components/koth/BracketResults";
import { archivedResults } from "@/helpers/koth-archive.mjs";
import { orderedBrackets } from "@/helpers/koth-board.mjs";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>;

/** One bracket of an archived night, drawn as the live card draws a closed one: the head, the
 *  throne and the Results band. The head names the bracket by its place, weakest first, and the
 *  source's label sits where a live card puts the MMR band. The source holds no queue and no leave, so the card draws neither.
 *  An archived name is the written name alone: no flag, race, rating mark or link. */
function HistoricalBracket({ bracket, name }: { bracket: Row; name: string }) {
  const king: Row | null = bracket.historical_king;
  const played = archivedResults(bracket.history);
  return (
    <Card className="card h-full gap-0 py-0">
      <CardHeader className="flex shrink-0 items-center gap-2 banner bg-banner p-3">
        <CardTitle className="flex-1 text-primary">{name}</CardTitle>
        <span className="tnum text-xs text-on-banner/80">{bracket.name}</span>
      </CardHeader>
      <div className="min-h-[64px] shrink-0 p-4">
        <div className="flex items-start gap-3">
          <Icon name={king ? "mdi-crown" : "mdi-crown-outline"} size={26} className={king ? "text-primary-text" : "text-muted-foreground"} />
          {king ? (
            <div className="min-w-0 flex-1 overflow-hidden [&_.name]:truncate [&_.player-name]:max-w-full">
              <BoardPlayer row={{ name: king.name, mmr: null }} race={null} warn={false} noFlag />
              <div className="text-xs text-muted-foreground">Held the throne at the end</div>
            </div>
          ) : (
            <div className="flex-1 text-muted-foreground">No king recorded</div>
          )}
        </div>
      </div>
      <BracketResults bracket={bracket} name={name} played={played} archived />
    </Card>
  );
}

/** A complete archived night, shared by the public event and the run page. */
export function HistoricalBoard({ board }: { board: Row }) {
  const brackets: Row[] = orderedBrackets(board);
  return (
    <section className="mt-4 space-y-3" aria-label="KOTH results">
      {board.videos?.length ? (
        <div className="flex flex-wrap gap-2" aria-label="Event videos">
          {board.videos.map((video: Row) => (
            <Badge key={video.id} variant="outline" render={<a href={video.url} target="_blank" rel="noopener noreferrer" />}>
              <Icon name="mdi-youtube" />
              {video.title || "Event video"}
            </Badge>
          ))}
        </div>
      ) : null}
      <div className="grid gap-4 min-[960px]:grid-cols-3">
        {brackets.map((bracket: Row, index: number) => <HistoricalBracket key={bracket.division_id} bracket={bracket} name={`Bracket ${index + 1}`} />)}
      </div>
    </section>
  );
}
