import type { Metadata } from "next";
import { SeasonTeamDetailsView } from "./SeasonTeamDetailsView";

export const metadata: Metadata = { title: "Season Team" };

export default async function SeasonTeamDetailsPage({ params }: PageProps<"/team/[id]/season/[season_id]">) {
  const { id, season_id } = await params;
  return <SeasonTeamDetailsView id={id} seasonKey={season_id} />;
}
