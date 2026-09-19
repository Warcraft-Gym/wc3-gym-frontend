"use client";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { showDefaultTeamImage } from "@/helpers/team-image.js";
import { usePanelLinks } from "@/hooks/player-panel";
import { teamLabel, teamPath } from "@/helpers/teams.mjs";
import { cn } from "@/lib/utils";

/* eslint-disable @typescript-eslint/no-explicit-any */
export type Team = { id?: number | string | null; name?: string; long_name?: string | null; icon_url?: string | null } & Record<string, any>;

/** A team as its logo and its name, linked to its team page; a team with no logo reads a shield of the same size. */
export function TeamName({
  team,
  seasonKey,
  plain,
  className,
}: {
  team: Team;
  seasonKey?: string | number | null; // the season whose team page the link opens
  plain?: boolean; // text only: inside another link, a button, a form or the team's own page
  className?: string;
}) {
  const inPanelMode = usePanelLinks();
  const label = teamLabel(team);
  const to = plain || inPanelMode ? null : teamPath(team, seasonKey);
  // A payload that names no team draws nothing, so a loading page shows no lone shield
  if (!label) return null;
  const body = (
    <>
      <span className="inline-flex size-6 shrink-0 items-center justify-center overflow-hidden rounded-sm">
        {/* The logo is the one the payload names: a team without it reads the shield and costs no request */}
        {team?.icon_url ? (
          <img className="size-full object-contain" src={team.icon_url} alt="" onError={showDefaultTeamImage} />
        ) : (
          /* the shield takes the text colour, so it reads on a card, a primary head and the band */
          <Icon name="mdi-shield-outline" size={20} className="opacity-60" />
        )}
      </span>
      <span className="name">{label}</span>
    </>
  );

  // A team header sits on the primary colour, so the hover cue is the underline, never a colour
  const classes = cn("inline-flex items-center gap-1.5 text-inherit no-underline", to && "[&:hover_.name]:underline", className);
  if (to) return <Link href={to} className={classes}>{body}</Link>;
  return <span className={classes}>{body}</span>;
}

export default TeamName;
