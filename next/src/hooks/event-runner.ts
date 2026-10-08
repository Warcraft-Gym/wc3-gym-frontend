"use client";
import { useEffect, useState } from "react";
import { runsEvent } from "@/helpers/events-page.mjs";
import { useAuth, useEventStore } from "@/stores";

export type EventOrganizer = { discord_id: string; name: string; added_by: string; added_at: string };

/** Who runs one event, and whether the session is one of them: an admin, or a member the
 *  event's organizer list names. `loaded` stays false until the list is read, so a page that
 *  gates on it draws nothing first. The list is an open read, so the event page names it too. */
export function useEventRunner(eventId: number | string | null | undefined) {
  const store = useEventStore();
  const { me } = useAuth();
  const [organizers, setOrganizers] = useState<EventOrganizer[]>([]);
  const [loaded, setLoaded] = useState(false);

  const reload = async () => {
    if (!eventId) return;
    try {
      setOrganizers(await store.fetchEventOrganizers(Number(eventId)));
    } catch {
      // an unread list runs nothing; an admin still runs every event
      setOrganizers([]);
    } finally {
      setLoaded(true);
    }
  };

  useEffect(() => {
    queueMicrotask(reload);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  return { organizers, loaded, runs: runsEvent(me, organizers) as boolean, reload };
}
