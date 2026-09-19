"use client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Icon } from "@/components/ui/Icon";
import { TapTooltip } from "@/components/ui/TapTooltip";
import { W3CIcon } from "@/components/W3CIcon";
import { hideMissingImage, teamImageUrl } from "@/helpers/team-image";
import { cn } from "@/lib/utils";
import type { Row } from "./match-cells";

export type RoundMatches = { roundNumber: number; matches: Row[] };

/** The bar under the banner: back to the season, one button per round that lists the matches
 *  played in it, and the W3C sync an admin runs for both teams. */
export function MatchRoundNav({
  match,
  seasonHref,
  matchesByRound,
  isAdmin,
  isLoading,
  onSyncW3C,
  onOpenMatch,
}: {
  match: Row;
  seasonHref: string;
  matchesByRound: RoundMatches[];
  isAdmin: boolean;
  isLoading: boolean;
  onSyncW3C: () => void;
  onOpenMatch: (matchId: number) => void;
}) {
  return (
    <Card className="card mb-4 gap-0 py-0">
      <CardContent className="flex flex-col gap-3 p-3 min-[960px]:flex-row min-[960px]:items-center">
        <Button nativeButton={false} className="min-[960px]:w-auto" render={<Link href={seasonHref} />}>
          <Icon name="mdi-calendar-multiple" />
          Back to Season
        </Button>

        {/* One button per round; it lists that round's matches so a reader moves along the season */}
        <div className="flex flex-1 gap-1 overflow-x-auto rounded bg-primary p-1">
          {matchesByRound.map((round) => (
            <DropdownMenu key={round.roundNumber}>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn("flex-none text-on-primary hover:bg-on-primary/15", round.roundNumber === match.playday && "underline underline-offset-4")}
                  />
                }
              >
                <Icon name="mdi-calendar-week" />
                Round {round.roundNumber}
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="max-w-[400px]">
                <DropdownMenuLabel>Round {round.roundNumber} Matches</DropdownMenuLabel>
                {round.matches.map((matchItem) => (
                  <DropdownMenuItem
                    key={matchItem.id}
                    onClick={() => onOpenMatch(matchItem.id)}
                    /* the match you are reading is named, so weight and not colour alone marks the row */
                    className={cn(matchItem.id === match.id && "font-medium")}
                    aria-current={matchItem.id === match.id ? "page" : undefined}
                  >
                    <span className="flex w-full items-center justify-between gap-2">
                      <span className="flex w-[45%] flex-col items-center gap-1">
                        <img className="size-8 rounded-full object-cover" alt="" src={teamImageUrl(matchItem.team1_id)} onError={hideMissingImage} />
                        <span className="text-center text-xs">{matchItem.team1_name}</span>
                      </span>
                      <span className="text-xs text-muted-foreground">vs</span>
                      <span className="flex w-[45%] flex-col items-center gap-1">
                        <img className="size-8 rounded-full object-cover" alt="" src={teamImageUrl(matchItem.team2_id)} onError={hideMissingImage} />
                        <span className="text-center text-xs">{matchItem.team2_name}</span>
                      </span>
                    </span>
                  </DropdownMenuItem>
                ))}
                {round.matches.length === 0 ? <DropdownMenuItem disabled>No matches scheduled</DropdownMenuItem> : null}
              </DropdownMenuContent>
            </DropdownMenu>
          ))}
        </div>

        {isAdmin ? (
          <TapTooltip content="MMR and ladder matches">
            <Button onClick={onSyncW3C} disabled={isLoading}>
              <W3CIcon size={18} />
              Sync W3C
            </Button>
          </TapTooltip>
        ) : null}
      </CardContent>
    </Card>
  );
}

export default MatchRoundNav;
