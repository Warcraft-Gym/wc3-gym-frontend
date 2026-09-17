import type { Metadata } from "next";
import { Suspense } from "react";
import { EventView } from "./EventView";

export const metadata: Metadata = { title: "Event" };

export default async function EventPage({ params }: PageProps<"/events/[id]">) {
  const { id } = await params;
  return (
    <Suspense>
      <EventView id={id} />
    </Suspense>
  );
}
