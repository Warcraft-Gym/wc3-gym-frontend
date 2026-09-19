import type { Metadata } from "next";
import { MatchDetailsView } from "./MatchDetailsView";

export const metadata: Metadata = { title: "Match" };

export default async function MatchDetailsPage({ params }: PageProps<"/match/[id]">) {
  const { id } = await params;
  return <MatchDetailsView id={id} />;
}
