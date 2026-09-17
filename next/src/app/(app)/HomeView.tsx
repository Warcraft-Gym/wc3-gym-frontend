"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Icon } from "@/components/ui/Icon";
import { Skeleton } from "@/components/ui/skeleton";
import { toneClass } from "@/components/ui/tone";
import { SignupDialog } from "@/components/SignupDialog";
import { StatusAlert } from "@/components/StatusAlert";
import { cn } from "@/lib/utils";
import { actOnEvent, homeCards, joinableEvents } from "@/helpers/events.mjs";
import { useAuth, useEventStore, usePlayerStore, useSeason, useTeamStore } from "@/stores";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Card = Record<string, any>;

// events.mjs is plain JS, so its defaults type the parameters; the seam names the real shapes.
const buildCards = homeCards as unknown as (input: { events: Card[]; me: Card | null; seasons: Card[] }) => Card[];

// An event date is a calendar day, so it reads in UTC
const day = (card: Card) => card.date?.toLocaleDateString(undefined, { day: "numeric", timeZone: card.zone }) ?? "–";
const month = (card: Card) => card.date?.toLocaleDateString(undefined, { month: "short", timeZone: card.zone }) ?? "";

// The landing popup shows once per browser session, and only when there is something to join
const POPUP_KEY = "eventsPopupSeen";

const DateTile = ({ card, className = "" }: { card: Card; className?: string }) => (
  <div className={`w-[60px] flex-none rounded border border-[rgba(var(--v-theme-on-surface),0.16)] py-1 text-center leading-[1.1] ${className}`}>
    <div className="tnum text-[1.4rem] font-bold">{day(card)}</div>
    <div className="text-[0.8rem] text-muted-foreground">{month(card)}</div>
  </div>
);

