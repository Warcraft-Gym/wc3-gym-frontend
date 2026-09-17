import type { Metadata } from "next";
import { AdminLoginView } from "./AdminLoginView";

export const metadata: Metadata = { title: "Admin Login" };

export default function AdminLoginPage() {
  return <AdminLoginView />;
}
