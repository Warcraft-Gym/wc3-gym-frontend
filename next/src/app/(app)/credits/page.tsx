import type { Metadata } from "next";
import { Suspense } from "react";
import { CreditsView } from "./CreditsView";

export const metadata: Metadata = { title: "Credits" };

export default function CreditsPage() {
  return (
    <Suspense>
      <CreditsView />
    </Suspense>
  );
}
