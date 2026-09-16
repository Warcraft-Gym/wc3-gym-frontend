import type { Metadata } from "next";
import { RandomStatsView } from "./RandomStatsView";

export const metadata: Metadata = { title: "Random Stats" };

export default function RandomStatsPage() {
  return <RandomStatsView />;
}
