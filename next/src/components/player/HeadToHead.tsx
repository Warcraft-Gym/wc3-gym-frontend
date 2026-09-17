"use client";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardTitle } from "@/components/ui/card";
import { Icon } from "@/components/ui/Icon";
import { Progress } from "@/components/ui/progress";
import { GroupedTable, type GroupedColumn } from "@/components/GroupedTable";
import { PlayerName } from "@/components/PlayerName";
import { RaceIcon } from "@/components/RaceIcon";
import { StatusAlert } from "@/components/StatusAlert";
import { usePlayerStore } from "@/stores";
import { formatDateTime } from "@/helpers/datetime";
import { eventLabel, EVENT_KINDS, titleOf } from "@/helpers/event-labels.mjs";
import { opponentRows } from "@/helpers/head-to-head.mjs";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>;
type Group = { key: number; label: string; row: Row };

// A GNL season needs no mark; every other kind of event wears its own
const KIND_ICON: Record<string, string> = { cup: "mdi-tournament", koth: "mdi-crown", signup: "mdi-clipboard-text-outline" };

// games and events cost the most width, so a phone drops them first
const columns: GroupedColumn[] = [
  { key: "opponent", title: "Opponent" },
  { key: "record", title: "Series", width: "200px" },
  { key: "games", title: "Games", phone: false, width: "80px" },
  { key: "matchups", title: "Matchups" },
  { key: "events", title: "Events", phone: false },
  { key: "when", title: "Last met" },
];

const CAPTION = "text-xs text-muted-foreground";
const PHONE_HIDDEN = "hidden min-[960px]:table-cell";
const CELL = "p-2 align-middle";
// The tonal chip of one meeting: the win or the loss token over a wash of itself
const recordTone = (won: number, lost: number) => (won > lost ? "bg-win/12 text-win" : won < lost ? "bg-loss/12 text-loss" : "bg-muted text-foreground");

function Matchup({ mine, theirs, count = 1 }: { mine: string; theirs: string; count?: number }) {
  return (
    <span className="inline-flex items-center gap-[3px]">
      <RaceIcon raceIdentifier={mine} size="1.1em" />
      <span className={CAPTION}>v</span>
      <RaceIcon raceIdentifier={theirs} size="1.1em" />
      {count > 1 ? <span className={CAPTION}>×{count}</span> : null}
    </span>
  );
}

