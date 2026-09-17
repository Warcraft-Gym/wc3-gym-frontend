import type { Metadata } from "next";
import { SeasonAchievementsView } from "./SeasonAchievementsView";

export const metadata: Metadata = { title: "Season Achievements" };

export default async function SeasonAchievementsPage({ params }: PageProps<"/seasons/[id]/achievements">) {
  const { id } = await params;
  return <SeasonAchievementsView id={id} />;
}
