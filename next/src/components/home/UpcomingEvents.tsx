"use client";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/Icon";
import { toneClass } from "@/components/ui/tone";
import { HomePanel, ROW, SkeletonRows } from "@/components/home/HomePanel";
import { RaceIcon } from "@/components/RaceIcon";
import { raceWrapper } from "@/helpers/races.js";
import { cn } from "@/lib/utils";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Card = Record<string, any>;

const raceName = (race: string) => raceWrapper.getRaceObject(race)?.name || race;

/** The upcoming events of every league, in the order the events start. Every choice of equal
 *  standing takes the same outlined button, never a louder one. */
export function UpcomingEvents({
  cards,
  acting,
  loading,
  order,
  onAct,
}: {
  cards: Card[];
  acting: string | null;
  loading: boolean;
  order: number;
  onAct: (card: Card) => void;
}) {
  return (
    <HomePanel icon="mdi-calendar-outline" title="Upcoming events" order={order}>
      {loading ? (
        <SkeletonRows rows={3} />
      ) : cards.length ? (
        cards.map((card) => (
          // below 600 px the chip drops to the left of the play dates and the button keeps the name's line
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
            {card.primary ? (
              <span className="order-2 min-[600px]:order-3">
                <SignupButton card={card} acting={acting} onAct={onAct} />
              </span>
            ) : null}
            <span className="order-3 basis-full min-[600px]:hidden" />
            {card.dates ? <div className="tnum order-5 text-sm text-muted-foreground min-[600px]:basis-full">plays {card.dates}</div> : null}
          </div>
        ))
      ) : (
        <p className="text-sm">No upcoming events.</p>
      )}
    </HomePanel>
  );
}

/** The one control an event row offers, always outlined: choices of equal standing look equal. */
function SignupButton({ card, acting, onAct }: { card: Card; acting: string | null; onAct: (card: Card) => void }) {
  const busy = acting === card.key;
  const tint = card.primary.color === "error" ? "text-error" : card.primary.color === "success" ? "text-success" : "text-primary-text";
  const body = (
    <>
      {busy ? <Icon name="mdi-loading mdi-spin" /> : card.primary.icon ? <Icon name={card.primary.icon} /> : null}
      {card.primary.title}
    </>
  );
  if (card.primary.to)
    return (
      <Button nativeButton={false} variant="outline" size="sm" className={cn(tint)} render={<Link href={card.primary.to} />}>
        {body}
      </Button>
    );
  return (
    <Button variant="outline" size="sm" className={cn(tint)} aria-busy={busy} disabled={busy} onClick={() => onAct(card)}>
      {body}
    </Button>
  );
}
