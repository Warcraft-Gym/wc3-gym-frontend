import type { Metadata } from "next";
import { LeagueView } from "./LeagueView";

export const metadata: Metadata = { title: "League" };

export default async function LeaguePage({ params }: PageProps<"/leagues/[id]">) {
  const { id } = await params;
  return <LeagueView id={id} />;
}
