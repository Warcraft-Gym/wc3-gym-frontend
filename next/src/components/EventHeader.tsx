"use client";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/Icon";
import { toneClass } from "@/components/ui/tone";
import { dateRange, eventLabel, STATE_COLOR, STATE_LABEL, stateOf } from "@/helpers/event-labels.mjs";

/* eslint-disable @typescript-eslint/no-explicit-any */
type EventRow = Record<string, any>;

// The helpers are plain JS, so their defaults type the parameters; the seam names the real shapes.
const label_ = eventLabel as (event: EventRow, league?: EventRow | null) => string;
const stateColor = STATE_COLOR as Record<string, string>;
const stateLabel = STATE_LABEL as Record<string, string>;

/** The top of an event page: the league it is a run of, its name and state, when it runs,
 *  where it is played and the links to read it or watch it. */
export function EventHeader({ event, league = null }: { event: EventRow; league?: EventRow | null }) {
  // The league beside the name, dropped when the event name already repeats it
  const label = label_(event, league);
  const state = stateOf(event);
  const when = dateRange(event);
  // One gap for every icon-and-text pair, and one nudge that centres the icon on the x-height
  const link = "inline-flex items-center gap-1.5 whitespace-nowrap text-inherit no-underline [&>.mdi]:-translate-y-[3%]";
  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <h1>{label}</h1>
        {state ? <Badge className={toneClass(stateColor[state])}>{stateLabel[state] || state}</Badge> : null}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1">
        {when ? (
          <span className={`${link} text-muted-foreground`}>
            <Icon name="mdi-calendar-month" size={18} />
            <span>{when}</span>
          </span>
        ) : null}
        {event.region ? (
          <span className={`${link} text-muted-foreground`}>
            <Icon name="mdi-earth" size={18} />
            <span>{event.region}</span>
          </span>
        ) : null}
        {event.page_url ? (
          <a className={`${link} hover:[&>span]:underline`} href={event.page_url} target="_blank" rel="noopener noreferrer">
            <Icon name="mdi-open-in-new" size={18} />
            <span>Page</span>
          </a>
        ) : null}
        {event.stream_url ? (
          <a className={`${link} hover:[&>span]:underline`} href={event.stream_url} target="_blank" rel="noopener noreferrer">
            <Icon name="mdi-twitch" size={18} />
            <span>Stream</span>
          </a>
        ) : null}
      </div>
    </>
  );
}

export default EventHeader;
