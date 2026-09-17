import type { Metadata } from "next";
import { EventsView } from "./EventsView";

export const metadata: Metadata = { title: "Events" };

export default function EventsPage() {
  return <EventsView />;
}
