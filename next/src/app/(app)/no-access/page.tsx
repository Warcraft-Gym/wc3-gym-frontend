import type { Metadata } from "next";
import { Suspense } from "react";
import { NoAccessView } from "./NoAccessView";

export const metadata: Metadata = { title: "No Access" };

export default function NoAccessPage() {
  return (
    <Suspense>
      <NoAccessView />
    </Suspense>
  );
}
