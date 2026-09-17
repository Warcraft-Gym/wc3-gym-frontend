import type { Metadata } from "next";
import { MapsView } from "./MapsView";

export const metadata: Metadata = { title: "1v1 Maps" };

export default function MapsPage() {
  return <MapsView />;
}
