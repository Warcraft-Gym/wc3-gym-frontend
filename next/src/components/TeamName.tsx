"use client";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { showDefaultTeamImage, teamImageUrl } from "@/helpers/team-image.js";
import { teamLabel, teamPath } from "@/helpers/teams.mjs";
import { cn } from "@/lib/utils";

/* eslint-disable @typescript-eslint/no-explicit-any */
export type Team = { id?: number | string | null; name?: string; long_name?: string | null; icon_url?: string | null; league_id?: number | null } & Record<string, any>;

/** A team as its logo and its name. It links to the team page, of the season a season key names.
 *  A team a payload carries no logo for reads a shield of the same size, so rows stay aligned. */
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
  const to = plain ? null : teamPath(team, seasonKey);
  // A payload with neither a logo nor an id names no image, so the shield stands in its place
  const hasLogo = !!team?.icon_url || team?.id != null;
  const body = (
    <>
      <span className="inline-flex size-6 shrink-0 items-center justify-center overflow-hidden rounded-sm">
        {hasLogo ? (
          <img className="size-full object-contain" src={teamImageUrl(team)} alt="" onError={showDefaultTeamImage} />
        ) : (
          <Icon name="mdi-shield-outline" size={20} className="text-muted-foreground" />
        )}
      </span>
      <span className="name">{teamLabel(team)}</span>
    </>
  );

  // A team header sits on the primary colour, so the hover cue is the underline, never a colour
  const classes = cn("inline-flex items-center gap-1.5 text-inherit no-underline", to && "[&:hover_.name]:underline", className);
  if (to) return <Link href={to} className={classes}>{body}</Link>;
  return <span className={classes}>{body}</span>;
}

export default TeamName;
