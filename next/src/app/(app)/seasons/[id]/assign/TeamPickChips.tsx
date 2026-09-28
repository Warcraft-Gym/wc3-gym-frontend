/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { Icon } from "@/components/ui/Icon";
import { showDefaultTeamImage } from "@/helpers/team-image.js";
import { cn } from "@/lib/utils";

type Team = { id: number; name?: string; long_name?: string | null; icon_url?: string | null } & Record<string, any>;

/** The team a player is picked for, as one chip per team: the logo and the short name. A second click
 *  on the ticked chip takes the pick back. A team that already holds picks in the next set shows how
 *  many, so the admin sees which teams still need a player in it. */
export function TeamPickChips({ teams, value, onChange, pending, player }: {
  teams: Team[];
  value: number | null;
  onChange: (teamId: number | null) => void;
  pending: Record<number, number>;
  player: string;
}) {
  return (
    <div role="group" aria-label={`Team for ${player}`} className="flex flex-wrap gap-1">
      {teams.map((team) => {
        const on = value === team.id;
        // the count leaves out this player's own pick, so it reads "other picks in the set"
        const others = (pending[team.id] || 0) - (on ? 1 : 0);
        return (
          <button
            key={team.id}
            type="button"
            aria-pressed={on}
            title={team.long_name || team.name}
            onClick={() => onChange(on ? null : team.id)}
            className={cn(
              "relative inline-flex h-7 items-center gap-1 rounded-md border px-1.5 text-xs whitespace-nowrap transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
              on ? "btn-gold border-transparent font-medium" : "border-border bg-background hover:bg-muted",
            )}
          >
            <span className="inline-flex size-4 shrink-0 items-center justify-center overflow-hidden rounded-sm">
              {team.icon_url ? (
                <img className="size-full object-contain" src={team.icon_url} alt="" onError={showDefaultTeamImage} />
              ) : (
                <Icon name="mdi-shield-outline" size={14} className="opacity-60" />
              )}
            </span>
            {team.name}
            {others > 0 ? (
              <span className="ml-0.5 rounded-full bg-muted px-1 text-[10px] leading-4 text-muted-foreground tnum" aria-label={`${others} other ${others === 1 ? "pick" : "picks"} in the next set`}>
                {others}
              </span>
            ) : null}
            {on ? <Icon name="mdi-check" size={12} /> : null}
          </button>
        );
      })}
    </div>
  );
}

export default TeamPickChips;
