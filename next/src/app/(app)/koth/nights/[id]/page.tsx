import type { Metadata } from "next";
import { KothNightView } from "./KothNightView";

export const metadata: Metadata = { title: "Run KOTH Night" };

export default async function KothNightPage({ params }: PageProps<"/koth/nights/[id]">) {
  const { id } = await params;
  return <KothNightView id={id} />;
}
