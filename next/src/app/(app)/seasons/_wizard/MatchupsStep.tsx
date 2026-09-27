/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/Icon";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { StatusAlert } from "@/components/StatusAlert";
import { roundsNeeded, weekText } from "@/helpers/season-wizard.mjs";
import { showDefaultTeamImage, teamImageUrl } from "@/helpers/team-image";

type Row = Record<string, any>;
export type Week = { playday: number; pairs: [number, number][]; rest: number | null };

/** The season's matchups drawn at random: every ticked team meets every other team once, one match
 *  a week. One block per round with its pairs and the team that rests; a new draw replaces them all. */
export function MatchupsStep({
  teams,
  teamIds,
  roundCount,
  startDate,
  rounds,
  weeks,
  hasMatchups,
  saved,
  onDraw,
  onClear,
  onSetRounds,
}: {
  teams: Row[];
  teamIds: number[];
  roundCount: number;
  startDate: string | null;
  rounds: Row[];
  // the drawn weeks, or null while the switch is off
  weeks: Week[] | null;
  // the season stores matches already, so a draw would add a second schedule
  hasMatchups: boolean;
  // how many drawn matchups a save that failed half way wrote; the draw is fixed from then on
  saved: number;
  onDraw: () => void;
  onClear: () => void;
  onSetRounds: (count: number) => void;
}) {
  if (hasMatchups) {
    return <p className="py-6 text-center text-muted-foreground">This season has matchups already. Add or change them on the season page.</p>;
  }

  const needed = roundsNeeded(teamIds.length);
  const team = (id: number | null) => teams.find((row) => row.id === id);
  const total = weeks?.reduce((sum, week) => sum + week.pairs.length, 0) ?? 0;

  const teamCell = (id: number, align: "start" | "end") => {
    const row = team(id);
    return (
      <span className={`flex min-w-0 flex-1 items-center gap-2 ${align === "end" ? "flex-row-reverse text-right" : ""}`}>
        <img src={teamImageUrl(row)} alt="" onError={showDefaultTeamImage} className="size-6 shrink-0 rounded-full object-cover" />
        <span className="truncate">{row?.name ?? "Unknown team"}</span>
      </span>
    );
  };

  return (
    <div>
      <div className="mb-3 flex flex-col gap-1.5">
        <Label className="flex items-center gap-2">
          <Switch checked={!!weeks} disabled={saved > 0} onCheckedChange={(checked) => (checked ? onDraw() : onClear())} />
          Draw the matchups at random
        </Label>
        <p className="text-xs text-muted-foreground">Every team plays every other team once, one match a week.</p>
      </div>

      {weeks ? (
        <>
          {teamIds.length >= 2 && roundCount < needed ? (
            <div className="mb-3">
              <StatusAlert
                type="warning"
                closable={false}
                className="mb-2"
                modelValue={`${teamIds.length} teams need ${needed} rounds to play each other once. The season has ${roundCount}.`}
              />
              <Button onClick={() => onSetRounds(needed)}>Set the season to {needed} rounds</Button>
            </div>
          ) : null}
          {saved > 0 ? (
            <StatusAlert type="info" closable={false} className="mb-3" modelValue={`${saved} of ${total} matchups are saved. Press the button again to save the rest.`} />
          ) : null}

          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="flex-1 text-muted-foreground">
              {total} {total === 1 ? "match" : "matches"} over {weeks.length} {weeks.length === 1 ? "round" : "rounds"}
              {roundCount > weeks.length ? `; rounds ${weeks.length + 1} to ${roundCount} stay empty` : ""}
            </span>
            <Button variant="outline" disabled={saved > 0} onClick={onDraw}>
              <Icon name="mdi-shuffle-variant" />
              Draw again
            </Button>
          </div>

          <ul className="divide-y rounded-lg border">
            {weeks.map((week) => (
              <li key={week.playday} className="flex flex-col gap-2 p-3 md:flex-row">
                <div className="w-40 shrink-0">
                  <div className="font-medium">Round {week.playday}</div>
                  <div className="text-xs text-muted-foreground">{weekText(rounds, startDate, week.playday)}</div>
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                  {week.pairs.map(([a, b]) => (
                    <div key={`${a}-${b}`} className="flex items-center gap-2">
                      {teamCell(a, "start")}
                      <span className="shrink-0 text-xs text-muted-foreground">vs</span>
                      {teamCell(b, "end")}
                    </div>
                  ))}
                  {week.rest != null ? <div className="text-xs text-muted-foreground">No match this week: {team(week.rest)?.name ?? "Unknown team"}</div> : null}
                </div>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </div>
  );
}

export default MatchupsStep;
