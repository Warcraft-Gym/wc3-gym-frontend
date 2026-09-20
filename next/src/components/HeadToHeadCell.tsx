"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/Icon";
import { RaceIcon } from "@/components/RaceIcon";
import { record } from "@/helpers/figures.mjs";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>;

/** The head to head of a pairing: the score in pairing order, with the meetings read on demand.
 *  `pair` carries wins, losses and last_event; the caller hands the meetings over when they open. */
export function HeadToHeadCell({ pair, onMeetings }: { pair?: Row; onMeetings: () => Promise<Row[]> }) {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [open, setOpen] = useState(false);
  const score = record(pair?.wins, pair?.losses);
  const show = async () => {
    setOpen((was) => !was);
    if (rows) return;
    setRows(await onMeetings().catch(() => []));
  };
  if (!score) return <span className="text-muted-foreground">no series</span>;
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      <span className="tnum">{score}</span>
      {pair?.last_event ? <span className="text-xs text-muted-foreground">last met {pair.last_event}</span> : null}
      <Button variant="ghost" size="sm" className="text-primary-text" onClick={show} aria-expanded={open}>
        <Icon name={open ? "mdi-chevron-up" : "mdi-chevron-down"} />
        Meetings
      </Button>
      {open ? (
        <span className="block w-full">
          {rows === null ? (
            <span className="text-xs text-muted-foreground">Reading the meetings…</span>
          ) : rows.length === 0 ? (
            <span className="text-xs text-muted-foreground">No meeting on WC3 Gym yet</span>
          ) : (
            rows.map((meeting) => (
              <span key={meeting.series_id} className="flex items-center gap-2 text-xs">
                <span className="tnum">
                  {meeting.player1_score} – {meeting.player2_score}
                </span>
                {meeting.player1_race ? <RaceIcon raceIdentifier={meeting.player1_race} size="1.1em" /> : null}
                <span className="text-muted-foreground">v</span>
                {meeting.player2_race ? <RaceIcon raceIdentifier={meeting.player2_race} size="1.1em" /> : null}
                <span className="text-muted-foreground">{meeting.event_label || "—"}</span>
              </span>
            ))
          )}
        </span>
      ) : null}
    </span>
  );
}

export default HeadToHeadCell;
