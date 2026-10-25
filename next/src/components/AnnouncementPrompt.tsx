"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Icon } from "@/components/ui/Icon";
import { StatusAlert } from "@/components/StatusAlert";
import { box, useBox } from "@/stores/box";
import { useEventStore } from "@/stores";

// Each cup sign-up counts up; the prompt mounted in the shell answers the newest one
const asked = box(0);

/** Ask about the cup announcements after a cup sign-up: the question shows only while the member
 *  has not chosen and the guild offers them, so a call that finds nothing to ask shows nothing. */
export const askAboutAnnouncements = () => asked.set(asked.get() + 1);

/** The one-time question about the cup announcements, asked after a cup sign-up: subscribe, not
 *  now, or no and not again. "Not now" asks again at the next cup sign-up; the other two are
 *  stored, and Home's "Announcements" switch changes the choice at any time. */
export function AnnouncementPrompt() {
  const store = useEventStore();
  const count = useBox(asked);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!count) return;
    let live = true;
    store
      .myAnnouncements()
      .then((state: { available: boolean; ask: boolean }) => live && setOpen(state.available && state.ask))
      .catch(() => {});
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count]);

  const choose = async (subscribed: boolean) => {
    setBusy(subscribed);
    setError(null);
    try {
      await store.setMyAnnouncements(subscribed);
      setOpen(false);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(value) => !value && setOpen(false)}>
      <DialogContent size="sm" className="gap-0 p-0">
        <DialogTitle className="banner bg-banner px-4 py-3 text-primary">Cup announcements in Discord?</DialogTitle>
        <div className="flex flex-col gap-3 p-4">
          <StatusAlert modelValue={error} onClose={() => setError(null)} />
          <p>
            Subscribing gives you the announcement role on Discord. It is pinged when a new cup opens its sign-ups, an hour before a cup&apos;s check-in closes, and with each cup&apos;s top three.
          </p>
          <p className="text-sm text-muted-foreground">
            Your own series ping you either way. You can change this any time with the &quot;Announcements&quot; switch on Home.
          </p>
        </div>
        <div className="flex flex-wrap justify-end gap-2 p-4 pt-0">
          <Button variant="ghost" disabled={busy !== null} onClick={() => choose(false)}>
            {busy === false ? <Icon name="mdi-loading mdi-spin" /> : null}
            No, don&apos;t ask again
          </Button>
          <Button variant="outline" disabled={busy !== null} onClick={() => setOpen(false)}>
            Not now
          </Button>
          <Button disabled={busy !== null} onClick={() => choose(true)}>
            {busy === true ? <Icon name="mdi-loading mdi-spin" /> : <Icon name="mdi-bell-ring" />}
            Subscribe
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default AnnouncementPrompt;
