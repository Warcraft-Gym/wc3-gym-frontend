"use client";
import { Fragment } from "react";
import Link from "next/link";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Icon } from "@/components/ui/Icon";
import { TapTooltip } from "@/components/ui/TapTooltip";
import { FlagIcon } from "@/components/FlagIcon";
import { PlayedAs } from "@/components/PlayedAs";
import { type Player } from "@/components/PlayerName";
import { RaceIcon } from "@/components/RaceIcon";
import { RoundStrip } from "@/components/RoundStrip";
import { W3CMmr } from "@/components/W3CMmr";
import { playerPath } from "@/helpers/players.mjs";
import { stripPoints } from "@/helpers/round-strip.mjs";
import { playedAsTag } from "@/helpers/tags.mjs";
import { agoFromIso, getW3CMMR } from "@/helpers/w3c-stats";
import { cn } from "@/lib/utils";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>;

// The list is sorted, so the numbers stand in their own tracks: flag, name, race, MMR, points, rounds
// the name is the track that gives way: its floor is lower on a narrow screen, and a longer strip scrolls in the card
const GRID =
  "grid grid-cols-[16px_minmax(3.5rem,max-content)_18px_auto_auto_1fr] items-center overflow-x-auto pb-4 sm:grid-cols-[16px_minmax(4rem,max-content)_18px_auto_auto_1fr]";
// every cell carries the row rule, so one hairline runs the width of the card
const CELL = "self-stretch flex items-center border-b py-1.5";

/** The roster of one team in one event: its captains, then its members, as one card and one
 *  aligned list. A member reads as flag, name, race, MMR, his points and his round strip; the
 *  list runs by MMR, a player with none last. A captain shows those columns only when he plays.
 *  A page that edits the roster fills the render props with its own controls. */
