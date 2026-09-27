/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { PlayerChipPicker } from "@/components/admin/PlayerChipPicker";
import { freeSignups } from "@/helpers/season-wizard.mjs";
import { showDefaultTeamImage, teamImageUrl } from "@/helpers/team-image";

type Row = Record<string, any>;

/** The captains and the players of each ticked team. A captain is any player; a roster takes the
 *  season's signups, each on one team at most, so a season with no signups yet sets captains only. */
export function CaptainsStep({
  teams,
  teamIds,
  captains,
  rosters,
  players,
  signups,
  draftHref,
  onCaptains,
  onRoster,
}: {
  teams: Row[];
  teamIds: number[];
  captains: Record<number, number[]>;
  rosters: Record<number, number[]>;
  // every player, or null while the list loads
  players: Row[] | null;
  signups: Row[];
  // the draft page of a stored season, or null for a new one
  draftHref: string | null;
  onCaptains: (teamId: number, ids: number[]) => void;
  onRoster: (teamId: number, ids: number[]) => void;
}) {
  const ticked = teamIds.map((id) => teams.find((team) => team.id === id)).filter(Boolean) as Row[];
  if (!ticked.length) return <p className="py-6 text-center text-muted-foreground">Tick the teams of the season first.</p>;

  return (
    <div>
      {!signups.length ? (
        <p className="mb-3 text-sm text-muted-foreground">
          Players join a team once they sign up. Place them here later
          {draftHref ? (
            <>
              {" or in the "}
              {/* a new tab, so the wizard keeps what is entered */}
              <Link href={draftHref} target="_blank" rel="noopener" className="text-primary-text underline">
                draft
              </Link>
            </>
          ) : (
            " or in the draft"
          )}
          .
        </p>
      ) : null}
      <ul className="divide-y rounded-lg border">
        {ticked.map((team) => (
          <li key={team.id} className="grid gap-3 p-3 md:grid-cols-[12rem_1fr_1fr] md:items-start">
            <div className="flex min-w-0 items-center gap-2 font-medium">
              <img src={teamImageUrl(team)} alt="" onError={showDefaultTeamImage} className="size-8 shrink-0 rounded-full object-cover" />
              <span className="truncate">{team.name}</span>
            </div>
            <div>
              <div className="mb-1 text-xs text-muted-foreground">Captains</div>
              {players ? (
                <PlayerChipPicker label="Add a captain" players={players} selected={captains[team.id] ?? []} onChange={(ids) => onCaptains(team.id, ids)} />
              ) : (
                <div className="flex items-center gap-2 text-sm text-muted-foreground" aria-busy>
                  <Icon name="mdi-loading mdi-spin" />
                  Loading the players
                </div>
              )}
            </div>
            <div>
              <div className="mb-1 text-xs text-muted-foreground">Players</div>
              <PlayerChipPicker
                label="Add a player"
                players={freeSignups(signups, rosters, team.id)}
                selected={rosters[team.id] ?? []}
                onChange={(ids) => onRoster(team.id, ids)}
                empty="No free signups"
                disabled={!signups.length}
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default CaptainsStep;
