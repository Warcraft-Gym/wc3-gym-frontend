"use client";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/PageHeader";
import { RaceIcon } from "@/components/RaceIcon";
import { StatusAlert } from "@/components/StatusAlert";
import { raceWrapper } from "@/helpers/races.js";

const W3C_MATCH_API = "https://website-backend.w3champions.com/api/matches/search";

// W3C API returns race as a number. Mapping to display name.
// Confirmed from match data (heroes played):
//   0 = Random (selected race), 1 = Human, 2 = Orc, 4 = Night Elf, 8 = Undead, 16/32 = Random
const W3C_RACE_NAMES: Record<string | number, string> = {
  1: "Human",
  2: "Orc",
  4: "Night Elf",
  8: "Undead",
  16: "Random",
  32: "Random",
  // String variants returned by some API versions
  "HUMAN": "Human",
  "ORC": "Orc",
  "NIGHTELF": "Night Elf",
  "NIGHT_ELF": "Night Elf",
  "UNDEAD": "Undead",
  "RANDOM": "Random",
};

// Map from display name to RaceIcon identifier
const raceIdMap: Record<string, string> = Object.fromEntries(raceWrapper.races.map((race: { id: string; name: string }) => [race.name, race.id]));

// Seasons to offer — show 1 through 35
const seasonOptions = Array.from({ length: 35 }, (_, i) => 35 - i);

type Matchup = { wins: number; losses: number };
type RaceRow = { wins: number; losses: number; matchups: Record<string, Matchup> };
type Breakdown = Record<string, RaceRow>;
type W3cPlayer = { battleTag?: string; race?: number | string; rndRace?: number | null };
type W3cTeam = { won?: boolean; players?: W3cPlayer[] };
type W3cMatch = { gameMode?: number; teams?: W3cTeam[] };

function raceName(raceValue: number | string | undefined) {
  return raceValue == null ? "Random" : W3C_RACE_NAMES[raceValue] ?? "Random";
}

// Sort matchups by total games descending
function sortedMatchups(matchups: Record<string, Matchup>) {
  return Object.entries(matchups).sort(([, a], [, b]) => (b.wins + b.losses) - (a.wins + a.losses));
}

async function fetchPage(tag: string, season: number, offset: number) {
  const params = new URLSearchParams({
    playerId: tag,
    gateway: "20",
    offset: String(offset),
    pageSize: "50",
    season: String(season),
    playerIncludeRandom: "true",
    opponentIncludeRandom: "true",
  });
  const res = await fetch(`${W3C_MATCH_API}?${params}`);
  if (!res.ok) throw new Error(`W3C API responded with ${res.status} ${res.statusText}`);
  return res.json() as Promise<{ matches?: W3cMatch[]; count?: number; total?: number }>;
}

function processMatches(matches: W3cMatch[], tagLower: string, breakdown: Breakdown) {
  for (const match of matches) {
    if (!Array.isArray(match.teams) || match.teams.length < 2) continue;

    // Only 1v1 solo games
    if (match.gameMode !== 1) continue;

    let playerTeam: W3cTeam | null = null;
    let opponentTeam: W3cTeam | null = null;

    for (const team of match.teams) {
      const hasPlayer = team.players?.some((p) =>
        p.battleTag?.toLowerCase() === tagLower ||
        p.battleTag?.toLowerCase().startsWith(tagLower.split("#")[0].toLowerCase() + "#")
      );
      if (hasPlayer) playerTeam = team;
      else opponentTeam = team;
    }

    if (!playerTeam || !opponentTeam) continue;

    const playerEntry = playerTeam.players?.[0];
    const opponentEntry = opponentTeam.players?.[0];
    if (!playerEntry || !opponentEntry) continue;

    // Only process Random games (race === 0)
    if (playerEntry.race !== 0) continue;

    // Use rndRace (the actual drawn race) as the grouping key.
    // rndRace may be 0/null when the API doesn't report the drawn race (common for losses).
    const drawnRace = (playerEntry.rndRace != null && playerEntry.rndRace !== 0)
      ? raceName(playerEntry.rndRace)
      : "Random=?";
    const oppRace = raceName(opponentEntry.race);
    const won = playerTeam.won === true;

    if (!breakdown[drawnRace]) {
      breakdown[drawnRace] = { wins: 0, losses: 0, matchups: {} };
    }
    if (!breakdown[drawnRace].matchups[oppRace]) {
      breakdown[drawnRace].matchups[oppRace] = { wins: 0, losses: 0 };
    }

    breakdown[drawnRace].wins += won ? 1 : 0;
    breakdown[drawnRace].losses += won ? 0 : 1;
    breakdown[drawnRace].matchups[oppRace].wins += won ? 1 : 0;
    breakdown[drawnRace].matchups[oppRace].losses += won ? 0 : 1;
  }
}

