import type { Metadata } from "next";
import { AdminHomeView } from "./AdminHomeView";

export const metadata: Metadata = { title: "Admin" };

export default function AdminPage() {
  return <AdminHomeView />;
}
