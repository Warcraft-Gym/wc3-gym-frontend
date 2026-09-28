/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Icon } from "@/components/ui/Icon";
import { TapTooltip } from "@/components/ui/TapTooltip";
import { PlayerName } from "@/components/PlayerName";
import { TeamName } from "@/components/TeamName";
import { averageMmr } from "@/helpers/draft.mjs";
import { syncedAgo, syncedAt } from "@/helpers/w3c-stats";
import { cn } from "@/lib/utils";

type Row = Record<string, any>;
export type Dragging = { player: Row; fromTeamId: number } | null;

/** One team's roster for the season, with its player count and average MMR in the head. An admin drags
 *  a player onto another team's card to move them; the card under a dragged player from another team
 *  rings, and its own card takes no drop. */
export function TeamRosterCard({ team, players, canEdit, dragging, busy, mmrOf, cues, onDragStart, onDragEnd, onMove, onRemove }: {
  team: Row;
  players: Row[];
  canEdit: boolean;
  dragging: Dragging;
  busy: (playerId: number) => boolean;
  mmrOf: (player: Row) => number;
  cues: (player: Row) => React.ReactNode;
  onDragStart: (player: Row) => void;
  onDragEnd: () => void;
  onMove: (player: Row, fromTeamId: number, toTeamId: number) => void;
  onRemove: (player: Row) => void;
}) {
  const [over, setOver] = useState(false);
  const average = averageMmr(players, mmrOf);
  // a player dragged from another team may land here
  const target = !!dragging && dragging.fromTeamId !== team.id;

  return (
    <Card
      className={cn(
        "card gap-0 py-0 transition-shadow",
        target && "outline-2 outline-offset-2 outline-dashed outline-primary/50",
        target && over && "ring-3 ring-primary outline-none",
      )}
      onDragOver={(event) => {
        if (!target) return;
        // only a drop target calls preventDefault, so the browser refuses a drop on the own card
        event.preventDefault();
        if (!over) setOver(true);
      }}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOver(false);
      }}
      onDrop={(event) => {
        event.preventDefault();
        setOver(false);
        if (target && dragging) onMove(dragging.player, dragging.fromTeamId, team.id);
      }}
    >
      <CardTitle className="flex items-center gap-2 banner bg-banner px-4 py-3 text-primary">
        <TeamName team={team} className="flex-1" />
        {players.length ? (
          <TapTooltip content={average != null ? `${players.length} players · average MMR ${average}` : `${players.length} players`}>
            <span className="text-xs font-normal whitespace-nowrap tnum">
              {players.length}
              {average != null ? ` · Ø ${average}` : ""}
            </span>
          </TapTooltip>
        ) : null}
      </CardTitle>
      <CardContent className="py-3">
        {target && over ? <div className="mb-2 text-sm text-primary-text">Drop to move {dragging?.player.name} here</div> : null}
        {players.length ? (
          players.map((p) => (
            <div
              key={p.id}
              draggable={canEdit && !busy(p.id)}
              onDragStart={(event) => {
                event.dataTransfer.effectAllowed = "move";
                onDragStart(p);
              }}
              onDragEnd={onDragEnd}
              className={cn("flex items-center gap-1 py-1.5", canEdit && "cursor-grab active:cursor-grabbing", dragging?.player.id === p.id && "opacity-50")}
            >
              {canEdit ? <Icon name="mdi-drag-vertical" size={18} className="shrink-0 text-muted-foreground" /> : null}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <PlayerName player={p} race={p.signup_race} games />
                  {cues(p)}
                </div>
                <TapTooltip className="text-xs text-muted-foreground" content={syncedAt(p)}>
                  {syncedAgo(p)}
                </TapTooltip>
              </div>
              {canEdit ? (
                busy(p.id) ? (
                  <Icon name="mdi-loading mdi-spin" className="mx-2 text-muted-foreground" />
                ) : (
                  <Button variant="ghost" size="icon-sm" aria-label={`Remove ${p.name} from the team`} className="text-error" onClick={() => onRemove(p)}>
                    <Icon name="mdi-delete" />
                  </Button>
                )
              ) : null}
            </div>
          ))
        ) : (
          <em className="text-muted-foreground">No players assigned for this season</em>
        )}
      </CardContent>
    </Card>
  );
}

export default TeamRosterCard;
