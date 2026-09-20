/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Icon } from "@/components/ui/Icon";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { toneClass } from "@/components/ui/tone";
import { PlayerName } from "@/components/PlayerName";
import { StatusAlert } from "@/components/StatusAlert";
import { TeamName } from "@/components/TeamName";
import { checkInCounts, checkInStatus, setByText } from "@/helpers/check-in.mjs";
import { eventLabel } from "@/helpers/event-labels.mjs";
import { currentRound, roundLabel } from "@/helpers/rounds.mjs";
import { useBreakpoint, XS } from "@/hooks/breakpoint";
import { useAuth, useAvailabilityStore, useMatchStore, useSeason, useSeriesStore, useTeamStore } from "@/stores";

type Row = Record<string, any>;
type Status = { title: string; short: string; color: string | null; icon: string; derived: boolean; hint?: string };

// The mark of a matrix cell wears the colour; the word beside it stays a text token
const INK: Record<string, string> = { success: "text-success", error: "text-error" };

/** The state of one round as a tonal chip; a matrix cell drops the pill, so three rounds fit 390 px. */
function StatusChip({ status, short = false }: { status: Status; short?: boolean }) {
  if (short)
    return (
      <span className="inline-flex items-center gap-1 text-xs" title={status.hint ?? status.title}>
        <Icon name={status.icon} size={14} className={INK[status.color ?? ""] ?? "text-muted-foreground"} />
        {/* under the XS breakpoint the mark stands alone, and the word stays in the tooltip */}
        <span className="hidden min-[600px]:inline">{status.short}</span>
      </span>
    );
  return (
    <Badge className={toneClass(status.color)} title={status.hint ?? status.title}>
      <Icon name={status.icon} />
      {status.title}
    </Badge>
  );
}

