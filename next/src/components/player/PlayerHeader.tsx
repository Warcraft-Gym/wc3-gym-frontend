"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/Icon";
import { toneClass } from "@/components/ui/tone";
import { PlayerName } from "@/components/PlayerName";
import { PlayerTrophies } from "@/components/player/PlayerTrophies";
import { RaceMmrChips } from "@/components/RaceMmrChips";
import { W3CIcon } from "@/components/W3CIcon";
import { W3CMmr } from "@/components/W3CMmr";
import { useSeason, useSeasonStore, useTeamStore } from "@/stores";
import { discordMark } from "@/assets/discordMark.js";
import { syncedAgo, w3cPlayerUrl } from "@/helpers/w3c-stats.js";
import { viewerZone, zoneLabel } from "@/helpers/timezone.mjs";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>;

// One gap for every icon-and-text pair, and one nudge that centres the icon on the
// x-height of the text beside it.
const ID_LINK = "inline-flex items-center gap-1.5 whitespace-nowrap text-inherit no-underline [&_.mdi]:translate-y-[-3%] [&_img]:translate-y-[-3%] [&_svg]:translate-y-[-3%]";
const ID_LINK_HOVER = `${ID_LINK} hover:[&_span]:underline`;

const chipText = (captain: boolean, team: string, season: string) => `${captain ? "Captain · " : ""}${team} · ${season}`;
// the handle a channel link ends on: the last path part, with any @ the channel keeps
const handle = (url?: string | null) => (url || "").replace(/\/+$/, "").split("/").pop();

/** Who the player is, at the top of his page: the picture, the name and race, the
 *  battle tag at w3champions, the seasons he is in, the channels he plays on, his
 *  clock and his W3C MMR. The owner also gets his Availability and Edit buttons. */
export function PlayerHeader({
  player,
  me = null,
  owner = false,
  editable = false,
  w3cSeason = null,
  onEdit,
}: {
  player: Row; // the full user row
  me?: Row | null; // the session, for the owner's own seasons
  owner?: boolean; // the viewer is this player, and may act
  editable?: boolean; // the viewer may open the edit dialog: the player himself, or an admin
  w3cSeason?: number | null;
  onEdit?: () => void;
}) {
  const { seasons } = useSeason();
  const seasonStore = useSeasonStore();
  const teamStore = useTeamStore();

  // The visitor's chips read the seasons and the teams, so the header loads both itself and does
  // not wait on a sibling. The teams stay in a local list, so a season-scoped page keeps its own.
  const [teams, setTeams] = useState<Row[]>([]);
  useEffect(() => {
    if (owner) return;
    let live = true;
    seasonStore.ensureSeasons().catch(() => {});
    teamStore.getTeamsBasic().then((rows: Row[]) => { if (live) setTeams(rows); }).catch(() => {});
    return () => { live = false; };
    // the store's members are rebuilt every render, so the viewer's role drives the read
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [owner]);

  const initials = (player.name || "?").slice(0, 2).toUpperCase();

  // the race of his newest signup; the profile race is one self-declared value
  const signupRace: string | undefined = (player.signup_seasons ?? []).slice().sort((a: Row, b: Row) => b.id - a.id).find((s: Row) => s.signup_race)?.signup_race ?? player.race;

  // The seasons still running that he is in: his own from /me, another player's from
  // his signups, the team from the roster row of that season.
  const seasonChips: Row[] = owner
    ? (me?.seasons ?? [])
        .filter((season: Row) => season.team)
        .map((season: Row) => ({ key: season.id, captain: season.captain, text: chipText(season.captain, season.team.name, season.name) }))
    : (player.signup_seasons ?? [])
        .map((signup: Row) => (seasons ?? []).find((s: Row) => s.id === signup.id) ?? signup)
        .filter((season: Row) => season.phase && season.phase !== "complete")
        .sort((a: Row, b: Row) => b.id - a.id)
        .map((season: Row) => {
          const teamId = (player.gnl_stats ?? []).find((stat: Row) => stat.season_id === season.id)?.team_id;
          const team = teams.find((t) => t.id === teamId);
          return team && { key: season.id, captain: false, text: chipText(false, team.name, season.name) };
        })
        .filter(Boolean);

  const zone = zoneLabel(player.timezone, viewerZone());
  // e.g. "synced 2 hours ago"; syncedAgo already words the never case
  const ago = syncedAgo(player);
  const syncCaption = ago === "never synced" ? ago : `synced ${ago}`;

  return (
    <>
      <div className="flex flex-wrap items-center gap-4">
        <Avatar className="size-16">
          {player.avatar_url ? <AvatarImage src={player.avatar_url} alt="" /> : null}
          <AvatarFallback className="bg-primary text-lg text-on-primary">{initials}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 grow">
          <div className="font-heading text-2xl font-bold">
            <PlayerName player={player} race={signupRace} plain mmr={false} />
          </div>
          {player.battleTag ? (
            <a href={w3cPlayerUrl(player.battleTag)} target="_blank" rel="noopener noreferrer" className={`${ID_LINK_HOVER} text-muted-foreground`}>
              <W3CIcon size={16} />
              <span>{player.battleTag}</span>
            </a>
          ) : null}
          {seasonChips.length ? (
            <div className="mt-2 flex flex-wrap gap-2">
              {seasonChips.map((chip) => (
                <Badge key={chip.key} className={toneClass(chip.captain ? "primary" : null)}>
                  {chip.captain ? <Icon name="mdi-shield-star" size={14} /> : null}
                  {chip.text}
                </Badge>
              ))}
            </div>
          ) : null}
        </div>
        {owner || editable ? (
          <div className="flex flex-wrap gap-2">
            {owner ? (
              <Button variant="outline" size="sm" className="text-primary-text" nativeButton={false} render={<Link href="/availability" />}>
                <Icon name="mdi-calendar-month" />
                Availability
              </Button>
            ) : null}
            {editable ? (
              <Button variant="ghost" size="sm" className="text-primary-text" onClick={() => onEdit?.()}>
                <Icon name="mdi-pencil" />
                Edit
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1">
        {player.discordId ? (
          <a className={ID_LINK_HOVER} href={`https://discord.com/users/${player.discordId}`} target="_blank" rel="noopener noreferrer">
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
              <path fill="currentColor" d={discordMark} />
            </svg>
            <span>{player.discordTag || "Discord"}</span>
          </a>
        ) : null}
        {player.twitch_url ? (
          <a className={ID_LINK_HOVER} href={player.twitch_url} target="_blank" rel="noopener noreferrer">
            <Icon name="mdi-twitch" size={18} />
            <span>{handle(player.twitch_url)}</span>
          </a>
        ) : null}
        {player.youtube_url ? (
          <a className={ID_LINK_HOVER} href={player.youtube_url} target="_blank" rel="noopener noreferrer">
            <Icon name="mdi-youtube" size={18} />
            <span>{handle(player.youtube_url)}</span>
          </a>
        ) : null}
        {zone ? (
          <span className={`${ID_LINK} text-muted-foreground`}>
            <Icon name="mdi-clock-outline" size={18} />
            <span>{zone}</span>
          </span>
        ) : null}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <strong><W3CMmr /></strong>
        <RaceMmrChips player={player} w3cSeason={w3cSeason ?? undefined} />
      </div>
      <div className="mt-1 text-xs text-muted-foreground">{syncCaption}</div>
      <PlayerTrophies trophies={player.trophies} />
    </>
  );
}

export default PlayerHeader;
