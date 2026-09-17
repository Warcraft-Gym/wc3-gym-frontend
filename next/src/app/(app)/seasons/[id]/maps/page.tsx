import type { Metadata } from "next";
import { SeasonMapsView } from "./SeasonMapsView";

export const metadata: Metadata = { title: "Series Maps" };

export default async function SeasonMapsPage({ params }: PageProps<"/seasons/[id]/maps">) {
  const { id } = await params;
  return <SeasonMapsView id={id} />;
}
