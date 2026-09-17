import type { Metadata } from "next";
import { Suspense } from "react";
import { EventWizardView } from "./EventWizardView";

export const metadata: Metadata = { title: "New Event" };

export default function EventWizardPage() {
  return (
    <Suspense>
      <EventWizardView />
    </Suspense>
  );
}
