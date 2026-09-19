import type { Metadata } from "next";
import { SeasonTeamAssignView } from "./SeasonTeamAssignView";

export const metadata: Metadata = { title: "Draft Players" };

export default async function SeasonTeamAssignPage({ params }: PageProps<"/seasons/[id]/assign">) {
  const { id } = await params;
  return <SeasonTeamAssignView id={id} />;
}
