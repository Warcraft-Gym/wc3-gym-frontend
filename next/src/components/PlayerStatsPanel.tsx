"use client";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { Icon } from "@/components/ui/Icon";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { HeadToHeadCell } from "@/components/HeadToHeadCell";
import { PlayerName } from "@/components/PlayerName";
import { RaceIcon } from "@/components/RaceIcon";
import { record } from "@/helpers/figures.mjs";
import { playerPath } from "@/helpers/players.mjs";
import { raceWrapper } from "@/helpers/races.js";
import { syncedAgo, w3cPlayerUrl } from "@/helpers/w3c-stats.js";
import { cn } from "@/lib/utils";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>;

export type Loaded = { state: "loading" } | { state: "ok"; data: Row } | { state: "error"; message: string };
export type PanelTarget = { player: Row; opponent?: Row | null; row?: Row | null };
/** What a cup knows of the player, shown in place of the GNL season */
export type CupFacts = { race: string | null; seed: number | null; division: string | null; checkedIn: boolean | null; team: string | null; waiting: boolean };

const raceName = (race?: string | null) => raceWrapper.getRaceObject(race)?.name ?? race ?? "";
const winRate = (wins?: number | null, losses?: number | null) => {
  const total = (wins || 0) + (losses || 0);
  return total ? `${Math.round((100 * (wins || 0)) / total)}%` : "—";
};

function Section({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2 border-b border-border px-4 py-3">
      <h3 className="text-sm font-medium">{title}</h3>
      {children}
      {note ? <p className="text-xs text-muted-foreground">{note}</p> : null}
    </section>
  );
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="tnum">{children}</dd>
    </div>
  );
}

/** The last ten counted ladder games, newest first, as marks with their record beside them. */
function FormStrip({ player }: { player: Row }) {
  const games = String(player.form || "").split("").filter((one) => one === "W" || one === "L");
  if (!games.length) return <span className="text-sm text-muted-foreground">No ladder games in the event window</span>;
  const wins = games.filter((one) => one === "W").length;
  return (
    <span className="inline-flex items-center gap-2" aria-label={`Last ${games.length} ladder games, newest first: ${wins} won and ${games.length - wins} lost`}>
      <span className="inline-flex gap-0.5" aria-hidden="true">
        {games.map((one, index) => (
          <span key={index} className={cn("size-3 rounded-sm", one === "W" ? "bg-win" : "bg-loss")} />
        ))}
      </span>
      <span className="tnum text-sm text-muted-foreground">{record(wins, games.length - wins)}</span>
    </span>
  );
}

function RaceList({ races, opponentRace }: { races: (string | null)[]; opponentRace?: string | null }) {
  if (!races.length) return <span className="text-sm text-muted-foreground">nobody yet this season</span>;
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      {races.map((race, index) =>
        race ? (
          <span
            key={index}
            title={race === opponentRace ? `${raceName(race)}, the race of this opponent` : raceName(race)}
            className={cn("inline-flex rounded-full", race === opponentRace && "ring-2 ring-warning ring-offset-1 ring-offset-background")}
          >
            <RaceIcon raceIdentifier={race} size={16} />
          </span>
        ) : (
          <span key={index} className="text-muted-foreground" title="An opponent with no race on record">
            ?
          </span>
        ),
      )}
    </span>
  );
}

/** One player's figures for pairing him: his W3Champions ladder by race, his signup race over the
 *  season so far with the highest MMR, his GNL record this season, and, opened from a matchup, what
 *  that matchup holds. W3Champions has the rest, one click away.
 *  A cup's run page passes `cup`: the ladder then reads the current W3Champions season, the cup's
 *  facts stand where the GNL season does, and the header links the profile beside W3Champions. */
export function PlayerStatsPanel({
  target,
  team,
  ladder,
  cup = null,
  onClose,
  onRetry,
  onMeetings,
}: {
  target: PanelTarget | null;
  team: Row | null;
  ladder?: Loaded;
  cup?: CupFacts | null;
  onClose: () => void;
  onRetry: () => void;
  onMeetings?: (userA: number, userB: number) => Promise<Row[]>;
}) {
  const player = target?.player;
  const opponent = target?.opponent ?? null;
  const row = target?.row ?? null;
  return (
    <Sheet open={!!target} onOpenChange={(open) => (!open ? onClose() : undefined)}>
      <SheetContent side="right" showCloseButton={false} className="gap-0 overflow-y-auto p-0 data-[side=right]:w-full data-[side=right]:sm:w-[480px] data-[side=right]:sm:max-w-[480px]">
        <SheetTitle className="sr-only">{player ? `${player.name}: stats` : "Player stats"}</SheetTitle>
        {player ? <PanelBody player={player} opponent={opponent} row={row} team={team} ladder={ladder} cup={cup} onClose={onClose} onRetry={onRetry} onMeetings={onMeetings} /> : null}
      </SheetContent>
    </Sheet>
  );
}

