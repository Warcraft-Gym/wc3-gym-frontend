import type { Metadata } from "next";
import { SeasonDetailsView } from "./SeasonDetailsView";

export const metadata: Metadata = { title: "Season" };

export default async function SeasonDetailsPage({ params }: PageProps<"/seasons/[id]">) {
  const { id } = await params;
  return <SeasonDetailsView id={id} />;
}
