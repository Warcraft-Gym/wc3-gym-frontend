import type { Metadata } from "next";
import { FantasyTiersView } from "./FantasyTiersView";

export const metadata: Metadata = { title: "Fantasy Player Tiers" };

export default function FantasyTiersPage() {
  return <FantasyTiersView />;
}
