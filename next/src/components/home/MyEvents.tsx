"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Icon } from "@/components/ui/Icon";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toneClass } from "@/components/ui/tone";
import { CupTeamName } from "@/components/CupTeamName";
import { HomePanel, ROW, SkeletonRows } from "@/components/home/HomePanel";
import { LobbyPlacesDialog } from "@/components/LobbyPlacesDialog";
import { ReportResultDialog, type ReportResultDialogHandle } from "@/components/ReportResultDialog";
import { VetoBoard } from "@/components/VetoBoard";
import { dateRange } from "@/helpers/event-labels.mjs";
import { actOnEvent } from "@/helpers/events.mjs";
import { cupSeriesLine } from "@/helpers/home-hub.mjs";
import { backendUrl, fetchWrapper } from "@/helpers";
import { useEventStore } from "@/stores";
import { cn } from "@/lib/utils";
import { askAboutAnnouncements } from "@/components/AnnouncementPrompt";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>;

// What the member is to the event, in a word beside its name
const ROLE_CHIP: Record<string, string> = { organizer: "Organizer", team: "Playing", player: "Playing", invited: "Invited" };

/** The switch that takes or leaves the cup announcement role in the guild: every new cup, its
 *  check-in reminder, its draws and its podium ping the members who hold it. It shows only once the
 *  admins have set the announcement channel and role, and for a member of the guild. */
