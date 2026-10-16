import type { Metadata } from "next";
import { EventWizardView } from "./EventWizardView";

export const metadata: Metadata = { title: "New Sign-up List" };

export default function EventWizardPage() {
  return <EventWizardView />;
}
