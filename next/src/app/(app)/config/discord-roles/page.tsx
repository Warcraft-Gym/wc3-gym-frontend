import type { Metadata } from "next";
import { DiscordRolesView } from "./DiscordRolesView";

export const metadata: Metadata = { title: "Discord roles" };

export default function DiscordRolesPage() {
  return <DiscordRolesView />;
}
