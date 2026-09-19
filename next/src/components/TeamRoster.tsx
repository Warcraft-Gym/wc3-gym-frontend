"use client";
import { Fragment } from "react";
import Link from "next/link";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Icon } from "@/components/ui/Icon";
import { TapTooltip } from "@/components/ui/TapTooltip";
import { FlagIcon } from "@/components/FlagIcon";
import { type Player } from "@/components/PlayerName";
import { RaceIcon } from "@/components/RaceIcon";
import { RoundStrip } from "@/components/RoundStrip";
import { W3CMmr } from "@/components/W3CMmr";
import { playerPath } from "@/helpers/players.mjs";
import { agoFromIso, getW3CMMR } from "@/helpers/w3c-stats";
import { cn } from "@/lib/utils";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>;

// The list is sorted, so race and MMR stand in their own tracks: flag, name, race, MMR, rounds
const GRID = "grid grid-cols-[16px_minmax(4rem,max-content)_18px_auto_1fr] items-center pb-4";
// every cell carries the row rule, so one hairline runs the width of the card
const CELL = "self-stretch flex items-center border-b py-1.5";

/** The roster of one team in one event: its captains, then its members, as one card and one
 *  aligned list. A member reads as flag, name, race, MMR and his round strip; the list runs by
 *  MMR, a player with none last. A captain shows his race, MMR and strip only when he plays.
 *  A page that edits the roster fills the render props with its own controls. */
export function TeamRoster({
  captains = [],
  members = [],
  series,
  rounds = 0,
  round,
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
  noCaptains?: string;
  noMembers?: string;
  captainsActions?: React.ReactNode;
  renderCaptains?: (args: { captains: Player[] }) => React.ReactNode;
  renderMembers?: (args: { members: Player[] }) => React.ReactNode;
}) {
  const mmrOf = (player: Player) => getW3CMMR(player, undefined, player.signup_race ?? null) as number | null;
  // a captain is rostered on his member row when he plays, so the row carries his race and MMR
  const rowOf = (player: Player) => members.find((member) => member.id === player.id) ?? player;
  const sorted = [...members].sort((a, b) => (mmrOf(b) ?? -1) - (mmrOf(a) ?? -1));
  const strip = !!series && rounds > 0;
  // the card is as synced as its least synced player, the way every other W3C line reads
  const synced = agoFromIso([...captains, ...members].map((player: Row) => player.w3c_synced_at).filter(Boolean).sort()[0] ?? null);
  const mmrNote = `W3C ladder MMR on the signup race, ${synced === "never synced" ? synced : `synced ${synced}`}`;

  const head = (label: string, count: string, first: boolean) => (
    <>
      <span className={cn(CELL, "col-span-3 items-baseline gap-2 pb-1", first ? "pt-0" : "pt-5")}>
        <span className="font-medium">{label}</span>
        {count ? <span className="tnum text-xs text-muted-foreground">{count}</span> : null}
      </span>
      <span className={cn(CELL, "justify-end pe-1.5 pb-1 text-xs text-muted-foreground", first ? "pt-0" : "pt-5")}>
        <TapTooltip content={mmrNote}>
          <W3CMmr />
        </TapTooltip>
      </span>
      <span className={cn(CELL, "items-end ps-[18px] pb-1", first ? "pt-0" : "pt-5")}>
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
  );

  const line = (player: Player) => {
    const row = rowOf(player);
    // a member plays this event; a captain plays only when he is rostered as a member too
    const plays = members.some((member) => member.id === player.id);
    return (
      <Fragment key={player.id}>
        <span className={cn(CELL, "pe-1.5")}>{player.country ? <FlagIcon countryIdentifier={player.country} /> : null}</span>
        <span className={cn(CELL, "min-w-0 overflow-hidden pe-1.5")} title={player.name}>
          {player.id != null ? (
            <Link href={playerPath(player)} className="min-w-0 truncate text-inherit no-underline hover:text-primary hover:underline">
              {player.name}
            </Link>
          ) : (
            <span className="min-w-0 truncate">{player.name}</span>
          )}
        </span>
        <span className={cn(CELL, "pe-1.5")}>{row.signup_race ? <RaceIcon raceIdentifier={row.signup_race} /> : null}</span>
        {plays ? (
          <>
            <span className={cn(CELL, "tnum min-w-[3.1em] justify-end pe-1.5")}>{mmrOf(row) ?? "—"}</span>
            <span className={cn(CELL, "ps-[18px]")}>
              {strip ? <RoundStrip series={series as Row[]} playerId={Number(player.id)} rounds={rounds} record /> : null}
            </span>
          </>
        ) : (
          <span className={cn(CELL, "col-span-2 whitespace-nowrap text-muted-foreground")}>Not playing this season</span>
        )}
      </Fragment>
    );
  };

  const empty = (text: string) => <span className={cn(CELL, "col-span-5 text-muted-foreground")}>{text}</span>;

  return (
    <Card className="card gap-0 pt-0">
      <CardTitle className="mb-2 flex items-center gap-2 bg-primary px-4 py-3 text-on-primary">
        <Icon name="mdi-account-group" />
        <span>Roster</span>
        <span className="tnum ms-auto text-sm font-normal">
          {captains.length} captain{captains.length === 1 ? "" : "s"}, {members.length} member{members.length === 1 ? "" : "s"}
        </span>
      </CardTitle>
      {captainsActions}
      <CardContent className={GRID}>
        {renderCaptains ? (
          <>
            <span className={cn(CELL, "col-span-5 pt-0 pb-1 font-medium")}>Captains</span>
            <div className="col-span-5 min-w-0 py-2">{renderCaptains({ captains })}</div>
          </>
        ) : (
          <>
            {head("Captains", "", true)}
            {captains.length ? captains.map(line) : empty(noCaptains)}
          </>
        )}
        {renderMembers ? (
          <>
            <span className={cn(CELL, "col-span-5 pt-5 pb-1 font-medium")}>Members</span>
            <div className="col-span-5 min-w-0 py-2">{renderMembers({ members })}</div>
          </>
        ) : (
          <>
            {head("Members", String(members.length), false)}
            {sorted.length ? sorted.map(line) : empty(noMembers)}
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default TeamRoster;