function AnnouncementSwitch({ onError, onMessage }: { onError: (message: string | null) => void; onMessage: (message: string) => void }) {
  const store = useEventStore();
  const [state, setState] = useState<{ available: boolean; subscribed: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    store
      .myAnnouncements()
      .then(setState)
      .catch(() => setState(null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  if (!state?.available) return null;
  const flip = async (subscribed: boolean) => {
    setBusy(true);
    onError(null);
    try {
      setState(await store.setMyAnnouncements(subscribed));
      onMessage(subscribed ? "You will get the cup announcements in Discord." : "You no longer get the cup announcements.");
    } catch (e) {
      onError((e as Error).message || "That did not go through");
    } finally {
      setBusy(false);
    }
  };
  return (
    <Label className="flex cursor-pointer items-center gap-2 font-normal text-on-banner" title="Get pinged in Discord for every new cup, its check-in, its draws and its podium">
      <Icon name={state.subscribed ? "mdi-bell-ring" : "mdi-bell-outline"} />
      Announcements
      <Switch checked={state.subscribed} disabled={busy} onCheckedChange={(value) => flip(!!value)} aria-label="Cup announcements in Discord" />
    </Label>
  );
}

/** The member's own events: the cups and lists they play in, alone or in a cup team, the cups
 *  whose team invited them, and the events they run. Each card offers what is left to do in
 *  place: the matches and lobbies to report, with the map veto first where the series has one,
 *  the check-in, and the invite to answer. The link leads into the event, or onto its run page. */
export function MyEvents({
  cards,
  loading,
  order,
  onChanged,
  onError,
  onMessage,
}: {
  cards: Row[]; // the cards myEventCards builds
  loading: boolean;
  order: number;
  onChanged: () => Promise<unknown>; // reads the events, invites and open series again
  onError: (message: string | null) => void;
  onMessage: (message: string) => void;
}) {
  const store = useEventStore();
  const reportDialog = useRef<ReportResultDialogHandle>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [vetoing, setVetoing] = useState<Row | null>(null);
  const [placing, setPlacing] = useState<Row | null>(null);
  const [placingError, setPlacingError] = useState<string | null>(null);

  const work = async (key: string, task: () => Promise<unknown>, done?: string) => {
    setBusy(key);
    onError(null);
    try {
      await task();
      await onChanged();
      if (done) onMessage(done);
    } catch (e) {
      onError((e as Error).message || "That did not go through");
    } finally {
      setBusy(null);
    }
  };

  // a cup series reads afresh on its own route, as the event page opens it
  const report = async (box: Row) => {
    try {
      const full = await fetchWrapper.get(`${backendUrl}/cup-series/${box.id}`);
      reportDialog.current?.open({ ...full, entrant1_id: box.entrant1_id ?? null, entrant2_id: box.entrant2_id ?? null });
    } catch (e) {
      onError(`The match did not load: ${(e as Error).message}`);
    }
  };

  const checkIn = async (card: Row) => {
    setBusy(`checkin-${card.id}`);
    const failed = await actOnEvent("check_in", { store, eventId: card.id, row: card.row, reload: onChanged });
    onError(failed);
    setBusy(null);
  };

  return (
    <HomePanel icon="mdi-trophy-outline" title="My Events" order={order} action={<AnnouncementSwitch onError={onError} onMessage={onMessage} />}>
      {loading ? (
        <SkeletonRows rows={2} />
      ) : cards.length ? (
        cards.map((card) => {
          const dates = card.organizer && card.start?.includes("T") ? dateRange({ starts_at: card.start }) : dateRange({ start_date: card.start, end_date: card.row?.end });
          return (
            <div key={card.id} className={cn(ROW, "flex flex-col gap-2")}>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <Link href={`/events/${card.id}`} className="min-w-0 flex-1 font-medium">
                  {card.name || "Event"}
                </Link>
                <Button nativeButton={false} variant="outline" size="sm" className="text-primary-text" render={<Link href={card.to} />}>
                  <Icon name={card.organizer ? "mdi-cog-outline" : "mdi-tournament"} />
                  {card.organizer ? (card.kind === "cup" ? "Run the cup" : "Run the event") : "Open"}
                </Button>
                <div className="flex basis-full flex-wrap items-center gap-2 text-sm text-muted-foreground">
                  <Badge variant="outline">{ROLE_CHIP[card.role]}</Badge>
                  {card.draft ? <Badge variant="outline">Draft</Badge> : null}
                  {card.format ? <Badge variant="outline">{card.format}</Badge> : null}
                  {card.checkedIn ? (
                    <Badge className={toneClass("success")}>
                      <Icon name="mdi-check" />
                      Checked in
                    </Badge>
                  ) : null}
                  {/* a player on a cup's waitlist checks in as one who is in does, so the chip says where they stand */}
                  {card.row?.waitlisted ? (
                    <Badge className={toneClass("warning")}>
                      <Icon name="mdi-account-clock" />
                      On the waitlist
                    </Badge>
                  ) : null}
                  {dates ? <span className="tnum">{dates}</span> : null}
                </div>
                {card.team ? (
                  <div className="flex basis-full items-center gap-2 text-sm">
                    <span className="text-muted-foreground">Your team</span>
                    <CupTeamName team={card.team} />
                  </div>
                ) : null}
              </div>

              {card.waiting ? (
                <p className="text-sm text-muted-foreground">
                  {card.waiting.players} of {card.waiting.size} players have accepted. The team checks in and is drawn once everyone has.
                </p>
              ) : null}

              {card.checkIn ? (
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="min-w-0 flex-1">{card.team ? "Check-in is open: check your team in." : "Check-in is open."}</span>
                  <Button size="sm" disabled={!!busy} onClick={() => checkIn(card)}>
                    {busy === `checkin-${card.id}` ? <Icon name="mdi-loading mdi-spin" /> : <Icon name="mdi-check" />}
                    {card.team ? "Check the team in" : "Check in"}
                  </Button>
                </div>
              ) : null}

              {card.invite ? (
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="min-w-0 flex-1">
                    {card.invite.captain?.name || "A captain"} invited you to {card.invite.team?.name}.
                  </span>
                  <Button variant="outline" size="sm" disabled={!!busy} onClick={() => work(`decline-${card.id}`, () => store.declineInvite(card.id, card.invite.team.id), "Invitation declined.")}>
                    Decline
                  </Button>
                  <Button size="sm" disabled={!!busy} onClick={() => work(`accept-${card.id}`, async () => {
                      await store.acceptInvite(card.id, card.invite.team.id);
                      askAboutAnnouncements();
                    }, `You joined ${card.invite.team?.name}.`)}>
                    {busy === `accept-${card.id}` ? <Icon name="mdi-loading mdi-spin" /> : <Icon name="mdi-check" />}
                    Accept
                  </Button>
                </div>
              ) : null}

              {card.series.map((one: Row) => {
                const line = cupSeriesLine(one);
                return (
                  <div key={one.series.id} className="flex flex-wrap items-center gap-2 rounded-md border border-primary/40 p-2 text-sm">
                    <Icon name="mdi-sword-cross" className="text-primary-text" />
                    <div className="min-w-0 flex-[1_1_180px]">
                      <div className="font-medium">{line.lobby ? "Your lobby is waiting for its places" : "Your match is waiting for its result"}</div>
                      <div className="text-muted-foreground">{[line.where, line.sides].filter(Boolean).join(" · ")}</div>
                    </div>
                    {line.veto ? (
                      <Button variant="outline" size="sm" onClick={() => setVetoing(one.series)}>
                        <Icon name="mdi-map-outline" />
                        Map veto
                      </Button>
                    ) : null}
                    <Button
                      size="sm"
                      onClick={() => {
                        if (!line.lobby) return report(one.series);
                        setPlacingError(null);
                        setPlacing(one.series);
                      }}
                    >
                      <Icon name="mdi-clipboard-check-outline" />
                      {line.lobby ? "Report places" : "Report result"}
                    </Button>
                  </div>
                );
              })}
            </div>
          );
        })
      ) : (
        <p className="text-sm">You are in no cup right now. Sign up for one under Upcoming events.</p>
      )}

      <ReportResultDialog ref={reportDialog} cup onSaved={(message) => onChanged().then(() => onMessage(message))} />
      {vetoing ? (
        <Dialog open onOpenChange={(open) => !open && setVetoing(null)}>
          <DialogContent size="xl" className="gap-0 p-0">
            <DialogTitle className="banner bg-banner px-4 py-3 text-primary">Map veto</DialogTitle>
            <div className="max-h-[80vh] overflow-y-auto p-4">
              <VetoBoard seriesId={vetoing.id} cup />
            </div>
          </DialogContent>
        </Dialog>
      ) : null}
      {placing ? (
        <LobbyPlacesDialog
          key={placing.id}
          lobby={placing}
          title="Report the places"
          open
          onOpenChange={(open) => !open && setPlacing(null)}
          saving={busy === "places"}
          error={placingError}
          onError={setPlacingError}
          onSave={async (places) => {
            setBusy("places");
            setPlacingError(null);
            try {
              await store.setPlaces(placing.id, places);
              setPlacing(null);
              await onChanged();
              onMessage("Places reported.");
            } catch (e) {
              setPlacingError((e as Error).message || "The places were not saved");
            } finally {
              setBusy(null);
            }
          }}
        />
      ) : null}
    </HomePanel>
  );
}
