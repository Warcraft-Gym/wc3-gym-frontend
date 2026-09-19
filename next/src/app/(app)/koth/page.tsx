import type { Metadata } from "next";
import { KothView } from "./KothView";

export const metadata: Metadata = { title: "KOTH Nights" };

export default function KothPage() {
  return <KothView />;
}
