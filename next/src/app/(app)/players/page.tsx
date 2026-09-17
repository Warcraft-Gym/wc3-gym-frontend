import type { Metadata } from "next";
import { Suspense } from "react";
import { PlayersView } from "./PlayersView";

export const metadata: Metadata = { title: "Players" };

export default function PlayersPage() {
  return <Suspense><PlayersView /></Suspense>;
}
