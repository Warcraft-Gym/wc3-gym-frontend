"use client";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/Icon";
import { toneClass } from "@/components/ui/tone";
import { HomePanel, ROW, SkeletonRows } from "@/components/home/HomePanel";
import { closesIn } from "@/helpers/home-hub.mjs";
import { cn } from "@/lib/utils";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Card = Record<string, any>;

/** The events a member may still enter, soonest closing first. Every choice of equal standing
 *  takes the same outlined button; urgency is the order and one chip, never a louder button. */
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
        cards.map((card) => {
          const soon = closesIn(card.closesAt);
          return (
            <div key={card.key} className={ROW}>
              <div className="flex flex-wrap items-center gap-2">
                <span className="min-w-0 font-medium">{card.name}</span>
                <span className="ml-auto flex items-center gap-2">
                  {card.chip ? (
                    <Badge className={toneClass("success")}>
                      <Icon name="mdi-check" />
                      {card.chip}
                    </Badge>
                  ) : null}
                  {card.primary ? <SignupButton card={card} acting={acting} onAct={onAct} /> : null}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                {card.dates ? <span className="tnum">plays {card.dates}</span> : null}
                {soon ? (
                  <Badge variant="outline" className="border-warning text-warning">
                    <Icon name="mdi-alert-outline" />
                    {soon}
                  </Badge>
                ) : null}
              </div>
            </div>
          );
        })
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
