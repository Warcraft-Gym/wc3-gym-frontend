import type { Metadata } from "next";
import { SeriesView } from "./SeriesView";

export const metadata: Metadata = { title: "Series" };

export default async function SeriesPage({ params }: PageProps<"/series/[id]">) {
  const { id } = await params;
  return <SeriesView id={id} />;
}
