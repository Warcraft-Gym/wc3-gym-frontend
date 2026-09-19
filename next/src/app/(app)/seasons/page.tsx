import type { Metadata } from "next";
import { SeasonsView } from "./SeasonsView";

export const metadata: Metadata = { title: "Seasons" };

export default function SeasonsPage() {
  return <SeasonsView />;
}
