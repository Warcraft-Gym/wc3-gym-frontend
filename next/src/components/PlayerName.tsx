"use client";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/Icon";
import { TapTooltip } from "@/components/ui/TapTooltip";
import { FlagIcon } from "@/components/FlagIcon";
import { RaceIcon } from "@/components/RaceIcon";
import { openPlayer, usePanelLinks } from "@/hooks/player-panel";
import { gamesWarning } from "@/helpers/games-rule.mjs";
import { playerPath } from "@/helpers/players.mjs";
import { raceWrapper } from "@/helpers/races.js";
import { getW3CMMR } from "@/helpers/w3c-stats.js";
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
  mmr,
  games,
  warning,
  onClick,
  children,
}: {
  player: Player;
  race?: string;
  host?: boolean;
  plain?: boolean; // text only: a form in a dialog must not lose its input to a click
  mmr?: number | false | null; // false where a column of its own sorts by MMR; a number the caller already holds, null where its payload names none
  games?: number | null; // the current w3champions season: draws the games-rule mark on a draft surface
  warning?: { colour: "error" | "warning"; text: string } | null; // the same mark from a read that already applies the event's rule
  onClick?: () => void;
  children?: React.ReactNode;
}) {
  // The ladder MMR reads the signup race alone, so a profile race prints no number
  const rating = mmr === false ? null : (mmr ?? getW3CMMR(player, undefined, player.signup_race ?? undefined));
  // The games mark falls back to the profile race, the race the players page signs a player up on
  const mark = warning !== undefined ? warning : games ? gamesWarning(player, games, player.signup_race || player.race || null) : null;
  // A series where the player played another race marks him, so a reader on a
  // phone sees the exception without hovering anything
  const offRace = !!race && !!player.signup_race && race !== player.signup_race;
  const offRaceHint = `Signed up as ${raceWrapper.getRaceObject(player.signup_race)?.name || player.signup_race}`;

  const inPanelMode = usePanelLinks();
  const clickable = !plain && !onClick && player.id != null;
  const opensPanel = clickable && inPanelMode;
  const to = clickable && !inPanelMode ? playerPath(player) : null;

  const className = cn("player-name inline-flex items-center gap-1.5 whitespace-nowrap text-inherit no-underline border-0 bg-transparent p-0", (onClick || clickable) && "cursor-pointer hover:text-primary [&:hover_.name]:underline");
  const body = (
    <>
      {/* the mark leads the line, and its tap opens the tooltip instead of the player page */}
      {mark ? (
        <span className="inline-flex" onClick={(event) => { event.preventDefault(); event.stopPropagation(); }}>
          <TapTooltip content={mark.text}>
            <Icon name="mdi-alert" size={16} className={mark.colour === "error" ? "text-error" : "text-warning"} />
            <span className="sr-only">{mark.text}</span>
          </TapTooltip>
        </span>
      ) : games !== undefined || warning !== undefined ? (
        /* a line that meets the rule keeps the empty slot, so the flags stay in one column */
        <span className="inline-block h-4 w-4" />
      ) : null}
      {player.country ? <FlagIcon countryIdentifier={player.country} /> : <span className="fp" />}
      <span className="name">{player.name}</span>
      {race ? <RaceIcon raceIdentifier={race} /> : race !== undefined ? <span className="fp w-[1.4em]" /> : null}
      {rating != null ? <span className="tnum font-normal text-muted-foreground">{rating}</span> : null}
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