export function TeamRoster({
  captains = [],
  members = [],
  series,
  rounds = 0,
  round,
  eventId,
  over = false,
  // The empty lines name the run of the league the roster belongs to; a GNL page says season
  noCaptains = "No captains recorded for this event.",
  noMembers = "No members recorded for this event.",
  captainsActions,
  renderCaptains,
  renderMembers,
}: {
  captains?: Player[];
  members?: Player[];
  series?: Row[]; // the event's series; without them the list draws no round strip
  rounds?: number; // how many rounds the event plays
  round?: number | null; // the round in play, named in the head
  eventId?: number | null; // the event the stats row of each player is read on
  over?: boolean; // the event is over: each row shows the MMR the player entered it with
  noCaptains?: string;
  noMembers?: string;
  captainsActions?: React.ReactNode;
  renderCaptains?: (args: { captains: Player[] }) => React.ReactNode;
  renderMembers?: (args: { members: Player[] }) => React.ReactNode;
}) {
  const mmrOf = (player: Player) => (over ? (player.mmr_entered ?? null) : getW3CMMR(player, player.signup_race ?? undefined)) as number | null;
  // the stats row of this event names the rounds the player sits out; a row of another event never does
  const outRoundsOf = (player: Row) => ((player.gnl_stats ?? []).find((stat: Row) => stat.season_id === eventId)?.out_rounds ?? []) as number[];
  // a captain is rostered on his member row when he plays, so the row carries his race and MMR
  const rowOf = (player: Player) => members.find((member) => member.id === player.id) ?? player;
  // a captain reads under Captains only, so the Members list leaves his member row out
  const sorted = members
    .filter((member) => !captains.some((captain) => captain.id === member.id))
    .sort((a, b) => (mmrOf(b) ?? -1) - (mmrOf(a) ?? -1));
  // the head counts the rows the card lists: a page with its own member list draws every member
  const memberCount = renderMembers ? members.length : sorted.length;
  const strip = !!series && rounds > 0;
  // the card is as synced as its least synced player, the way every other W3C line reads
  const synced = agoFromIso([...captains, ...members].map((player: Row) => player.w3c_synced_at).filter(Boolean).sort()[0] ?? null);
  const mmrNote = over ? "W3C ladder MMR on the signup race at the start of the event" : `W3C ladder MMR on the signup race, ${synced === "never synced" ? synced : `synced ${synced}`}`;

  // the columns are named once for the card, on the head of the first group that lists rows
  const columnsOn = !renderCaptains && captains.length ? "captains" : !renderMembers && sorted.length ? "members" : null;

  const head = (label: string, count: string, first: boolean, columns: boolean) => (
    <>
      <span className={cn(CELL, columns ? "col-span-3" : "col-span-6", "items-baseline gap-2 pb-1", first ? "pt-0" : "pt-5")}>
        <span className="font-medium">{label}</span>
        {count ? <span className="tnum text-xs text-muted-foreground">{count}</span> : null}
      </span>
      {columns ? (
        <>
          <span className={cn(CELL, "justify-end pe-1.5 pb-1 text-xs text-muted-foreground", first ? "pt-0" : "pt-5")}>
            <TapTooltip content={mmrNote}>
              <W3CMmr />
            </TapTooltip>
          </span>
          <span className={cn(CELL, "justify-end pe-1 pb-1 text-xs text-muted-foreground", first ? "pt-0" : "pt-5")}>
            {strip ? <TapTooltip content="Points from series in this event">Points</TapTooltip> : null}
          </span>
          {/* the gutter before the strip is tighter on a narrow screen, so a seven round strip still fits the card */}
          <span className={cn(CELL, "items-end ps-2 pb-1 sm:ps-[18px]", first ? "pt-0" : "pt-5")}>
            {strip ? (
              <span className="block">
                <span className="block text-xs text-muted-foreground">Rounds</span>
                <span
                  // the numbers stand over their marks: the offset is the width of the record in RoundStrip
                  className="grid gap-x-[3px] text-center text-[10px] leading-none text-muted-foreground sm:ms-8"
                  style={{ gridTemplateColumns: `repeat(${rounds}, 12px)` }}
                  aria-hidden
                >
                  {Array.from({ length: rounds }, (_, index) => index + 1).map((number) => (
                    <span key={number} className={number === round ? "font-bold text-foreground" : undefined}>
                      {number}
                    </span>
                  ))}
                </span>
              </span>
            ) : null}
          </span>
        </>
      ) : null}
    </>
  );

  const line = (player: Player) => {
    const row = rowOf(player);
    // a member plays this event; a captain plays only when he is rostered as a member too
    const plays = members.some((member) => member.id === player.id);
    // the tag this event was played as sits on its own line under the row, so the tracks keep their widths
    const asTag = playedAsTag(row.played_as, player.battleTag);
    const cell = asTag ? cn(CELL, "border-b-0 pb-0") : CELL;
    return (
      <Fragment key={player.id}>
        <span className={cn(cell, "pe-1.5")}>{player.country ? <FlagIcon countryIdentifier={player.country} /> : null}</span>
        <span className={cn(cell, "min-w-0 overflow-hidden pe-1.5")} title={player.name}>
          {player.id != null ? (
            <Link href={playerPath(player)} className="min-w-0 truncate text-inherit no-underline hover:text-primary hover:underline">
              {player.name}
            </Link>
          ) : (
            <span className="min-w-0 truncate">{player.name}</span>
          )}
        </span>
        <span className={cn(cell, "pe-1.5")}>{row.signup_race ? <RaceIcon raceIdentifier={row.signup_race} /> : null}</span>
        {plays ? (
          <>
            <span className={cn(cell, "tnum min-w-[3.1em] justify-end pe-1.5")}>{mmrOf(row) ?? "—"}</span>
            <span className={cn(cell, "tnum justify-end pe-1")}>{strip ? (stripPoints(series as Row[], Number(player.id)) ?? "—") : null}</span>
            <span className={cn(cell, "ps-2 sm:ps-[18px]")}>
              {strip ? (
                <RoundStrip series={series as Row[]} playerId={Number(player.id)} rounds={rounds} outRounds={outRoundsOf(row)} record />
              ) : null}
            </span>
          </>
        ) : (
          <span className={cn(cell, "col-span-3 whitespace-nowrap text-muted-foreground")}>Not playing this season</span>
        )}
        {asTag ? <span className={cn(CELL, "col-span-6 pt-0 ps-4")}><PlayedAs playedAs={row.played_as} battleTag={player.battleTag} /></span> : null}
      </Fragment>
    );
  };

  const empty = (text: string) => <span className={cn(CELL, "col-span-6 text-muted-foreground")}>{text}</span>;

  return (
    <Card className="card gap-0 pt-0">
      <CardTitle className="mb-2 flex items-center gap-2 bg-primary px-4 py-3 text-on-primary">
        <Icon name="mdi-account-group" />
        <span>Roster</span>
        <span className="tnum ms-auto text-sm font-normal">
          {captains.length} captain{captains.length === 1 ? "" : "s"}, {memberCount} member{memberCount === 1 ? "" : "s"}
        </span>
      </CardTitle>
      {captainsActions}
      <CardContent className={GRID}>
        {renderCaptains ? (
          <>
            {head("Captains", "", true, false)}
            <div className="col-span-6 min-w-0 py-2">{renderCaptains({ captains })}</div>
          </>
        ) : (
          <>
            {head("Captains", "", true, columnsOn === "captains")}
            {captains.length ? captains.map(line) : empty(noCaptains)}
          </>
        )}
        {renderMembers ? (
          <>
            {head("Members", "", false, false)}
            <div className="col-span-6 min-w-0 py-2">{renderMembers({ members })}</div>
          </>
        ) : (
          <>
            {head("Members", String(memberCount), false, columnsOn === "members")}
            {sorted.length ? sorted.map(line) : empty(noMembers)}
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default TeamRoster;
