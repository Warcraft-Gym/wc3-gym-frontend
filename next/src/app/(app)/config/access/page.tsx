import type { Metadata } from "next";
import { AccessView } from "./AccessView";

export const metadata: Metadata = { title: "Access" };

export default function AccessPage() {
  return <AccessView />;
}