/** The captain's edits of one player and one round, from the row menu or from a matrix cell. */
function RoundMenu({
  player,
  round,
  status,
  busy,
  trigger,
  children,
  onSet,
  onSitOutAll,
}: {
  player: Row;
  round: number;
  status: Status;
  busy: boolean;
  trigger: React.ReactElement;
  children: React.ReactNode;
  onSet: (available: boolean | null) => void;
  onSitOutAll: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={trigger}>{children}</DropdownMenuTrigger>
      {/* The label is a group part, so the one-round items carry the group it asks for */}
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuGroup>
          <DropdownMenuLabel>{`${player.name} · Round ${round}`}</DropdownMenuLabel>
          {status.title === "Checked in" ? null : (
            <DropdownMenuItem disabled={busy} onClick={() => onSet(true)}>
              <Icon name="mdi-check" className="text-success" />
              {`Check in for ${player.name}`}
            </DropdownMenuItem>
          )}
          {status.derived || status.title === "Out" ? null : (
            <DropdownMenuItem disabled={busy} onClick={() => onSet(false)}>
              <Icon name="mdi-close" className="text-error" />
              Sit out this round
            </DropdownMenuItem>
          )}
          {status.derived || status.title === "No answer" ? null : (
            <DropdownMenuItem disabled={busy} onClick={() => onSet(null)}>
              <Icon name="mdi-backspace-outline" />
              Clear
            </DropdownMenuItem>
          )}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled={busy} onClick={onSitOutAll}>
          <Icon name="mdi-calendar-remove" className="text-error" />
          Sit out all remaining rounds
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** The check-in of one team, one round or every round; a captain of the team or an admin writes for a player. */
export function TeamRoundsView({ id, seasonKey }: { id: string; seasonKey: string }) {
  const router = useRouter();
  const auth = useAuth();
  const teamStore = useTeamStore();
  const availabilityStore = useAvailabilityStore();
  const matchStore = useMatchStore();
  const seriesStore = useSeriesStore();
  const { current_season: season, seasonIdOf, fetchSeason } = useSeason();
  const phone = useBreakpoint(XS);

  const teamId = Number(id);
  const seasonId = seasonIdOf(seasonKey);

  const [team, setTeam] = useState<Row | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  // The grid speaks for the answers it read: without them every cell would read 'No answer'
  const [loaded, setLoaded] = useState(false);
  const [matches, setMatches] = useState<Row[]>([]);
  // One read of the event's series, so a round that is already paired names its opponent
  const [eventSeries, setEventSeries] = useState<Row[]>([]);
  const [saving, setSaving] = useState<string | null>(null);
  const [allRounds, setAllRounds] = useState(false);
  const [shownRound, setShownRound] = useState<number | null>(null);

  // The round labels: the season's round gives the dates, the team's match names the opponent
  const roundOf = (round: number) => season?.rounds?.find((r: Row) => r.playday === round) || { playday: round };
  const opponentOfRound = (round: number) => {
    const match = matches.find((m) => m.playday === round && [m.team1_id, m.team2_id].includes(teamId));
    return match && (match.team1_id === teamId ? match.team2 : match.team1);
  };

  const players: Row[] = team?.player_by_season?.[seasonId as number] || [];
  const rounds: number[] = Array.from({ length: season?.round_count || 0 }, (_, i) => i + 1);
  // The round in play leads, so a captain lands on the one he answers
  const round = shownRound ?? currentRound(season?.rounds ?? [])?.playday ?? 1;
  const roundItems = rounds.map((item) => ({ value: item, label: `Round ${item} · ${roundLabel(roundOf(item))}` }));

  const rowFor = (userId: number, playday: number) => rows.find((row) => row.user_id === userId && row.playday === playday);
  const statusOf = (userId: number, playday: number): Status => checkInStatus(rowFor(userId, playday));

  // A series of the round is the answer: a player who is already paired needs no check-in word
  const seriesOf = (userId: number, playday: number) =>
    eventSeries.find(
      (one) =>
        one.match?.playday === playday &&
        [one.match?.team1_id, one.match?.team2_id].includes(teamId) &&
        [one.player1_id, one.player2_id].includes(userId),
    );
  // The other side of a series, or null while a side names nobody yet
  const opponentOf = (one: Row | undefined, userId: number) => {
    const side = one?.player1_id === userId ? 2 : 1;
    const player = one?.[`player${side}`];
    return one && player ? { player, race: one[`player${side}_race`] } : null;
  };
  // Checked in and still unpaired: the captain's own work list for the round
  const needsGame = (playday: number) =>
    players.filter((player) => statusOf(player.id, playday).title === "Checked in" && !seriesOf(player.id, playday)).length;

  // every route answers each row of the player it wrote, so their old rows go
  const write = async (userId: number, key: string, call: () => Promise<Row[]>) => {
    setSaving(key);
    setErrorMessage(null);
    try {
      const answered = await call();
      setRows((was) => [...was.filter((row) => row.user_id !== userId), ...answered]);
    } catch (error: any) {
      console.error("Error saving availability:", error);
      setErrorMessage(error.message || "Error saving availability.");
    } finally {
      setSaving(null);
    }
  };

  const setRound = (userId: number, playday: number, available: boolean | null) =>
    write(userId, `${userId}|${playday}`, () =>
      availabilityStore.setTeamAvailability(teamId, seasonId as number, { user_id: userId, playday, available }),
    );

  // One call writes every round that has not ended; the event owns which those are
  const sitOutAll = (player: Row) => {
    if (!globalThis.confirm(`Sit ${player.name} out of every round that has not ended?`)) return;
    return write(player.id, `${player.id}|all`, () =>
      availabilityStore.setTeamAvailabilityAll(teamId, seasonId as number, { user_id: player.id, available: false }),
    );
  };

  const menuFor = (player: Row, playday: number, trigger: React.ReactElement, body: React.ReactNode) => (
    <RoundMenu
      player={player}
      round={playday}
      status={statusOf(player.id, playday)}
      busy={!!saving}
      trigger={trigger}
      onSet={(available) => setRound(player.id, playday, available)}
      onSitOutAll={() => sitOutAll(player)}
    >
      {body}
    </RoundMenu>
  );

  useEffect(() => {
    // the Guard loads the season list before this page draws, so a null id is a slug of no season
    // same gate as the link that leads here: admins, or the captain of this team
    if (!seasonId || !auth.isCaptainOf(teamId, seasonId)) {
      router.replace("/profile");
      return;
    }
    // the loaders set state, so they run just outside the effect body (react-hooks/set-state-in-effect)
    queueMicrotask(async () => {
      setIsLoading(true);
      try {
        const [answered, seasonMatches, loadedTeam, seasonSeries] = await Promise.all([
          availabilityStore.fetchTeamAvailability(teamId, seasonId),
          matchStore.searchMatchesBySeason(seasonId).catch(() => []),
          teamStore.fetchTeamBySeason(teamId, seasonId),
          seriesStore.searchSeriesBySeason(seasonId).catch(() => []),
          fetchSeason(seasonId),
        ]);
        setRows(answered);
        setMatches(seasonMatches);
        setTeam(loadedTeam);
        setEventSeries(seasonSeries);
        setLoaded(true);
      } catch (error: any) {
        console.error(error);
        setErrorMessage(error.message || "Failed to load the team rounds.");
      } finally {
        setIsLoading(false);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seasonId, teamId]);

  return (
    <div className="p-4">
      {isLoading ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/60">
          <Icon name="mdi-loading" size={64} className="animate-spin text-primary" />
        </div>
      ) : null}

      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
        <h1 className="flex items-center gap-2">
          <Icon name="mdi-calendar-account" />
          Team Rounds
        </h1>
        <Button nativeButton={false} variant="ghost" render={<Link href={`/team/${teamId}/season/${seasonKey}`} />}>
          <Icon name="mdi-arrow-left" />
          Back to team
        </Button>
      </div>
      <div className="mb-4 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        {team ? <TeamName team={team} seasonKey={seasonKey} /> : null}
        {season?.id ? <span>· {eventLabel(season)}</span> : null}
      </div>

      <StatusAlert modelValue={errorMessage} onClose={() => setErrorMessage(null)} />

      <div className="mb-3 flex flex-wrap items-center gap-3">
        {!allRounds && rounds.length ? (
          <Select items={roundItems} value={round} onValueChange={(value) => setShownRound(value as number)}>
            <SelectTrigger aria-label="Round" className="w-full sm:w-80">
              <SelectValue placeholder="Round" />
            </SelectTrigger>
            <SelectContent>
              {roundItems.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}
        <ToggleGroup
          variant="outline"
          spacing={0}
          aria-label="Rounds shown"
          value={[allRounds ? "all" : "one"]}
          onValueChange={(value) => setAllRounds(value[0] === "all")}
        >
          <ToggleGroupItem value="one">One round</ToggleGroupItem>
          <ToggleGroupItem value="all">All rounds</ToggleGroupItem>
        </ToggleGroup>
        {!allRounds && loaded && players.length ? (
          <span className="tnum text-sm text-muted-foreground sm:ml-auto">
            {[checkInCounts(players, rows, round), needsGame(round) ? `${needsGame(round)} needs a game` : ""].filter(Boolean).join(" · ")}
          </span>
        ) : null}
      </div>

      <Card className="card gap-0 py-0">
        <CardTitle className="flex items-center gap-2 bg-primary px-4 py-3 text-on-primary">
          <Icon name="mdi-shield-account" />
          <span>{team?.name}</span>
        </CardTitle>

        {loaded && !allRounds ? (
          <div>
            {players.map((player) => {
              const status = statusOf(player.id, round);
              const note = setByText(rowFor(player.id, round), auth.me?.user?.id);
              const busy = saving === `${player.id}|${round}` || saving === `${player.id}|all`;
              const versus = opponentOf(seriesOf(player.id, round), player.id);
              return (
                <div key={player.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-border px-4 py-2 last:border-b-0">
                  <PlayerName player={player} race={player.signup_race} />
                  {versus ? (
                    <span className="flex items-center gap-1.5 text-sm">
                      <span className="text-muted-foreground">vs</span>
                      <PlayerName player={versus.player} race={versus.race} />
                    </span>
                  ) : (
                    <StatusChip status={status} />
                  )}
                  {note && !versus ? <span className="text-xs text-muted-foreground">{note}</span> : null}
                  <span className="ml-auto">
                    {menuFor(
                      player,
                      round,
                      <Button variant="ghost" size="icon-sm" aria-label={`Check-in menu for ${player.name}`} aria-busy={busy} disabled={!!saving} />,
                      <Icon name={busy ? "mdi-loading mdi-spin" : "mdi-dots-vertical"} />,
                    )}
                  </span>
                </div>
              );
            })}
          </div>
        ) : null}

        {loaded && allRounds ? (
          <div className="table-scroll overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="sticky left-0 z-10 bg-surface">Player</TableHead>
                  {rounds.map((item) => (
                    <TableHead key={item} className="text-center">
                      {/* a phone reads the round number over its dates, one date a line, so three rounds fit 390 px */}
                      {phone ? (
                        <>
                          R{item}
                          <div className="whitespace-pre-line text-xs font-normal text-muted-foreground">{roundLabel(roundOf(item)).replace(" to ", "\n")}</div>
                        </>
                      ) : (
                        <>
                          Round {item}
                          <div className="text-xs font-normal text-muted-foreground">
                            {roundLabel(roundOf(item))}
                            {opponentOfRound(item) ? ` · vs ${opponentOfRound(item).name}` : ""}
                          </div>
                        </>
                      )}
                      {/* the words set the column width, so a phone keeps the count and the tooltip holds the words */}
                      {needsGame(item) ? (
                        <div className="tnum text-xs font-normal text-muted-foreground" title={`${needsGame(item)} needs a game`}>
                          {needsGame(item)}<span className="sr-only min-[600px]:not-sr-only"> needs a game</span>
                        </div>
                      ) : null}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {players.map((player) => (
                  <TableRow key={player.id}>
                    {/* the names stay in place while the rounds scroll under them; the cap sits on the name line, because a table cell ignores max-width */}
                    <TableCell className="sticky left-0 z-10 overflow-hidden bg-surface [&_.name]:truncate [&_.player-name]:max-w-[5.5rem] min-[600px]:[&_.player-name]:max-w-none">
                      <PlayerName player={player} race={phone ? undefined : player.signup_race} mmr={phone ? false : undefined} />
                    </TableCell>
                    {rounds.map((item) => {
                      // the cell reads the short word, so the label carries the state the chip stands for
                      const status = statusOf(player.id, item);
                      const busy = saving === `${player.id}|${item}` || saving === `${player.id}|all`;
                      const versus = opponentOf(seriesOf(player.id, item), player.id);
                      return (
                        <TableCell key={item} className="text-center">
                          {menuFor(
                            player,
                            item,
                            <button
                              type="button"
                              className="cursor-pointer"
                              aria-label={`${player.name}, round ${item}: ${versus ? `vs ${versus.player.name}` : status.title}. Open the check-in menu`}
                              aria-busy={busy}
                              disabled={!!saving}
                            />,
                            versus ? (
                              // the name gives the column its width, so a phone cuts it off
                              <span className="block max-w-[9ch] truncate text-sm min-[600px]:max-w-none" title={versus.player.name}>{versus.player.name}</span>
                            ) : (
                              <StatusChip status={status} short />
                            ),
                          )}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : null}

        {loaded && !players.length && !isLoading ? (
          <div className="p-8 text-center">
            <Icon name="mdi-account-off" size={64} className="text-muted-foreground" />
            <div className="mt-4 text-xl text-muted-foreground">No players on this team this season</div>
          </div>
        ) : null}
      </Card>
    </div>
  );
}

export default TeamRoundsView;
