import type { Metadata } from "next";
import { DiscordRolesView } from "./DiscordRolesView";

export const metadata: Metadata = { title: "Discord Roles" };

export default function DiscordRolesPage() {
  return <DiscordRolesView />;
}
