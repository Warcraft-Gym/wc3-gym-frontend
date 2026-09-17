import type { Metadata } from "next";
import { SeasonReportView } from "./SeasonReportView";

export const metadata: Metadata = { title: "Season Report" };

export default function SeasonReportPage() {
  return <SeasonReportView />;
}
