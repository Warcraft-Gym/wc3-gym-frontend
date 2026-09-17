"use client";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { HeadToHead } from "@/components/player/HeadToHead";
import { PlayerSeasons } from "@/components/player/PlayerSeasons";
import { RoundCards } from "@/components/player/RoundCards";
import { ScheduleDialog, type ScheduleDialogHandle } from "@/components/player/ScheduleDialog";

// Sample rows for the kit section, shaped like the rows the helper tests feed these components.
const kitPlayer = {
  id: 1,
  name: "EAShibby",
  battleTag: "EAShibby#2644",
  country: "DE",
  signup_seasons: [{ id: 4, signup_race: "UD" }],
  trophies: [{ season_id: 4 }],
};
const kitOpponent = { id: 52, name: "Peterian", country: "DE", timezone: "America/New_York", signup_race: "HU" };
const kitSeason = {
  id: 4,
  checkin_days: 7,
  rounds: [
    { playday: 1, start_date: "2026-09-13", end_date: "2026-09-19" },
    { playday: 2, start_date: "2026-09-20", end_date: "2026-09-26" },
    { playday: 3, start_date: "2026-09-27", end_date: "2026-10-03" },
  ],
};
const kitSeries = [
  {
    id: 7,
    player1_id: 1,
    player2_id: 52,
    player2: kitOpponent,
    player2_race: "OC",
    player1_score: 2,
    player2_score: 1,
    host_player_id: 1,
    date_time: "2026-09-15T18:00:00Z",
    player1_pick_map: "Concealed Hill",
    player2_pick_map: "Last Refuge",
    match: { playday: 1, fixed_map: { name: "Twisted Meadows" } },
  },
];
const kitAnswers = [{ playday: 2, available: false }];

/** Every player history component with sample props, so the render gate can see each one draw. */
export function PlayerHistoryKit() {
  const schedule = useRef<ScheduleDialogHandle>(null);
  const [saved, setSaved] = useState("");

  return (
    <div className="mt-8 flex flex-col gap-8">
      <h2>Player history</h2>

      <section>
        <h3>PlayerSeasons</h3>
        <PlayerSeasons player={kitPlayer} />
      </section>

      <section>
        <h3>HeadToHead</h3>
        <HeadToHead playerId={kitPlayer.id} />
      </section>

      <section>
        <h3>RoundCards</h3>
        <RoundCards
          player={kitPlayer}
          season={kitSeason}
          series={kitSeries}
          teamId={18}
          answers={kitAnswers}
          seriesActions={(series) => (
            <Button className="mt-2" size="sm" variant="outline" onClick={() => schedule.current?.open(series)}>
              Edit schedule
            </Button>
          )}
          question={(card) => <div className="mt-2 text-sm">Can you play round {card.playday}?</div>}
        />
      </section>

      <section>
        <h3>ScheduleDialog</h3>
        <Button variant="outline" onClick={() => schedule.current?.open(kitSeries[0])}>
          Open the schedule dialog
        </Button>
        {saved ? <div className="mt-2 text-sm">{saved}</div> : null}
        <ScheduleDialog ref={schedule} playerId={kitPlayer.id} onSaved={setSaved} />
      </section>
    </div>
  );
}

export default PlayerHistoryKit;
