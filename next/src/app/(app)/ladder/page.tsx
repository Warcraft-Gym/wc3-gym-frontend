import type { Metadata } from "next";
import { Suspense } from "react";
import { LadderView } from "./LadderView";

export const metadata: Metadata = { title: "Gym Newbie League Ladder Grind" };

export default function LadderPage() {
  return <Suspense><LadderView /></Suspense>;
}
