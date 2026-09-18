import type { Metadata } from "next";
import { Suspense } from "react";
import { LadderView } from "./LadderView";

export const metadata: Metadata = { title: "Ladder" };

export default function LadderPage() {
  return <Suspense><LadderView /></Suspense>;
}
