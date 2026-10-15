import type { Metadata } from "next";
import { CupCreateView } from "./CupCreateView";

export const metadata: Metadata = { title: "Create Cup" };

export default function CupCreatePage() {
  return <CupCreateView />;
}
