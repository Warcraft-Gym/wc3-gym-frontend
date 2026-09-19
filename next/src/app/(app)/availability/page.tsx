import type { Metadata } from "next";
import { AvailabilityView } from "./AvailabilityView";

export const metadata: Metadata = { title: "Availability" };

export default function AvailabilityPage() {
  return <AvailabilityView />;
}
