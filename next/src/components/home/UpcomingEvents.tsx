"use client";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/Icon";
import { toneClass } from "@/components/ui/tone";
import { HomePanel, ROW } from "@/components/home/HomePanel";
import { RaceIcon } from "@/components/RaceIcon";
import { raceWrapper } from "@/helpers/races.js";
import { cn } from "@/lib/utils";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Card = Record<string, any>;

const raceName = (race: string) => raceWrapper.getRaceObject(race)?.name || race;

/** The upcoming events of every league the member cannot act on now, in the order the events start.
 *  No row carries a button: an event that takes an entry, a withdraw or a check-in sits in Open signups. */
export function UpcomingEvents({ cards, order }: { cards: Card[]; order: number }) {
  return (
    <HomePanel icon="mdi-calendar-outline" title="Upcoming events" order={order}>
      {cards.map((card) => (
        // below 600 px the chip drops to the left of the play dates
        <div key={card.key} className={cn(ROW, "flex flex-wrap items-center gap-x-2 gap-y-1")}>
          <span className="order-1 min-w-0 flex-1 font-medium">{card.name}</span>
          {card.chip ? (
            <Badge className={cn(toneClass("success"), "order-4 min-[600px]:order-2")}>
              <Icon name="mdi-check" />
              {card.chip}
              {/* every race the member entered rides the one chip, so a two-race entry reads both */}
              {(card.races ?? []).map((race: string) => (
                <span key={race} className="inline-flex items-center gap-1">
                  <RaceIcon raceIdentifier={race} size="1.2em" />
                  {raceName(race)}
                </span>
              ))}
            </Badge>
          ) : null}
          <span className="order-3 basis-full min-[600px]:hidden" />
          {card.dates ? <div className="tnum order-5 text-sm text-muted-foreground min-[600px]:basis-full">plays {card.dates}</div> : null}
        </div>
      ))}
    </HomePanel>
  );
}
