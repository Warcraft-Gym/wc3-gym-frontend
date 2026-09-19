import { Suspense } from "react";
import { AppShell } from "@/components/layout/AppShell";

/** The chrome every page wears: the bar, the nav, the drawer, the footer and the guard. */
export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <Suspense>
      <AppShell>{children}</AppShell>
    </Suspense>
  );
}
