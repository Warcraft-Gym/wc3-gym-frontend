import type { Metadata } from "next";
import { FantasyLeaderboardView } from "./FantasyLeaderboardView";

export const metadata: Metadata = { title: "Fantasy Teams Leaderboard" };

export default function FantasyLeaderboardPage() {
  return <FantasyLeaderboardView />;
}
