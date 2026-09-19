import type { Metadata } from "next";
import { EntrantsView } from "./EntrantsView";

export const metadata: Metadata = { title: "Entrants" };

export default async function EntrantsPage({ params }: PageProps<"/events/[id]/entrants">) {
  const { id } = await params;
  return <EntrantsView id={id} />;
}
