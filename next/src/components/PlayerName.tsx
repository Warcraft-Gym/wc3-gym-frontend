"use client";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/Icon";
import { FlagIcon } from "@/components/FlagIcon";
import { RaceIcon } from "@/components/RaceIcon";
import { openPlayer, usePanelLinks } from "@/hooks/player-panel";
import { playerPath } from "@/helpers/players.mjs";
import { raceWrapper } from "@/helpers/races.js";
import { cn } from "@/lib/utils";

/* eslint-disable @typescript-eslint/no-explicit-any */
export type Player = { id?: number | string | null; name?: string; country?: string | null; battleTag?: string | null; signup_race?: string | null } & Record<string, any>;

/** A player as flag, name, race and MMR. It links to the player page. On a drafting page and
 *  inside the side panel it opens the panel instead and shows a dock icon. */
export function PlayerName({
  player,
  race,
  host,
  plain,
  onClick,
  children,
}: {
  player: Player;
  race?: string;
  host?: boolean;
  plain?: boolean; // text only: a form in a dialog must not lose its input to a click
  onClick?: () => void;
  children?: React.ReactNode;
}) {
  // A series where the player played another race marks him, so a reader on a
  // phone sees the exception without hovering anything
  const offRace = !!race && !!player.signup_race && race !== player.signup_race;
  const offRaceHint = `Signed up as ${raceWrapper.getRaceObject(player.signup_race)?.name || player.signup_race}`;

  const inPanelMode = usePanelLinks();
  const clickable = !plain && !onClick && player.id != null;
  const opensPanel = clickable && inPanelMode;
  const to = clickable && !inPanelMode ? playerPath(player) : null;

  const className = cn("player-name inline-flex items-center gap-1.5 whitespace-nowrap text-inherit no-underline border-0 bg-transparent p-0 font-inherit", (onClick || clickable) && "cursor-pointer hover:text-primary [&:hover_.name]:underline");
  const body = (
    <>
      {player.country ? <FlagIcon countryIdentifier={player.country} /> : <span className="fp" />}
      <span className="name">{player.name}</span>
      {race ? <RaceIcon raceIdentifier={race} /> : race !== undefined ? <span className="fp w-[1.4em]" /> : null}
      {/* the cue is always coloured, so a reader knows before the click that the page stays */}
      {opensPanel ? <Icon name="mdi-dock-right" size={16} className="-ml-0.5 text-primary" /> : null}
      {offRace ? <Badge variant="outline" title={offRaceHint} className="text-warning border-warning">off-race</Badge> : null}
      {host ? <Badge variant="outline" className="text-primary-text border-primary">Host</Badge> : null}
      {children}
    </>
  );

  if (to) return <Link href={to} className={className}>{body}</Link>;
  if (opensPanel)
    return (
      <button type="button" className={className} title="Opens in a side panel" onClick={() => openPlayer(player)}>
        {body}
      </button>
    );
  if (onClick)
    return (
      <button type="button" className={className} onClick={onClick}>
        {body}
      </button>
    );
  return <span className={className}>{body}</span>;
}

export default PlayerName;
