import type { Metadata } from "next";
import { CreditsView } from "./CreditsView";

export const metadata: Metadata = { title: "Credits" };

export default function CreditsPage() {
  return <CreditsView />;
}
