import type { Metadata } from "next";
import { ConfigView } from "./ConfigView";

export const metadata: Metadata = { title: "Settings" };

export default function ConfigPage() {
  return <ConfigView />;
}
