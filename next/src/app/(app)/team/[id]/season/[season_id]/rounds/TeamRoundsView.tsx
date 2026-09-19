/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Icon } from "@/components/ui/Icon";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PlayerName } from "@/components/PlayerName";
import { StatusAlert } from "@/components/StatusAlert";
import { SM_AND_DOWN, useBreakpoint } from "@/hooks/breakpoint";
import { roundLabel } from "@/helpers/rounds.mjs";
import { useAuth, useAvailabilityStore, useMatchStore, useSeason, useTeamStore } from "@/stores";

type Row = Record<string, any>;

/** The check-in grid of one team: every player against every round of the season.
 *  A captain of the team, or any admin, writes an answer for a player who did not. */
export function TeamRoundsView({ id, seasonKey }: { id: string; seasonKey: string }) {
  const router = useRouter();
  const auth = useAuth();
  const teamStore = useTeamStore();
  const availabilityStore = useAvailabilityStore();
  const matchStore = useMatchStore();
  const { current_season: season, seasonIdOf, fetchSeason } = useSeason();

  const teamId = Number(id);
  const seasonId = seasonIdOf(seasonKey);

  const [team, setTeam] = useState<Row | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  // The grid speaks for the answers it read: without them every cell would read 'No answer' and stay writable
  const [loaded, setLoaded] = useState(false);
  const [matches, setMatches] = useState<Row[]>([]);
  const [saving, setSaving] = useState<string | null>(null);

  // The round labels: the season's round gives the dates, the team's match names the opponent
  const roundOf = (round: number) => season?.rounds?.find((r: Row) => r.playday === round) || { playday: round };
  const matchOfRound = (round: number) => matches.find((m) => m.playday === round && [m.team1_id, m.team2_id].includes(teamId));
  const opponentOfRound = (round: number) => {
    const m = matchOfRound(round);
    return m && (m.team1_id === teamId ? m.team2 : m.team1);
  };

  const players: Row[] = team?.player_by_season?.[seasonId as number] || [];
  const rounds: number[] = Array.from({ length: season?.round_count || 0 }, (_, i) => i + 1);
  // A phone shows one round at a time; wider screens show them all
  const smAndDown = useBreakpoint(SM_AND_DOWN);
  const [shownRound, setShownRound] = useState(1);
  const shownRounds = smAndDown ? rounds.filter((r) => r === shownRound) : rounds;
  // the picker names each round the way the column header does
  const roundItems = rounds.map((round) => ({ value: round, title: `Round ${round} · ${roundLabel(roundOf(round))}` }));

  const rowFor = (userId: number, round: number) => rows.find((row) => row.user_id === userId && row.playday === round);
  const answerFor = (userId: number, round: number): boolean | null => rowFor(userId, round)?.available ?? null;

  const setByLine = (userId: number, round: number) => {
    const row = rowFor(userId, round);
    if (!row) return "No answer";
    if (row.set_by_user_id === userId) return "Player";
    return row.set_by_user_id === auth.me?.user?.id ? "You" : row.set_by_name;
  };

  // the route answers every row of the player it wrote, so their old rows go
  const write = async (userId: number, round: number, available: boolean | null) => {
    const answered = await availabilityStore.setTeamAvailability(teamId, seasonId as number, {
      user_id: userId,
      playday: round,
      available,
    });
    setRows((was) => [...was.filter((row) => row.user_id !== userId), ...answered]);
  };

  // a second click on the state already set clears the round back to no answer
  const setRound = async (userId: number, round: number, want: boolean) => {
    setSaving(`${userId}|${round}`);
    setErrorMessage(null);
    try {
      await write(userId, round, answerFor(userId, round) === want ? null : want);
    } catch (error: any) {
      console.error("Error saving availability:", error);
      setErrorMessage(error.message || "Error saving availability.");
    } finally {
      setSaving(null);
    }
  };

  const outToLastRound = async (userId: number) => {
    setSaving(`${userId}|all`);
    setErrorMessage(null);
    try {
      for (const round of rounds) {
        if (answerFor(userId, round) !== false) await write(userId, round, false);
      }
    } catch (error: any) {
      console.error("Error saving availability:", error);
      setErrorMessage(error.message || "Error saving availability.");
    } finally {
      setSaving(null);
    }
  };

  useEffect(() => {
    if (!seasonId) return;
    // same gate as the link that leads here: admins, or the captain of this team
    if (!auth.isCaptainOf(teamId, seasonId)) {
      router.replace("/profile");
      return;
    }
    // the loaders set state, so they run just outside the effect body (react-hooks/set-state-in-effect)
    queueMicrotask(async () => {
      setIsLoading(true);
      try {
        const [answered, seasonMatches, loadedTeam] = await Promise.all([
          availabilityStore.fetchTeamAvailability(teamId, seasonId),
          matchStore.searchMatchesBySeason(seasonId).catch(() => []),
          teamStore.fetchTeamBySeason(teamId, seasonId),
          fetchSeason(seasonId),
        ]);
        setRows(answered);
        setMatches(seasonMatches);
        setTeam(loadedTeam);
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

      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h1 className="flex items-center gap-2">
          <Icon name="mdi-calendar-account" />
          Team Rounds
        </h1>
        <Button nativeButton={false} variant="ghost" render={<Link href={`/team/${teamId}/season/${seasonKey}`} />}>
          <Icon name="mdi-arrow-left" />
          Back to team
        </Button>
      </div>

      <StatusAlert modelValue={errorMessage} onClose={() => setErrorMessage(null)} />

      <Card className="card gap-0 py-0">
        <CardTitle className="flex items-center gap-2 bg-primary px-4 py-3 text-on-primary">
          <Icon name="mdi-shield-account" />
          <span>{team?.name}</span>
        </CardTitle>

        {smAndDown && loaded ? (
          <div className="m-2">
            <Select items={roundItems.map((item) => ({ value: item.value, label: item.title }))} value={shownRound} onValueChange={(value) => setShownRound(value as number)}>
              <SelectTrigger aria-label="Round" className="w-full">
                <SelectValue placeholder="Round" />
              </SelectTrigger>
              <SelectContent>
                {roundItems.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}

        {loaded ? (
          <div className="table-scroll overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Player</TableHead>
                  {shownRounds.map((round) => (
                    <TableHead key={round} className="text-center">
                      {roundLabel(roundOf(round))}
                      <div className="text-xs font-normal text-muted-foreground">
                        Round {round}
                        {opponentOfRound(round) ? ` · vs ${opponentOfRound(round).name}` : ""}
                      </div>
                    </TableHead>
                  ))}
                  {!smAndDown ? <TableHead /> : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {players.map((player) => (
                  <TableRow key={player.id}>
                    <TableCell>
                      <PlayerName player={player} race={player.signup_race} />
                      {smAndDown ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-1 block"
                          disabled={!!saving || !rounds.length}
                          onClick={() => outToLastRound(player.id)}
                        >
                          Out to round {rounds.length}
                        </Button>
                      ) : null}
                    </TableCell>
                    {shownRounds.map((round) => (
                      <TableCell key={round} className="text-center">
                        <div className="flex justify-center gap-2">
                          <Button
                            size={smAndDown ? "icon" : "icon-xs"}
                            variant={answerFor(player.id, round) === true ? "default" : "outline"}
                            className={answerFor(player.id, round) === true ? "bg-success text-on-success" : "text-success"}
                            aria-label={`${player.name} checked in for round ${round}`}
                            aria-pressed={answerFor(player.id, round) === true}
                            disabled={!!saving}
                            onClick={() => setRound(player.id, round, true)}
                          >
                            <Icon name={saving === `${player.id}|${round}` ? "mdi-loading mdi-spin" : "mdi-check"} />
                          </Button>
                          <Button
                            size={smAndDown ? "icon" : "icon-xs"}
                            variant={answerFor(player.id, round) === false ? "default" : "outline"}
                            className={answerFor(player.id, round) === false ? "bg-error text-on-error" : "text-error"}
                            aria-label={`${player.name} can't play round ${round}`}
                            aria-pressed={answerFor(player.id, round) === false}
                            disabled={!!saving}
                            onClick={() => setRound(player.id, round, false)}
                          >
                            <Icon name={saving === `${player.id}|${round}` ? "mdi-loading mdi-spin" : "mdi-close"} />
                          </Button>
                        </div>
                        <div className="text-xs text-muted-foreground">{setByLine(player.id, round)}</div>
                      </TableCell>
                    ))}
                    {!smAndDown ? (
                      <TableCell>
                        <Button variant="outline" size="sm" disabled={!!saving || !rounds.length} onClick={() => outToLastRound(player.id)}>
                          Out to round {rounds.length}
                        </Button>
                      </TableCell>
                    ) : null}
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
