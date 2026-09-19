import type { Metadata } from "next";
import { VetoBoardView } from "./VetoBoardView";

export const metadata: Metadata = { title: "Map Veto" };

export default async function VetoBoardPage({ params }: PageProps<"/player-series/[id]/veto">) {
  const { id } = await params;
  return <VetoBoardView id={id} />;
}