function PanelBody({
  player,
  opponent,
  row,
  team,
  ladder,
  cup,
  onClose,
  onRetry,
  onMeetings,
}: {
  player: Row;
  opponent: Row | null;
  row: Row | null;
  team: Row | null;
  ladder?: Loaded;
  cup: CupFacts | null;
  onClose: () => void;
  onRetry: () => void;
  onMeetings?: (userA: number, userB: number) => Promise<Row[]>;
}) {
  const w3c = player.battleTag ? w3cPlayerUrl(player.battleTag) : null;
  // the signup race first, then the rest by MMR; a race with no games has nothing to say
  const races = [...(player.race_mmrs || [])]
    .filter((one: Row) => (one.games || 0) > 0 || one.mmr != null)
    .sort((x: Row, y: Row) => Number(y.race === player.race) - Number(x.race === player.race) || (y.mmr ?? -1) - (x.mmr ?? -1));
  const gnl = player.record || {};
  const asA = row && row.a?.user_id === player.user_id;
  const faced = row ? (asA ? row.facedA : row.facedB) || [] : [];
  const vsOpponent = opponent ? player.vs_race?.[opponent.race] ?? null : null;
  // the head to head reads in the pairing's order, so it turns round when the player is its second side
  const pair = row?.pair ? (asA ? row.pair : { ...row.pair, wins: row.pair.losses, losses: row.pair.wins }) : undefined;
  const inWindow: Row | null = ladder?.state === "ok" ? ladder.data : null;
  const mmr = inWindow?.mmr || {};
  const ladderRace = inWindow?.race ?? player.race;
  // a cup's read carries the form and the record by race; a GNL row carries its own of the games-rule window
  const form: string = cup ? inWindow?.form ?? "" : player.form;
  const vsRace: Record<string, number[]> = (cup ? inWindow?.vs_race : player.vs_race) || {};
  // a cup reads the current W3Champions season; a GNL season its own window
  const span = cup
    ? { scope: "This W3Champions season, as the app syncs the ladder games", none: "No ladder games synced this W3Champions season. Check W3Champions.", last: "Last 10 games this W3Champions season, newest first", vs: "Against each race this W3Champions season" }
    : { scope: "This season so far, as the app syncs the ladder games", none: "No ladder games synced since the season started. Check W3Champions.", last: "Last 10 games in the games-rule window of this event, newest first", vs: "Against each race in that window" };

  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-2 border-b border-border px-2 py-1.5">
        <Button variant="ghost" size="icon" aria-label="Close" onClick={onClose}>
          <Icon name="mdi-close" />
        </Button>
        <span className="grow" />
        {cup && player.id != null ? (
          <Link href={playerPath(player)} className={buttonVariants({ variant: "ghost", size: "sm" })}>
            Profile
          </Link>
        ) : null}
        {w3c ? (
          <a href={w3c} target="_blank" rel="noopener noreferrer" className={buttonVariants({ variant: "outline", size: "sm" })}>
            Open on W3Champions
            <Icon name="mdi-open-in-new" />
          </a>
        ) : null}
      </div>

      <div className="flex flex-col gap-1 border-b border-border px-4 py-3">
        <span className="inline-flex flex-wrap items-center gap-2 text-base">
          <PlayerName player={player} race={player.race} mmr={player.mmr ?? null} plain />
        </span>
        <span className="text-sm text-muted-foreground">
          {[team?.long_name || team?.name || cup?.team, player.race ? `signed up as ${raceName(player.race)}` : null, player.w3c_synced_at ? `W3Champions synced ${syncedAgo(player)}` : null]
            .filter(Boolean)
            .join(" · ")}
        </span>
      </div>

      <Section title="W3Champions by race" note="The current and the previous W3Champions season.">
        {races.length ? (
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground">
              <tr>
                <th className="py-1 text-left font-normal">Race</th>
                <th className="py-1 text-right font-normal">MMR</th>
                <th className="py-1 text-right font-normal">Games</th>
                <th className="py-1 text-right font-normal">Win rate</th>
              </tr>
            </thead>
            <tbody>
              {races.map((one: Row) => (
                <tr key={one.race} className="border-t border-border">
                  <td className="py-1.5">
                    <span className="inline-flex flex-wrap items-center gap-1.5">
                      <RaceIcon raceIdentifier={one.race} size={16} />
                      {raceName(one.race)}
                      {one.race === player.race ? <span className="rounded-full border px-1.5 text-xs text-muted-foreground">signed up</span> : null}
                      {one.race === player.main_race ? <span className="rounded-full border px-1.5 text-xs text-muted-foreground">main</span> : null}
                      {one.stale ? <span className="text-xs text-muted-foreground">season {one.wc3_season}</span> : null}
                    </span>
                  </td>
                  <td className="py-1.5 text-right tnum">{one.mmr ?? "—"}</td>
                  <td className="py-1.5 text-right tnum">{one.games ?? 0}</td>
                  <td className="py-1.5 text-right tnum" title={`${one.wins ?? 0} won, ${one.losses ?? 0} lost`}>
                    {winRate(one.wins, one.losses)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-sm text-muted-foreground">No W3Champions games on record. Check W3Champions.</p>
        )}
      </Section>

      <Section title={`Ladder on ${raceName(ladderRace) || "the signup race"}`}>
        <span className="text-xs text-muted-foreground">{span.scope}</span>
        {!ladder || ladder.state === "loading" ? (
          <p role="status" className="text-sm text-muted-foreground">
            Loading the ladder record
          </p>
        ) : ladder.state === "error" ? (
          <p className="text-sm text-error">
            The ladder record did not load: {ladder.message}{" "}
            <Button variant="link" size="sm" onClick={onRetry}>
              Try again
            </Button>
          </p>
        ) : !inWindow?.games && mmr.max == null ? (
          <p className="text-sm text-muted-foreground">{span.none}</p>
        ) : (
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm min-[420px]:grid-cols-3">
            <Fact label="Highest MMR">{mmr.max ?? "—"}</Fact>
            <Fact label="Lowest MMR">{mmr.min ?? "—"}</Fact>
            <Fact label="Start → now">
              {mmr.start ?? "—"} → {mmr.current ?? "—"}
            </Fact>
            <Fact label="Games">{inWindow?.games ?? 0}</Fact>
            <Fact label="Won – lost">{record(inWindow?.wins, inWindow?.losses) ?? "—"}</Fact>
            <Fact label="Win rate">{winRate(inWindow?.wins, inWindow?.losses)}</Fact>
          </dl>
        )}
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">{span.last}</span>
          <FormStrip player={{ form }} />
        </div>
        {Object.keys(vsRace).length ? (
          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">{span.vs}</span>
            <span className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
              {Object.entries(vsRace).map(([race, pairOf]) => (
                <span key={race} className="inline-flex items-center gap-1.5" title={raceName(race)}>
                  <RaceIcon raceIdentifier={race} size={14} />
                  <span className="tnum">{record(pairOf?.[0], pairOf?.[1]) ?? "—"}</span>
                </span>
              ))}
            </span>
          </div>
        ) : null}
      </Section>

      {cup ? (
        <Section title="In this cup">
          {/* the header names the sign-up race and the team, so the section holds what only the cup knows */}
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm min-[420px]:grid-cols-3">
            <Fact label="Seed">{cup.seed ?? "—"}</Fact>
            {cup.division ? <Fact label="Division">{cup.division}</Fact> : null}
            {cup.checkedIn != null ? <Fact label="Check-in">{cup.checkedIn ? "Checked in" : "Not checked in"}</Fact> : null}
            {cup.waiting ? <Fact label="Place">On the waitlist</Fact> : null}
          </dl>
        </Section>
      ) : (
        <Section title="GNL this season">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm min-[420px]:grid-cols-3">
            <Fact label="Series played">{gnl.games ?? player.played ?? 0}</Fact>
            <Fact label="Won – lost">{record(gnl.wins, gnl.losses) ?? "—"}</Fact>
            <Fact label="Sits out">{gnl.out_rounds?.length ? `round ${gnl.out_rounds.join(", ")}` : "no round"}</Fact>
          </dl>
          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">Races faced, in order</span>
            <RaceList races={player.faced || []} opponentRace={opponent?.race} />
          </div>
        </Section>
      )}

      {opponent && row ? (
        <Section title={`This matchup: vs ${opponent.name}`}>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <Fact label="MMR difference">
              {Number.isFinite(row.difference) ? row.difference : "—"}
              {row.outside ? <span className="ml-1 text-xs text-warning">outside the range</span> : null}
            </Fact>
            <Fact label={`Ladder vs ${raceName(opponent.race) || "their race"}`}>{record(vsOpponent?.[0], vsOpponent?.[1]) ?? "—"}</Fact>
            <Fact label="Both free">
              {row.hoursKnown ? `${Math.round(row.hours)} h` : "—"}
              {row.tzWarn ? <span className="ml-1 text-xs text-warning">{row.tzGap} h apart</span> : null}
            </Fact>
          </dl>
          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">Races faced, the race of {opponent.name} ringed</span>
            <RaceList races={faced.map((one: Row) => one.race)} opponentRace={opponent.race} />
          </div>
          <div className="flex flex-col gap-1 text-sm">
            <span className="text-xs text-muted-foreground">Head to head in series</span>
            <HeadToHeadCell pair={pair} onMeetings={() => onMeetings?.(player.user_id, opponent.user_id) ?? Promise.resolve([])} />
          </div>
        </Section>
      ) : null}
    </div>
  );
}

export default PlayerStatsPanel;
