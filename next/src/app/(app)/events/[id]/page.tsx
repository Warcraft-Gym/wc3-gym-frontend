import type { Metadata } from "next";
import { Suspense } from "react";
import { backendUrl } from "@/helpers/backend-url.js";
import { eventLabel, eventSummary } from "@/helpers/event-labels.mjs";
import { EventView } from "./EventView";

const FALLBACK = { title: "Event" } satisfies Metadata;

// A shared link previews the event's label and summary; a failed or refused read keeps the plain title
export async function generateMetadata({ params }: PageProps<"/events/[id]">): Promise<Metadata> {
  const { id } = await params;
  try {
    const response = await fetch(`${backendUrl}/events/${encodeURIComponent(id)}`, {
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(2500),
    });
    if (!response.ok) return FALLBACK;
    const event = await response.json();
    const title = eventLabel(event, null, { long: false }) || FALLBACK.title;
    const description = eventSummary(event) || undefined;
    return { title, description, openGraph: { title, description } };
  } catch {
    return FALLBACK;
  }
}

export default async function EventPage({ params }: PageProps<"/events/[id]">) {
  const { id } = await params;
  return (
    <Suspense>
      <EventView id={id} />
    </Suspense>
  );
}