export function HomeView() {
  const teamStore = useTeamStore();
  const playerStore = usePlayerStore();
  const eventStore = useEventStore();
  const { seasons, fetchSeasons } = useSeason();
  const { me, isAdmin } = useAuth();

  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [myEvents, setMyEvents] = useState<Card[]>([]);
  const [acting, setActing] = useState<string | null>(null); // the card whose action is in flight
  const [signupEvent, setSignupEvent] = useState<Card | null>(null);
  const [popup, setPopup] = useState(false);
  const [counts, setCounts] = useState({ teams: 0, players: 0 });

  // /me/events names every published event of every kind with the caller's own state and
  // its one action; the GNL /events row adds the rounds and the round count its card reads
  const cards: Card[] = buildCards({ events: myEvents, me, seasons });
  const popupRows: Card[] = joinableEvents(cards);

  const reloadEvents = async () => {
    const rows = await eventStore.myEvents();
    setMyEvents(rows);
    return rows;
  };

  // One action word, one thing to do. The signup dialog is the home's own, because the
  // member read carries no signup policy; every other word goes through the shared act.
  const act = async (card: Card) => {
    setPopup(false);
    if (card.primary.act === "sign_up") {
      setSignupEvent(await eventStore.fetchEvent(card.id));
      return;
    }
    setActing(card.key);
    setErrorMessage(
      await actOnEvent(card.primary.act, {
        store: eventStore,
        eventId: card.id,
        row: myEvents.find((row) => row.id === card.id),
        reload: reloadEvents,
      }),
    );
    setActing(null);
  };

  // The caller answers the next round himself; the hint only said what his blocks cover
  const answerBlocked = async (card: Card) => {
    setActing(`${card.key}:hint`);
    try {
      await eventStore.answerRound(myEvents.find((row) => row.id === card.id), false);
      await reloadEvents();
    } catch (error) {
      setErrorMessage(`That did not go through: ${(error as Error).message}`);
    } finally {
      setActing(null);
    }
  };

  const openPopupOnce = (rows: Card[]) => {
    try {
      if (!joinableEvents(rows).length || sessionStorage.getItem(POPUP_KEY)) return;
      sessionStorage.setItem(POPUP_KEY, "1");
    } catch {
      return;
    }
    setPopup(true);
  };

  useEffect(() => {
    const fetchHomeData = async () => {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const [known, rows, teams, players] = await Promise.all([
          fetchSeasons(),
          eventStore.myEvents(),
          isAdmin ? teamStore.fetchTeams() : Promise.resolve([]),
          isAdmin ? playerStore.fetchPlayers() : Promise.resolve([]),
        ]);
        setMyEvents(rows);
        setCounts({ teams: teams.length, players: players.length });
        openPopupOnce(buildCards({ events: rows, me, seasons: known }));
      } catch (error) {
        console.error("Error loading the home page:", error);
        setErrorMessage((error as Error).message || "Failed to load the home page.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchHomeData();
    // one read per mount; isAdmin picks the admin counts
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  const stats: Record<string, { total: number; icon: string; route: string }> = {
    teams: { total: counts.teams, icon: "mdi-account-group", route: "/teams" },
    seasons: { total: seasons.length, icon: "mdi-trophy", route: "/seasons" },
    players: { total: counts.players, icon: "mdi-account", route: "/players" },
  };

  return (
    <>
      <StatusAlert modelValue={errorMessage} onClose={() => setErrorMessage(null)} />

      {isLoading ? (
        <div className="flex flex-col gap-4">
          {[0, 1, 2].map((row) => (
            <Skeleton key={row} className="skeleton h-24 w-full" />
          ))}
        </div>
      ) : (
        <>
          {cards.map((card) => (
            <Card key={card.key} className="card mb-4">
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <DateTile card={card} />
                  <div className="min-w-0 grow">
                    <h2>{card.name}</h2>
                    {card.status ? <div className="text-sm text-muted-foreground">{card.status}</div> : null}
                    {card.chips.length || card.hint ? (
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        {card.chips.map((chip: Card) => (
                          <Badge key={chip.title} className={toneClass(chip.color)}>
                            {chip.icon ? <Icon name={chip.icon} /> : null}
                            {chip.title}
                          </Badge>
                        ))}
                        {/* The caller's own blocks cover the next round; the answer is his, the blocks only inform */}
                        {card.hint ? (
                          <>
                            <Badge className={toneClass("info")}>
                              <Icon name="mdi-calendar-remove" />
                              {card.hint.title}
                            </Badge>
                            <Button variant="outline" size="sm" className="text-error" disabled={acting === `${card.key}:hint`} onClick={() => answerBlocked(card)}>
                              <Icon name={acting === `${card.key}:hint` ? "mdi-loading mdi-spin" : "mdi-close"} />
                              {card.hint.text}
                            </Button>
                          </>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                  {card.primary ? <PrimaryButton card={card} acting={acting} act={act} className="hidden self-center min-[960px]:inline-flex" /> : null}
                </div>
                {card.primary ? <PrimaryButton card={card} acting={acting} act={act} className="mt-3 w-full min-[960px]:hidden" /> : null}
                {card.links.length ? (
                  <div className="mt-3 flex flex-wrap gap-x-[18px] gap-y-1 border-t border-[rgba(var(--v-theme-on-surface),0.16)] pt-3">
                    {card.links.map((link: Card) => (
                      <Link key={link.to} href={link.to} className="inline-flex items-center gap-1.5 font-medium text-primary-text no-underline">
                        <Icon name={link.icon} size={16} />
                        {link.title}
                      </Link>
                    ))}
                  </div>
                ) : null}
              </CardContent>
            </Card>
          ))}
          {!cards.length ? <div className="text-muted-foreground">No events yet.</div> : null}
        </>
      )}

      {isAdmin ? (
        <>
          <h2 className="mt-10 mb-2 text-xl">Admin</h2>
          <div className="grid gap-4 md:grid-cols-3">
            {Object.entries(stats).map(([key, stat]) => (
              <Link key={key} href={stat.route} className="no-underline">
                <Card className="card flex h-full cursor-pointer flex-col transition-all duration-300 hover:-translate-y-[5px]">
                  <div className="flex items-center gap-2 bg-primary px-4 py-3 font-heading text-on-primary">
                    <Icon name={stat.icon} size="large" />
                    {key.charAt(0).toUpperCase() + key.slice(1)}
                  </div>
                  <CardContent className="pt-6 text-center">
                    {/* A count is a figure, not a heading: the body face at heading size. */}
                    <div className="tnum font-sans text-5xl font-medium text-primary">{isLoading ? "–" : stat.total}</div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </>
      ) : null}

      <Dialog open={popup} onOpenChange={setPopup}>
        <DialogContent showCloseButton={false} className="max-w-[560px] gap-0 p-0 sm:max-w-[560px]">
          <DialogTitle className="px-4 pt-4 text-xl">Upcoming events</DialogTitle>
          <ul className="flex flex-col">
            {popupRows.map((row) => (
              <li key={row.key} className="flex items-center gap-4 px-4 py-2">
                <DateTile card={row} />
                <div className="min-w-0 grow">
                  <div className="font-medium">{row.name}</div>
                  <div className="text-sm text-muted-foreground">{row.status}</div>
                </div>
                <PrimaryButton card={row} acting={acting} act={act} className="shrink-0" size="sm" />
              </li>
            ))}
          </ul>
          <div className="flex justify-end p-4">
            <Button variant="ghost" onClick={() => setPopup(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {signupEvent ? (
        <SignupDialog event={signupEvent} open onOpenChange={(open) => !open && setSignupEvent(null)} onSignedUp={() => reloadEvents()} />
      ) : null}
    </>
  );
}

/** The one thing a card offers: a link where the kind keeps its own page, else the action word. */
function PrimaryButton({ card, acting, act, className, size }: { card: Card; acting: string | null; act: (card: Card) => void; className?: string; size?: "sm" }) {
  const busy = acting === card.key;
  const variant = card.primary.variant === "outlined" ? "outline" : "default";
  const tint = card.primary.color === "error" ? "text-error" : card.primary.color === "success" ? "text-success" : "text-primary-text";
  // A filled button already carries the colour, so the tint only paints the outline variant
  const paint = cn(variant === "outline" && tint, className);
  const body = (
    <>
      {busy ? <Icon name="mdi-loading mdi-spin" /> : card.primary.icon ? <Icon name={card.primary.icon} /> : null}
      {card.primary.title}
    </>
  );
  if (card.primary.to)
    return (
      <Button nativeButton={false} variant={variant} size={size} className={paint} render={<Link href={card.primary.to} />}>
        {body}
      </Button>
    );
  return (
    <Button variant={variant} size={size} className={paint} disabled={busy} onClick={() => act(card)}>
      {body}
    </Button>
  );
}

export default HomeView;
