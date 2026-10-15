import type { Metadata } from "next";
import { Suspense } from "react";
import { RecurringCupView } from "./RecurringCupView";

export const metadata: Metadata = { title: "Recurring cup" };

export default async function RecurringCupPage({ params }: PageProps<"/events/recurring/[id]">) {
  const { id } = await params;
  return (
    <Suspense>
      <RecurringCupView id={id} />
    </Suspense>
  );
}
