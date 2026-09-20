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

/** The events a member may still enter, in the order the events start. Every choice of equal
 *  standing takes the same outlined button, never a louder one. */
export function OpenSignups({
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
    <HomePanel icon="mdi-calendar-outline" title="Open signups" order={order}>
      {loading ? (
        <SkeletonRows rows={3} />
      ) : cards.length ? (
        cards.map((card) => (
          <div key={card.key} className={ROW}>
            <div className="flex flex-wrap items-center gap-2">
              <span className="min-w-0 font-medium">{card.name}</span>
              <span className="ml-auto flex items-center gap-2">
                {card.chip ? (
                  <Badge className={toneClass("success")}>
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
                {card.primary ? <SignupButton card={card} acting={acting} onAct={onAct} /> : null}
              </span>
            </div>
            {card.dates ? <div className="tnum text-sm text-muted-foreground">plays {card.dates}</div> : null}
          </div>
        ))
      ) : (
        <p className="text-sm">No signup is open. A new event shows here as soon as it takes entries.</p>
      )}
    </HomePanel>
  );
}

/** The one control a signup row offers, always outlined: choices of equal standing look equal. */
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
