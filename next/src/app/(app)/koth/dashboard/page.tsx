import type { Metadata } from "next";
import { Suspense } from "react";
import { KothDashboard } from "./KothDashboard";

export const metadata: Metadata = { title: "KOTH" };

// The view reads ?mode=clean through useSearchParams, which needs a Suspense boundary
export default function KothDashboardPage() {
  return (
    <Suspense>
      <KothDashboard />
    </Suspense>
  );
}
