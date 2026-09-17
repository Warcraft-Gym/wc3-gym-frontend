import type { Metadata } from "next";
import { SeasonReportView } from "../SeasonReportView";

export const metadata: Metadata = { title: "Season Report" };

/** The same report, on the season the path names. */
export default async function SeasonReportIdPage({ params }: PageProps<"/report/[id]">) {
  const { id } = await params;
  return <SeasonReportView seasonKey={id} />;
}