/** Every opponent this player has met, in events of every kind, and every meeting behind the record */
export function HeadToHead({ playerId }: { playerId: number }) {
  const playerStore = usePlayerStore();
  const [opponents, setOpponents] = useState<Row[]>([]);
  const [loading, setLoading] = useState(!!playerId);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  // Another player starts from an empty card
  const [shown, setShown] = useState(playerId);
  if (shown !== playerId) {
    setShown(playerId);
    setOpponents([]);
    setErrorMessage(null);
    setLoading(!!playerId);
  }

  const groups: Group[] = opponentRows(opponents).map((row: Row) => ({ key: row.opponent.id, label: `Meetings with ${row.opponent.name}`, row }));

  // Every event of every kind the player met anyone in
  const eventCount = new Set(opponents.flatMap((o) => (o.meetings ?? []).map((m: Row) => m.season_id))).size;

  // read once per player; a failed read says so rather than leaving an empty card
  useEffect(() => {
    if (!playerId) return;
    let live = true;
    playerStore
      .playerHistory(playerId)
      .then((history: Row) => live && setOpponents(history?.opponents ?? []))
      .catch(() => live && setErrorMessage("Could not load the head to head record."))
      .finally(() => live && setLoading(false));
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerId]);

  return (
    <Card className="card mt-6 gap-0 py-0">
      <CardTitle className="flex flex-wrap items-center justify-between gap-2 bg-primary px-4 py-3 text-on-primary">
        <div className="flex items-center gap-2">
          <Icon name="mdi-sword-cross" />
          <span>Head to head</span>
        </div>
        {opponents.length ? (
          <Badge variant="outline" className="h-auto whitespace-normal border-current text-on-primary">
            {opponents.length} player{opponents.length === 1 ? "" : "s"} faced in {eventCount} event{eventCount === 1 ? "" : "s"}, lifetime
          </Badge>
        ) : null}
      </CardTitle>
      {loading ? <Progress value={null} /> : null}
      <StatusAlert modelValue={errorMessage} onClose={() => setErrorMessage(null)} className="mx-4 mt-3" />
      {/* no race beside the name: a player is not one race, the matchups column carries the races per meeting */}
      {!errorMessage && !loading ? (
        <GroupedTable
          columns={columns}
          groups={groups}
          empty="No series played yet."
          group={({ group }) => (
            <>
              <td className={CELL}>
                <PlayerName player={group.row.opponent} />
              </td>
              <td className={CELL}>
                <div className="flex items-center gap-2">
                  {/* one thin stacked bar per opponent: won, a surface gap, then lost */}
                  <span className="hidden h-2 w-[120px] flex-none gap-0.5 min-[960px]:flex" aria-hidden="true">
                    {group.row.record.won ? <span className="min-w-1 rounded bg-win" style={{ flexGrow: group.row.record.won }} /> : null}
                    {group.row.record.lost ? <span className="min-w-1 rounded bg-loss" style={{ flexGrow: group.row.record.lost }} /> : null}
                  </span>
                  <span className="tnum" title={`${group.row.record.won} won, ${group.row.record.lost} lost`}>
                    {group.row.record.won}–{group.row.record.lost}
                  </span>
                </div>
              </td>
              <td className={`${CELL} ${CAPTION} ${PHONE_HIDDEN}`}>
                {group.row.games.mine}–{group.row.games.theirs}
              </td>
              <td className={CELL}>
                <div className="flex flex-wrap items-center gap-2">
                  {group.row.matchups.map((matchup: Row) => (
                    <Matchup key={`${matchup.mine}-${matchup.theirs}`} mine={matchup.mine} theirs={matchup.theirs} count={matchup.count} />
                  ))}
                </div>
              </td>
              <td className={`${CELL} ${PHONE_HIDDEN}`}>
                <div className="flex flex-wrap gap-1">
                  {group.row.events.map((event: Row) => (
                    <Badge key={event.id} variant="outline" title={titleOf(EVENT_KINDS, event.kind)}>
                      {KIND_ICON[event.kind] ? <Icon name={KIND_ICON[event.kind]} size={12} /> : null}
                      {event.name}
                      {event.count > 1 ? <>&nbsp;×{event.count}</> : null}
                    </Badge>
                  ))}
                </div>
              </td>
              <td className={`${CELL} ${CAPTION}`}>{group.row.lastMet}</td>
            </>
          )}
          rows={({ group }) =>
            group.row.opponent.meetings.map((meeting: Row) => (
              <tr key={meeting.series_id} className="detail-row border-b">
                <td />
                <td className={`${CELL} text-xs`}>
                  {KIND_ICON[meeting.kind] ? <Icon name={KIND_ICON[meeting.kind]} size={12} className="mr-1" title={titleOf(EVENT_KINDS, meeting.kind)} /> : null}
                  {eventLabel(meeting)}
                  {meeting.playday ? `, round ${meeting.playday}` : null}
                </td>
                <td className={CELL}>
                  {meeting.my_score != null && meeting.their_score != null ? (
                    <>
                      <Badge className={recordTone(meeting.my_score, meeting.their_score)}>
                        {meeting.my_score}–{meeting.their_score}
                      </Badge>
                      <span className={`${CAPTION} ml-1`}>games</span>
                    </>
                  ) : (
                    <span className={CAPTION}>not played yet</span>
                  )}
                </td>
                <td className={PHONE_HIDDEN} />
                <td className={CELL}>{meeting.my_race && meeting.their_race ? <Matchup mine={meeting.my_race} theirs={meeting.their_race} /> : null}</td>
                <td className={PHONE_HIDDEN} />
                <td className={`${CELL} ${CAPTION}`}>
                  {meeting.maps?.length ? `${meeting.maps.join(", ")} · ` : null}
                  {meeting.date_time ? formatDateTime(meeting.date_time) : ""}
                </td>
              </tr>
            ))
          }
        />
      ) : null}
    </Card>
  );
}

export default HeadToHead;
