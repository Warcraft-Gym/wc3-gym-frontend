import type { Metadata } from "next";
import { TeamRoundsView } from "./TeamRoundsView";

export const metadata: Metadata = { title: "Team Rounds" };

export default async function TeamRoundsPage({ params }: PageProps<"/team/[id]/season/[season_id]/rounds">) {
  const { id, season_id } = await params;
  return <TeamRoundsView id={id} seasonKey={season_id} />;
}
