import type { Metadata } from "next";
import { PlayerView } from "./PlayerView";

export const metadata: Metadata = { title: "Player" };

export default async function PlayerPage({ params }: PageProps<"/player/[id]">) {
  const { id } = await params;
  return <PlayerView id={id} />;
}
