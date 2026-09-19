import type { Metadata } from "next";
import { FantasyBetsView } from "./FantasyBetsView";

export const metadata: Metadata = { title: "Fantasy Bets" };

export default function FantasyBetsPage() {
  return <FantasyBetsView />;
}
