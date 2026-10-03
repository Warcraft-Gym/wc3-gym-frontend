import type { Metadata } from "next";
import { UpcomingView } from "./UpcomingView";

export const metadata: Metadata = { title: "Upcoming Series" };

export default function UpcomingPage() {
  return <UpcomingView />;
}
