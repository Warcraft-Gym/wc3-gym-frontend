import type { Metadata } from "next";
import { FantasyDashboardView } from "./FantasyDashboardView";

export const metadata: Metadata = { title: "Fantasy Dashboard" };

export default function FantasyDashboardPage() {
  return <FantasyDashboardView />;
}