/** The drawn race a Random player rolled, against the race he met, read from the W3Champions match API. */
export function RandomStatsView() {
  const [battleTag, setBattleTag] = useState("");
  const [selectedSeasons, setSelectedSeasons] = useState<number[]>([25, 26]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [resolvedTag, setResolvedTag] = useState("");

  // raceBreakdown: { 'Human': { wins, losses, matchups: { 'Orc': { wins, losses }, ... } }, ... }
  const [raceBreakdown, setRaceBreakdown] = useState<Breakdown | null>(null);

  const canSearch = battleTag.trim().length > 0 && selectedSeasons.length > 0;
  const rows = raceBreakdown ? Object.entries(raceBreakdown) : [];
  const hasResults = rows.length > 0;
  const totalGames = rows.reduce((s, [, r]) => s + r.wins + r.losses, 0);
  const totalWins = rows.reduce((s, [, r]) => s + r.wins, 0);
  const totalLosses = totalGames - totalWins;
  const overallWinRate = totalGames === 0 ? 0 : Math.round(totalWins / totalGames * 100);

  const loadStats = async () => {
    if (!canSearch) return;

    setErrorMessage(null);
    setRaceBreakdown(null);
    setHasSearched(true);
    setIsLoading(true);

    const tag = battleTag.trim();
    setResolvedTag(tag);
    const tagLower = tag.toLowerCase();
    const breakdown: Breakdown = {};

    try {
      for (const season of [...selectedSeasons].sort((a, b) => a - b)) {
        setLoadingMessage(`Fetching season ${season} — page 1...`);

        const firstPage = await fetchPage(tag, season, 0);
        const total = firstPage.count ?? firstPage.total ?? (firstPage.matches?.length ?? 0);
        processMatches(firstPage.matches ?? [], tagLower, breakdown);

        const totalPages = Math.ceil(total / 50);
        for (let page = 1; page < totalPages; page++) {
          setLoadingMessage(`Fetching season ${season} — page ${page + 1} of ${totalPages}...`);
          const data = await fetchPage(tag, season, page * 50);
          processMatches(data.matches ?? [], tagLower, breakdown);
        }
      }

      // Sort races by total games descending
      setRaceBreakdown(Object.fromEntries(
        Object.entries(breakdown).sort(([, a], [, b]) => (b.wins + b.losses) - (a.wins + a.losses))
      ));
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      if (message.includes("Failed to fetch") || message.includes("NetworkError")) {
        setErrorMessage("Network error — the W3C Champions API may be unreachable or blocking cross-origin requests.");
      } else {
        setErrorMessage(`Failed to load stats: ${message}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-[960px] p-6">
      <PageHeader
        title={<><Icon name="mdi-dice-multiple" className="mr-3 text-primary" />Random Stats Helper</>}
        lead="Breakdown of drawn race vs opponent race for Random games only"
      />

      {/* Search form */}
      <Card className="card mb-6 gap-0 py-0">
        <CardHeader className="bg-primary p-4">
          <CardTitle className="text-on-primary">Player &amp; seasons</CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="grid items-start gap-4 md:grid-cols-12">
            <Field className="md:col-span-5" label="BattleTag  (e.g. Player#1234)" hint="Exact BattleTag as shown on W3Champions" htmlFor="battle-tag">
              <InputGroup>
                <InputGroupAddon>
                  <Icon name="mdi-account" />
                </InputGroupAddon>
                <InputGroupInput
                  id="battle-tag"
                  value={battleTag}
                  onChange={(e) => setBattleTag(e.target.value)}
                  onKeyUp={(e) => { if (e.key === "Enter") loadStats(); }}
                />
              </InputGroup>
            </Field>

            <Field className="md:col-span-5" label="W3C seasons" hint="Select one or more seasons to analyse">
              {/* one open list, so a season leaves the choice the same way it joined it */}
              <Select multiple value={selectedSeasons} onValueChange={setSelectedSeasons}>
                <SelectTrigger className="h-auto min-h-8 w-full py-1.5">
                  <SelectValue>
                    {(seasons: number[]) => (
                      <span className="flex flex-wrap gap-1">
                        {seasons.map((season) => <Badge key={season} variant="outline" className="tnum">{season}</Badge>)}
                      </span>
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {seasonOptions.map((season) => <SelectItem key={season} value={season}>{season}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>

            <div className="md:col-span-2 md:pt-6">
              <Button className="w-full" disabled={!canSearch || isLoading} onClick={loadStats}>
                <Icon name={isLoading ? "mdi-loading" : "mdi-chart-bar"} className={isLoading ? "mr-2 animate-spin" : "mr-2"} />
                Analyse
              </Button>
            </div>
          </div>

          <StatusAlert modelValue={errorMessage} className="mt-4" onClose={() => setErrorMessage(null)} />
        </CardContent>
      </Card>

      {/* Loading progress */}
      {isLoading ? (
        <Card className="card mb-6">
          <CardContent className="py-4">
            <div className="mb-3 text-sm">{loadingMessage}</div>
            <Progress
              value={null}
              className="[&_[data-slot=progress-indicator]]:w-full [&_[data-slot=progress-indicator]]:animate-pulse [&_[data-slot=progress-track]]:h-1.5"
            />
          </CardContent>
        </Card>
      ) : null}

      {/* Overall summary */}
      {hasResults && !isLoading ? (
        <Card className="card mb-6 gap-0 py-0">
          <CardHeader className="bg-primary p-4">
            <CardTitle className="text-on-primary">
              Summary — {resolvedTag}
              <span className="ml-2 text-sm opacity-80">(seasons {selectedSeasons.join(", ")})</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div className="text-center">
                <div className="text-2xl font-bold tnum">{totalGames}</div>
                <div className="text-xs text-muted-foreground">Total games</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold tnum text-win">{totalWins}</div>
                <div className="text-xs text-muted-foreground">Wins</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold tnum text-loss">{totalLosses}</div>
                <div className="text-xs text-muted-foreground">Losses</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold tnum">{overallWinRate}%</div>
                <div className="text-xs text-muted-foreground">Win rate</div>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* Per-race breakdown cards */}
      {hasResults && !isLoading ? rows.map(([raceName, data]) => (
        <Card key={raceName} className="card mb-5 gap-0 py-0">
          <CardHeader className="bg-primary p-4">
            <CardTitle className="flex flex-wrap items-center gap-1 text-on-primary">
              <RaceIcon raceIdentifier={raceIdMap[raceName]} />
              <span className="mr-2">Playing as {raceName}</span>
              <span className="flex-1" />
              {/* outlined, not tonal: a tonal wash over the bronze band leaves its own text at 4.02:1 */}
              <Badge variant="outline" className="mr-2 border-on-primary text-on-primary">
                {data.wins + data.losses} games
              </Badge>
              <Badge variant="outline" className="border-on-primary text-on-primary">
                {Math.round(data.wins / (data.wins + data.losses) * 100)}% WR
              </Badge>
            </CardTitle>
          </CardHeader>

          <Table className="table-scroll">
            <TableHeader>
              <TableRow>
                <TableHead className="text-left">Opponent race</TableHead>
                <TableHead className="text-right text-win">Wins</TableHead>
                <TableHead className="text-right text-loss">Losses</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="min-w-[90px] text-right">Win %</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedMatchups(data.matchups).map(([oppRace, matchup]) => (
                <TableRow key={oppRace}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <RaceIcon raceIdentifier={raceIdMap[oppRace]} />
                      <span>{oppRace}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-medium tnum text-win">{matchup.wins}</TableCell>
                  <TableCell className="text-right font-medium tnum text-loss">{matchup.losses}</TableCell>
                  <TableCell className="text-right tnum">{matchup.wins + matchup.losses}</TableCell>
                  <TableCell className="text-right">
                    <Badge variant="outline" className="tnum">
                      {Math.round(matchup.wins / (matchup.wins + matchup.losses) * 100)}%
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            {/* Row totals */}
            <TableFooter>
              <TableRow className="border-t-2">
                <TableCell className="font-bold">Total</TableCell>
                <TableCell className="text-right font-bold tnum text-win">{data.wins}</TableCell>
                <TableCell className="text-right font-bold tnum text-loss">{data.losses}</TableCell>
                <TableCell className="text-right font-bold tnum">{data.wins + data.losses}</TableCell>
                <TableCell className="text-right">
                  <Badge variant="outline" className="tnum">
                    {Math.round(data.wins / (data.wins + data.losses) * 100)}%
                  </Badge>
                </TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </Card>
      )) : null}

      {/* No data */}
      {hasSearched && !isLoading && !hasResults ? (
        <StatusAlert
          type="info"
          modelValue={`No Random games found for ${resolvedTag} in the selected seasons. Make sure the BattleTag is correct and the player has Random games in those seasons.`}
        />
      ) : null}
    </div>
  );
}

export default RandomStatsView;
