import type { Metadata } from "next";
import { TeamView } from "./TeamView";

export const metadata: Metadata = { title: "Team" };

export default async function TeamPage({ params }: PageProps<"/team/[id]">) {
  const { id } = await params;
  return <TeamView id={id} />;
}
