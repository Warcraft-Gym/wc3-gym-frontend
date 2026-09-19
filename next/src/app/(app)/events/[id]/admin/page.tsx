import type { Metadata } from "next";
import { EventAdminView } from "./EventAdminView";

export const metadata: Metadata = { title: "Run Event" };

export default async function EventAdminPage({ params }: PageProps<"/events/[id]/admin">) {
  const { id } = await params;
  return <EventAdminView id={id} />;
}
