import type { Metadata } from "next";
import { MapsView } from "./MapsView";

export const metadata: Metadata = { title: "Maps" };

export default function MapsPage() {
  return <MapsView />;
}
